import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action } = await req.json()

    if (action === 'sync_emails') {
      // Get Gmail integration for user
      const { data: integration } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'gmail')
        .eq('status', 'connected')
        .single()

      if (!integration) {
        return new Response(JSON.stringify({ error: 'Gmail not connected' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Fetch recent emails from Gmail API
      const gmailResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=is:unread',
        {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const gmailData = await gmailResponse.json()
      
      if (gmailData.error) {
        throw new Error(`Gmail API error: ${gmailData.error.message}`)
      }

      const syncedCount = await syncGmailMessages(supabase, user.id, integration.access_token, gmailData.messages || [])

      return new Response(JSON.stringify({ 
        success: true, 
        synced_messages: syncedCount,
        total_messages: gmailData.messages?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Gmail sync error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function syncGmailMessages(supabase: any, userId: string, accessToken: string, messages: any[]) {
  let syncedCount = 0

  for (const message of messages) {
    try {
      // Get detailed message content
      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const messageDetail = await messageResponse.json()
      
      if (messageDetail.error) {
        console.error(`Error fetching message ${message.id}:`, messageDetail.error)
        continue
      }

      // Extract email data
      const headers = messageDetail.payload?.headers || []
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject'
      const fromHeader = headers.find((h: any) => h.name === 'From')?.value || ''
      const toHeader = headers.find((h: any) => h.name === 'To')?.value || ''
      const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || ''
      
      // Extract sender info
      const fromMatch = fromHeader.match(/^(.*?)\s*<(.+?)>$/) || [null, fromHeader, fromHeader]
      const senderName = fromMatch[1]?.trim() || fromHeader
      const senderEmail = fromMatch[2]?.trim() || fromHeader

      // Get or create customer
      let customer = null
      if (senderEmail) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('email', senderEmail)
          .single()

        if (existingCustomer) {
          customer = existingCustomer
        } else {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              name: senderName || senderEmail,
              email: senderEmail
            })
            .select()
            .single()
          customer = newCustomer
        }
      }

      // Check if conversation exists
      const threadId = messageDetail.threadId
      let conversation = null
      
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('platform_thread_id', threadId)
        .eq('user_id', userId)
        .single()

      if (existingConversation) {
        conversation = existingConversation
      } else {
        // Create new conversation
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert({
            user_id: userId,
            customer_id: customer?.id,
            platform: 'gmail',
            platform_thread_id: threadId,
            subject: subject,
            status: 'open',
            is_unread: true,
            last_message_at: new Date(dateHeader || Date.now()).toISOString()
          })
          .select()
          .single()
        conversation = newConversation
      }

      // Extract message content
      let content = ''
      if (messageDetail.payload?.body?.data) {
        content = atob(messageDetail.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
      } else if (messageDetail.payload?.parts) {
        for (const part of messageDetail.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            content = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
            break
          }
        }
      }

      // Check if message already exists
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('platform_message_id', message.id)
        .single()

      if (!existingMessage) {
        // Insert message
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            platform_message_id: message.id,
            content: content.substring(0, 10000), // Limit content length
            sender_name: senderName,
            sender_email: senderEmail,
            type: 'email',
            created_at: new Date(dateHeader || Date.now()).toISOString(),
            metadata: {
              gmail_id: message.id,
              thread_id: threadId,
              to: toHeader,
              labels: messageDetail.labelIds
            }
          })

        syncedCount++
      }

    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error)
    }
  }

  return syncedCount
}