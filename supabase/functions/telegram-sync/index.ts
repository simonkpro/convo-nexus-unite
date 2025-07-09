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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action } = await req.json()

    if (action === 'sync_chats') {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
      
      if (!botToken) {
        return new Response(JSON.stringify({ error: 'Telegram bot token not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get recent updates from Telegram
      const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`)
      const updatesData = await updatesResponse.json()

      if (!updatesData.ok) {
        throw new Error('Failed to fetch Telegram updates')
      }

      const syncedCount = await syncTelegramMessages(supabase, user.id, botToken, updatesData.result || [])

      return new Response(JSON.stringify({ 
        success: true, 
        synced_messages: syncedCount,
        total_updates: updatesData.result?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Telegram sync error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function syncTelegramMessages(supabase: any, userId: string, botToken: string, updates: any[]) {
  let syncedCount = 0

  for (const update of updates) {
    try {
      const message = update.message
      if (!message) continue

      const chatId = message.chat.id.toString()
      const messageId = message.message_id.toString()
      
      // Extract sender info
      const senderName = message.from?.first_name + (message.from?.last_name ? ` ${message.from.last_name}` : '')
      const senderUsername = message.from?.username ? `@${message.from.username}` : senderName

      // Get or create customer
      let customer = null
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('name', senderUsername)
        .single()

      if (existingCustomer) {
        customer = existingCustomer
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            name: senderName || senderUsername,
            email: message.from?.username ? `${message.from.username}@telegram` : null,
            notes: `Telegram User ID: ${message.from?.id}`
          })
          .select()
          .single()
        customer = newCustomer
      }

      // Check if conversation exists
      let conversation = null
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('platform_thread_id', chatId)
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
            platform: 'telegram',
            platform_thread_id: chatId,
            subject: `Chat with ${senderName}`,
            status: 'open',
            is_unread: true,
            last_message_at: new Date(message.date * 1000).toISOString()
          })
          .select()
          .single()
        conversation = newConversation
      }

      // Check if message already exists
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('platform_message_id', messageId)
        .single()

      if (!existingMessage) {
        // Insert message
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            platform_message_id: messageId,
            content: message.text || message.caption || '[Media message]',
            sender_name: senderName,
            sender_email: senderUsername,
            type: 'chat',
            created_at: new Date(message.date * 1000).toISOString(),
            metadata: {
              telegram_chat_id: chatId,
              telegram_message_id: messageId,
              from_id: message.from?.id,
              chat_type: message.chat?.type
            }
          })

        syncedCount++
      }

    } catch (error) {
      console.error(`Error processing Telegram update:`, error)
    }
  }

  return syncedCount
}