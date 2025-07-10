import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Api, TelegramApi } from "https://deno.land/x/gramjs@v2.17.19/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Store active clients
const clients = new Map<string, TelegramApi>();

// MTProto implementation using gramjs
class TelegramMTProto {
  private apiId: number;
  private apiHash: string;
  private client: TelegramApi | null = null;
  private sessionKey: string;

  constructor(apiId: number, apiHash: string, sessionString?: string) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.sessionKey = `${apiId}_${apiHash}`;
    
    // Initialize client with session if provided
    if (sessionString) {
      this.initializeClient(sessionString);
    }
  }

  private initializeClient(sessionString?: string) {
    try {
      this.client = new TelegramApi(this.apiId, this.apiHash, {
        connectionRetries: 5,
        session: sessionString || undefined,
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
      this.initializeClient();
    }

    if (!this.client) {
      throw new Error('Failed to initialize Telegram client');
    }

    console.log('Sending code request to Telegram:', { phoneNumber, apiId: this.apiId });

    try {
      await this.client.connect();
      
      const result = await this.client.invoke(
        new Api.auth.SendCode({
          phoneNumber: phoneNumber,
          apiId: this.apiId,
          apiHash: this.apiHash,
          settings: new Api.CodeSettings({
            allowFlashcall: false,
            currentNumber: false,
            allowAppHash: true,
          }),
        })
      );

      console.log('Telegram API response:', result);
      
      return {
        phoneCodeHash: result.phoneCodeHash,
        phoneNumber: phoneNumber,
        isRegistered: result.phoneRegistered,
        nextType: result.nextType?.className || null,
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
      const result = await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phoneNumber,
          phoneCodeHash: phoneCodeHash,
          phoneCode: phoneCode,
        })
      );

      console.log('Sign in response:', result);
      
      if (result.className === 'auth.Authorization') {
        // Successfully logged in
        const session = this.client.session.save();
        return {
          success: true,
          user: result.user,
          sessionString: session,
          authKey: session, // Use session as auth key
        };
      } else if (result.className === 'auth.AuthorizationSignUpRequired') {
        throw new Error('Account registration required');
      } else {
        throw new Error('Unexpected response from Telegram');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      
      // Check if 2FA is required
      if (error.errorMessage && error.errorMessage.includes('SESSION_PASSWORD_NEEDED')) {
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
      // Get password info first
      const passwordInfo = await this.client.invoke(new Api.account.GetPassword());
      
      // Calculate password hash (simplified - in production use proper SRP)
      const passwordHash = await this.client.computeCheck(passwordInfo, password);
      
      const result = await this.client.invoke(
        new Api.auth.CheckPassword({
          password: passwordHash,
        })
      );

      if (result.className === 'auth.Authorization') {
        const session = this.client.session.save();
        return {
          success: true,
          user: result.user,
          sessionString: session,
          authKey: session,
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
      const result = await this.client.invoke(
        new Api.messages.GetDialogs({
          offsetDate: 0,
          offsetId: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          limit: limit,
          hash: 0,
        })
      );

      console.log('Dialogs response:', result);

      // Transform the response to match our expected format
      const dialogs = result.dialogs.map((dialog: any, index: number) => {
        const peer = result.chats.find((chat: any) => chat.id.toString() === dialog.peer.chatId?.toString()) ||
                    result.users.find((user: any) => user.id.toString() === dialog.peer.userId?.toString());
        
        return {
          id: dialog.peer.chatId?.toString() || dialog.peer.userId?.toString() || index.toString(),
          title: peer?.title || peer?.firstName || 'Unknown',
          type: peer?.className === 'Chat' ? 'group' : peer?.className === 'Channel' ? 'channel' : 'user',
          unreadCount: dialog.unreadCount || 0,
          lastMessage: dialog.topMessage || 'No messages',
          lastMessageDate: new Date().toISOString(),
        };
      });

      return {
        dialogs: dialogs,
        totalCount: result.count || dialogs.length,
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