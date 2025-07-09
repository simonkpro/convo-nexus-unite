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

    if (action === 'setup_bot') {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
      
      if (!botToken) {
        return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get bot info
      const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
      const botInfo = await botInfoResponse.json()

      if (!botInfo.ok) {
        throw new Error('Invalid bot token')
      }

      // Set webhook for receiving messages
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-webhook`
      const webhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'channel_post']
        })
      })

      const webhookResult = await webhookResponse.json()

      if (!webhookResult.ok) {
        throw new Error('Failed to set webhook')
      }

      // Store integration
      const { error: insertError } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          platform: 'telegram',
          access_token: botToken,
          status: 'connected',
          settings: {
            bot_username: botInfo.result.username,
            bot_name: botInfo.result.first_name,
            webhook_url: webhookUrl
          }
        }, {
          onConflict: 'user_id,platform'
        })

      if (insertError) {
        throw insertError
      }

      return new Response(JSON.stringify({ 
        success: true,
        bot_username: botInfo.result.username,
        bot_name: botInfo.result.first_name
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Telegram setup error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})