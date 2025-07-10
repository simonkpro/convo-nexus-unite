import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// MTProto implementation for Deno
class TelegramMTProto {
  private apiId: number;
  private apiHash: string;
  private baseUrl = 'https://api.telegram.org';

  constructor(apiId: number, apiHash: string) {
    this.apiId = apiId;
    this.apiHash = apiHash;
  }

  async sendCode(phoneNumber: string): Promise<any> {
    const url = `${this.baseUrl}/auth.sendCode`;
    
    const payload = {
      phone_number: phoneNumber,
      api_id: this.apiId,
      api_hash: this.apiHash,
      settings: {
        allow_flashcall: false,
        current_number: false,
        allow_app_hash: true
      }
    };

    console.log('Sending code request to Telegram:', { phoneNumber, apiId: this.apiId });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('Telegram API response:', result);
      
      if (!response.ok) {
        throw new Error(result.description || 'Failed to send code');
      }

      return result;
    } catch (error) {
      console.error('Error calling Telegram API:', error);
      throw error;
    }
  }

  async signIn(phoneNumber: string, phoneCodeHash: string, phoneCode: string): Promise<any> {
    const url = `${this.baseUrl}/auth.signIn`;
    
    const payload = {
      phone_number: phoneNumber,
      phone_code_hash: phoneCodeHash,
      phone_code: phoneCode
    };

    console.log('Signing in with Telegram:', { phoneNumber, phoneCodeHash });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('Sign in response:', result);
      
      if (!response.ok) {
        throw new Error(result.description || 'Sign in failed');
      }

      return result;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async checkPassword(passwordHash: string): Promise<any> {
    const url = `${this.baseUrl}/auth.checkPassword`;
    
    const payload = {
      password: passwordHash
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.description || '2FA verification failed');
      }

      return result;
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      throw error;
    }
  }

  async getDialogs(authKey: string, limit: number = 50): Promise<any> {
    const url = `${this.baseUrl}/messages.getDialogs`;
    
    const payload = {
      offset_date: 0,
      offset_id: 0,
      offset_peer: { _: 'inputPeerEmpty' },
      limit: limit,
      hash: 0
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authKey}`,
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.description || 'Failed to get dialogs');
      }

      return result;
    } catch (error) {
      console.error('Error getting dialogs:', error);
      throw error;
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { method, params } = await req.json();
    console.log('Received request:', { method, params: { ...params, api_hash: '***' } });

    const { api_id, api_hash } = params;
    
    if (!api_id || !api_hash) {
      throw new Error('API ID and API Hash are required');
    }

    const telegram = new TelegramMTProto(parseInt(api_id), api_hash);
    let result;

    switch (method) {
      case 'sendCode':
        const { phone_number } = params;
        if (!phone_number) {
          throw new Error('Phone number is required');
        }
        result = await telegram.sendCode(phone_number);
        break;

      case 'signIn':
        const { phone_number: phone, phone_code_hash, phone_code } = params;
        if (!phone || !phone_code_hash || !phone_code) {
          throw new Error('Phone number, code hash, and code are required');
        }
        result = await telegram.signIn(phone, phone_code_hash, phone_code);
        break;

      case 'checkPassword':
        const { password } = params;
        if (!password) {
          throw new Error('Password is required');
        }
        result = await telegram.checkPassword(password);
        break;

      case 'getDialogs':
        const { auth_key, limit } = params;
        if (!auth_key) {
          throw new Error('Auth key is required');
        }
        result = await telegram.getDialogs(auth_key, limit || 50);
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    console.log('Sending response:', { method, success: true });
    
    return new Response(
      JSON.stringify({ success: true, result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
})