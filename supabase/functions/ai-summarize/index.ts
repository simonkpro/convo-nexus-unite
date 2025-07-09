import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { action, conversation_id } = await req.json()

    if (action === 'generate_summary') {
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get conversation and messages
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation_id)
        .eq('user_id', user.id)
        .single()

      if (!conversation) {
        return new Response(JSON.stringify({ error: 'Conversation not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })

      if (!messages || messages.length === 0) {
        return new Response(JSON.stringify({ error: 'No messages found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Prepare conversation text for summarization
      const conversationText = messages
        .map(msg => `${msg.sender_name || 'Unknown'}: ${msg.content}`)
        .join('\n')

      // Generate summary using OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant that summarizes customer conversations. Please analyze the following conversation and provide:
              1. A concise summary (2-3 sentences)
              2. Key points discussed (bullet points)
              3. Action items if any (bullet points)
              4. Overall sentiment (positive, neutral, or negative)
              
              Format your response as JSON with keys: summary, key_points, action_items, sentiment`
            },
            {
              role: 'user',
              content: `Conversation:\n${conversationText}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        }),
      });

      const aiResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(aiResponse.error?.message || 'OpenAI API error');
      }

      let summaryData;
      try {
        summaryData = JSON.parse(aiResponse.choices[0].message.content);
      } catch (e) {
        // Fallback if JSON parsing fails
        const content = aiResponse.choices[0].message.content;
        summaryData = {
          summary: content,
          key_points: [],
          action_items: [],
          sentiment: 'neutral'
        };
      }

      // Store summary in database
      const { data: summary, error: summaryError } = await supabase
        .from('ai_summaries')
        .upsert({
          conversation_id: conversation_id,
          summary: summaryData.summary,
          key_points: summaryData.key_points || [],
          action_items: summaryData.action_items || [],
          sentiment: summaryData.sentiment || 'neutral'
        }, {
          onConflict: 'conversation_id'
        })
        .select()
        .single()

      if (summaryError) {
        throw summaryError
      }

      return new Response(JSON.stringify({ 
        success: true,
        summary: summary
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI summary error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});