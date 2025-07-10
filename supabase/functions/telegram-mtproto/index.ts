import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Client } from "https://esm.sh/jsr/@mtkruto/mtkruto@0.66.9"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Store active clients
const clients = new Map<string, Client>();

// MTProto implementation using MTKruto
class TelegramMTProto {
  private apiId: number;
  private apiHash: string;
  private client: Client | null = null;
  private sessionKey: string;

  constructor(apiId: number, apiHash: string, sessionString?: string) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.sessionKey = `${apiId}_${apiHash}`;
    
    // Initialize client
    this.initializeClient(sessionString);
  }

  private initializeClient(authString?: string) {
    try {
      this.client = new Client({
        apiId: this.apiId,
        apiHash: this.apiHash,
        authString: authString || undefined,
      });
      
      if (this.client) {
        clients.set(this.sessionKey, this.client);
      }
    } catch (error) {
      console.error('Error initializing Telegram client:', error);
      throw error;
    }
  }

  async sendCode(phoneNumber: string): Promise<any> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    console.log('Sending code request to Telegram:', { phoneNumber, apiId: this.apiId });

    try {
      await this.client.connect();
      
      const result = await this.client.api.auth.sendCode({
        phoneNumber: phoneNumber,
        apiId: this.apiId,
        apiHash: this.apiHash,
        settings: {
          _: "codeSettings",
          allowFlashcall: false,
          currentNumber: false,
          allowAppHash: true,
        },
      });

      console.log('Telegram API response:', result);
      
      return {
        phoneCodeHash: result.phoneCodeHash,
        phoneNumber: phoneNumber,
        isRegistered: result.phoneRegistered,
        nextType: result.nextType?._,
        timeout: result.timeout || 60,
      };
    } catch (error) {
      console.error('Error calling Telegram API:', error);
      throw error;
    }
  }

  async signIn(phoneNumber: string, phoneCodeHash: string, phoneCode: string): Promise<any> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    console.log('Signing in with Telegram:', { phoneNumber, phoneCodeHash });

    try {
      const result = await this.client.api.auth.signIn({
        phoneNumber: phoneNumber,
        phoneCodeHash: phoneCodeHash,
        phoneCode: phoneCode,
      });

      console.log('Sign in response:', result);
      
      if (result._ === 'auth.authorization') {
        // Successfully logged in
        const authString = await this.client.exportAuthString();
        return {
          success: true,
          user: result.user,
          sessionString: authString,
          authKey: authString,
        };
      } else if (result._ === 'auth.authorizationSignUpRequired') {
        throw new Error('Account registration required');
      } else {
        throw new Error('Unexpected response from Telegram');
      }
    } catch (error: any) {
      console.error('Error signing in:', error);
      
      // Check if 2FA is required
      if (error.message && error.message.includes('SESSION_PASSWORD_NEEDED')) {
        return {
          requires2FA: true,
          hint: error.hint || 'Enter your 2FA password',
        };
      }
      
      throw error;
    }
  }

  async checkPassword(password: string): Promise<any> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Use MTKruto's built-in 2FA password verification
      const result = await this.client.api.auth.checkPassword({
        password: await this.client.checkPassword(password)
      });

      if (result._ === 'auth.authorization') {
        const authString = await this.client.exportAuthString();
        return {
          success: true,
          user: result.user,
          sessionString: authString,
          authKey: authString,
        };
      } else {
        throw new Error('2FA verification failed');
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      throw error;
    }
  }

  async getDialogs(limit: number = 50): Promise<any> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const result = await this.client.getDialogs({
        limit: limit,
      });

      console.log('Dialogs response:', result);

      // Transform the response to match our expected format
      const dialogs = result.map((dialog: any) => {
        return {
          id: dialog.id,
          title: dialog.title,
          type: dialog.isChannel ? 'channel' : dialog.isGroup ? 'group' : 'user',
          unreadCount: dialog.unreadCount || 0,
          lastMessage: dialog.lastMessage?.text || 'No messages',
          lastMessageDate: dialog.lastMessage?.date ? new Date(dialog.lastMessage.date * 1000).toISOString() : new Date().toISOString(),
        };
      });

      return {
        dialogs: dialogs,
        totalCount: dialogs.length,
      };
    } catch (error) {
      console.error('Error getting dialogs:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      clients.delete(this.sessionKey);
      this.client = null;
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
        const { limit, session_string } = params;
        if (session_string) {
          // Reinitialize with session
          const sessionTelegram = new TelegramMTProto(parseInt(api_id), api_hash, session_string);
          result = await sessionTelegram.getDialogs(limit || 50);
        } else {
          result = await telegram.getDialogs(limit || 50);
        }
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