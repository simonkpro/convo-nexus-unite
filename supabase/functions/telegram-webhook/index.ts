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

    const update = await req.json()
    console.log('Received Telegram webhook:', update)

    // Process the webhook update
    if (update.message) {
      const message = update.message
      const chatId = message.chat.id.toString()
      
      // Find the user who owns this bot/integration
      const { data: integration } = await supabase
        .from('integrations')
        .select('*')
        .eq('platform', 'telegram')
        .eq('status', 'connected')
        .single()

      if (!integration) {
        console.log('No telegram integration found')
        return new Response('OK', { status: 200 })
      }

      const userId = integration.user_id
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

      // Get or create conversation
      let conversation = null
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('platform_thread_id', chatId)
        .eq('user_id', userId)
        .single()

      if (existingConversation) {
        conversation = existingConversation
        // Update last message time
        await supabase
          .from('conversations')
          .update({ 
            last_message_at: new Date(message.date * 1000).toISOString(),
            is_unread: true 
          })
          .eq('id', conversation.id)
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
      }
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Telegram webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})