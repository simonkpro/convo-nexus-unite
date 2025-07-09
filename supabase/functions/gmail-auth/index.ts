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

    const { action, code } = await req.json()

    if (action === 'get_auth_url') {
      const clientId = Deno.env.get('GMAIL_CLIENT_ID')
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-auth`
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=https://www.googleapis.com/auth/gmail.readonly&` +
        `access_type=offline&` +
        `prompt=consent`

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'exchange_code') {
      const clientId = Deno.env.get('GMAIL_CLIENT_ID')
      const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET')
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-auth`

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      })

      const tokens = await tokenResponse.json()

      if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error)
      }

      // Get user profile
      const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/profile', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` }
      })
      const profile = await profileResponse.json()

      // Store integration
      const { error: insertError } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          platform: 'gmail',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          status: 'connected',
          settings: {
            email: profile.emailAddress,
            total_messages: profile.messagesTotal
          }
        }, {
          onConflict: 'user_id,platform'
        })

      if (insertError) {
        throw insertError
      }

      return new Response(JSON.stringify({ 
        success: true, 
        email: profile.emailAddress 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Gmail auth error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})