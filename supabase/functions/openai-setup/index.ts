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

    if (action === 'test_connection') {
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Test the API key with a simple request
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!testResponse.ok) {
        const error = await testResponse.json()
        throw new Error(error.error?.message || 'Invalid API key')
      }

      const models = await testResponse.json()
      const gptModels = models.data.filter((model: any) => 
        model.id.includes('gpt-4') || model.id.includes('gpt-3.5')
      )

      // Store integration
      const { error: insertError } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          platform: 'openai',
          access_token: apiKey,
          status: 'connected',
          settings: {
            available_models: gptModels.map((model: any) => model.id),
            default_model: 'gpt-4o-mini'
          }
        }, {
          onConflict: 'user_id,platform'
        })

      if (insertError) {
        throw insertError
      }

      return new Response(JSON.stringify({ 
        success: true,
        available_models: gptModels.length,
        default_model: 'gpt-4o-mini'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('OpenAI setup error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})