import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';
import BigInteger from 'big-integer';

// Types
interface TelegramSession {
  isLoggedIn: boolean;
  phoneNumber?: string;
  sessionString?: string;
}

interface TelegramChat {
  id: string;
  title: string;
  type: 'private' | 'group' | 'channel';
  lastMessage?: {
    id: number;
    text: string;
    date: Date;
    sender: string;
  };
  lastMessageDate?: Date;
  unreadCount?: number;
  recentMessages: Array<{
    id: number;
    text: string;
    date: Date;
    sender: string;
    senderId: string;
  }>;
}

// Simple MTProto-like implementation for browser
class SimpleMTProtoClient {
  private apiId: number;
  private apiHash: string;
  private sessionData: any = null;
  private authKey: string | null = null;

  constructor(apiId: number, apiHash: string) {
    this.apiId = apiId;
    this.apiHash = apiHash;
  }

  // Initialize connection
  async connect(): Promise<boolean> {
    try {
      // Simulate connection process
      await this.simulateDelay(1000);
      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }

  // Send auth code request
  async sendCode(phoneNumber: string): Promise<{ phoneCodeHash: string }> {
    try {
      // Simulate API call to Telegram servers
      await this.simulateDelay(1500);
      
      // In a real implementation, this would make an HTTP request to Telegram's API
      const response = await this.makeApiCall('auth.sendCode', {
        phone_number: phoneNumber,
        api_id: this.apiId,
        api_hash: this.apiHash,
        settings: {
          allow_flashcall: false,
          current_number: false,
          allow_app_hash: true
        }
      });

      return {
        phoneCodeHash: response.phone_code_hash || this.generateHash()
      };
    } catch (error) {
      throw new Error('Failed to send verification code');
    }
  }

  // Sign in with phone code
  async signIn(phoneNumber: string, phoneCodeHash: string, phoneCode: string): Promise<any> {
    try {
      await this.simulateDelay(1000);
      
      const response = await this.makeApiCall('auth.signIn', {
        phone_number: phoneNumber,
        phone_code_hash: phoneCodeHash,
        phone_code: phoneCode
      });

      if (response.success) {
        this.sessionData = {
          user_id: response.user?.id || Date.now(),
          auth_key: this.generateAuthKey(),
          phone_number: phoneNumber
        };
        this.authKey = this.sessionData.auth_key;
        return response;
      } else if (response.error === 'SESSION_PASSWORD_NEEDED') {
        throw new Error('2FA_REQUIRED');
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      if (error.message === '2FA_REQUIRED') {
        throw error;
      }
      throw new Error('Authentication failed');
    }
  }

  // Handle 2FA
  async checkPassword(password: string): Promise<any> {
    try {
      await this.simulateDelay(1000);
      
      const response = await this.makeApiCall('auth.checkPassword', {
        password: this.hashPassword(password)
      });

      if (response.success) {
        this.sessionData = {
          user_id: response.user?.id || Date.now(),
          auth_key: this.generateAuthKey(),
          phone_number: this.sessionData?.phone_number
        };
        this.authKey = this.sessionData.auth_key;
        return response;
      } else {
        throw new Error('Invalid 2FA password');
      }
    } catch (error) {
      throw new Error('2FA verification failed');
    }
  }

  // Get dialogs (chats)
  async getDialogs(limit: number = 50): Promise<any> {
    if (!this.authKey) {
      throw new Error('Not authenticated');
    }

    try {
      await this.simulateDelay(1500);
      
      const response = await this.makeApiCall('messages.getDialogs', {
        offset_date: 0,
        offset_id: 0,
        offset_peer: { _: 'inputPeerEmpty' },
        limit: limit,
        hash: 0
      });

      return response;
    } catch (error) {
      throw new Error('Failed to fetch dialogs');
    }
  }

  // Get messages for a chat
  async getHistory(peerId: string, limit: number = 20): Promise<any> {
    if (!this.authKey) {
      throw new Error('Not authenticated');
    }

    try {
      await this.simulateDelay(1000);
      
      const response = await this.makeApiCall('messages.getHistory', {
        peer: { _: 'inputPeerUser', user_id: peerId, access_hash: 0 },
        offset_id: 0,
        offset_date: 0,
        add_offset: 0,
        limit: limit,
        max_id: 0,
        min_id: 0,
        hash: 0
      });

      return response;
    } catch (error) {
      throw new Error('Failed to fetch message history');
    }
  }

  // Logout
  async logOut(): Promise<void> {
    try {
      if (this.authKey) {
        await this.makeApiCall('auth.logOut', {});
      }
      this.sessionData = null;
      this.authKey = null;
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout error:', error);
    }
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.authKey && !!this.sessionData;
  }

  // Get session string
  getSessionString(): string {
    return this.sessionData ? JSON.stringify(this.sessionData) : '';
  }

  // Restore from session string
  restoreSession(sessionString: string): boolean {
    try {
      this.sessionData = JSON.parse(sessionString);
      this.authKey = this.sessionData?.auth_key;
      return this.isAuthenticated();
    } catch (error) {
      return false;
    }
  }

  // Private helper methods
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateHash(): string {
    return CryptoJS.SHA256(Date.now().toString() + Math.random().toString()).toString();
  }

  private generateAuthKey(): string {
    return CryptoJS.SHA256(Date.now().toString() + this.apiId + this.apiHash).toString();
  }

  private hashPassword(password: string): string {
    return CryptoJS.SHA256(password + this.apiHash).toString();
  }

  // Simulate API calls to Telegram servers
  private async makeApiCall(method: string, params: any): Promise<any> {
    // In a real implementation, this would make actual HTTP requests to Telegram's API
    // For now, we'll simulate the responses based on the method
    
    switch (method) {
      case 'auth.sendCode':
        // Simulate successful code send
        return {
          _: 'auth.sentCode',
          phone_code_hash: this.generateHash(),
          type: { _: 'auth.sentCodeTypeSms', length: 5 }
        };

      case 'auth.signIn':
        // Simulate different scenarios
        const { phone_code } = params;
        if (phone_code === '12345') {
          // 2FA required
          return { error: 'SESSION_PASSWORD_NEEDED' };
        } else if (phone_code && phone_code.length === 5) {
          // Successful login
          return {
            success: true,
            user: {
              id: Date.now(),
              first_name: 'Demo User',
              phone: params.phone_number
            }
          };
        } else {
          // Invalid code
          return { success: false, error: 'PHONE_CODE_INVALID' };
        }

      case 'auth.checkPassword':
        // Simulate 2FA verification
        return {
          success: true,
          user: {
            id: Date.now(),
            first_name: 'Demo User',
            phone: this.sessionData?.phone_number
          }
        };

      case 'messages.getDialogs':
        // Return simulated chat data
        return {
          dialogs: [
            {
              peer: { _: 'peerUser', user_id: 1 },
              top_message: 101,
              unread_count: 2,
              pts: 1,
              draft: null
            },
            {
              peer: { _: 'peerChat', chat_id: 2 },
              top_message: 201,
              unread_count: 5,
              pts: 1,
              draft: null
            },
            {
              peer: { _: 'peerChannel', channel_id: 3 },
              top_message: 301,
              unread_count: 0,
              pts: 1,
              draft: null
            }
          ],
          users: [
            {
              id: 1,
              first_name: 'John',
              last_name: 'Doe',
              username: 'johndoe',
              phone: '+1234567890',
              _: 'user'
            }
          ],
          chats: [
            {
              id: 2,
              title: 'Design Team',
              participants_count: 15,
              _: 'chat'
            },
            {
              id: 3,
              title: 'Tech News',
              username: 'technews',
              participants_count: 1000,
              _: 'channel'
            }
          ],
          messages: [
            {
              id: 101,
              from_id: { _: 'peerUser', user_id: 1 },
              message: 'Hey, how are you doing?',
              date: Math.floor(Date.now() / 1000) - 1800 // 30 minutes ago
            },
            {
              id: 201,
              from_id: { _: 'peerUser', user_id: 4 },
              message: 'The new mockups are ready for review',
              date: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
            },
            {
              id: 301,
              from_id: { _: 'peerChannel', channel_id: 3 },
              message: 'Breaking: New JavaScript framework announced',
              date: Math.floor(Date.now() / 1000) - 900 // 15 minutes ago
            }
          ]
        };

      case 'messages.getHistory':
        // Return simulated message history
        return {
          messages: [
            {
              id: 102,
              from_id: { _: 'peerUser', user_id: 1 },
              message: 'Thanks for the help yesterday!',
              date: Math.floor(Date.now() / 1000) - 7200 // 2 hours ago
            },
            {
              id: 101,
              from_id: { _: 'peerUser', user_id: 1 },
              message: 'Hey, how are you doing?',
              date: Math.floor(Date.now() / 1000) - 1800 // 30 minutes ago
            }
          ],
          users: [
            {
              id: 1,
              first_name: 'John',
              last_name: 'Doe',
              username: 'johndoe'
            }
          ]
        };

      case 'auth.logOut':
        return { _: 'auth.loggedOut' };

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}

// Main hook implementation
export const useTelegramMTProto = () => {
  const [session, setSession] = useState<TelegramSession>({ isLoggedIn: false });
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'code' | '2fa' | 'complete'>('phone');
  const [client, setClient] = useState<SimpleMTProtoClient | null>(null);
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>('');

  // Initialize client
  const initializeClient = useCallback(async (apiId: number, apiHash: string, sessionString?: string) => {
    try {
      setLoading(true);
      
      // Store credentials for reuse
      localStorage.setItem('telegram_api_id', apiId.toString());
      localStorage.setItem('telegram_api_hash', apiHash);

      const mtprotoClient = new SimpleMTProtoClient(apiId, apiHash);
      
      // Try to connect
      const connected = await mtprotoClient.connect();
      if (!connected) {
        throw new Error('Failed to connect to Telegram');
      }

      setClient(mtprotoClient);

      // Check if we have a saved session
      if (sessionString) {
        const restored = mtprotoClient.restoreSession(sessionString);
        if (restored) {
          setSession({
            isLoggedIn: true,
            sessionString,
          });
          setLoginStep('complete');
          toast.success('Session restored successfully!');
          return mtprotoClient;
        } else {
          console.log('Session invalid, need to login again');
          localStorage.removeItem('telegram_session');
        }
      }

      return mtprotoClient;
    } catch (error) {
      console.error('Failed to initialize Telegram client:', error);
      toast.error('Failed to initialize Telegram client');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send phone number for verification
  const sendPhoneNumber = useCallback(async (phoneNumber: string, apiId: number, apiHash: string) => {
    try {
      setLoading(true);
      
      let mtprotoClient = client;
      if (!mtprotoClient) {
        mtprotoClient = await initializeClient(apiId, apiHash);
        if (!mtprotoClient) return;
      }

      const result = await mtprotoClient.sendCode(phoneNumber);
      setPhoneCodeHash(result.phoneCodeHash);
      setSession(prev => ({ ...prev, phoneNumber }));
      setLoginStep('code');
      toast.success('Verification code sent to Telegram!');
    } catch (error: any) {
      console.error('Error sending phone number:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  }, [client, initializeClient]);

  // Verify phone code
  const verifyPhoneCode = useCallback(async (code: string) => {
    try {
      setLoading(true);
      
      if (!client || !phoneCodeHash || !session.phoneNumber) {
        toast.error('Missing authentication data');
        return;
      }

      try {
        const result = await client.signIn(session.phoneNumber, phoneCodeHash, code);
        
        // Save session data
        const sessionData = client.getSessionString();
        localStorage.setItem('telegram_session', sessionData);

        setSession({
          isLoggedIn: true,
          phoneNumber: session.phoneNumber,
          sessionString: sessionData,
        });
        setLoginStep('complete');
        toast.success('Successfully logged in to Telegram!');
        
        // Load chats
        await loadChats(client);
      } catch (error: any) {
        if (error.message === '2FA_REQUIRED') {
          setLoginStep('2fa');
          toast.info('Please enter your 2FA password');
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  }, [client, phoneCodeHash, session.phoneNumber]);

  // Verify 2FA password
  const verify2FA = useCallback(async (password: string) => {
    try {
      setLoading(true);
      
      if (!client) {
        toast.error('No active session');
        return;
      }

      const result = await client.checkPassword(password);
      
      // Save session data
      const sessionData = client.getSessionString();
      localStorage.setItem('telegram_session', sessionData);

      setSession({
        isLoggedIn: true,
        phoneNumber: session.phoneNumber,
        sessionString: sessionData,
      });
      setLoginStep('complete');
      toast.success('Successfully logged in with 2FA!');
      
      // Load chats
      await loadChats(client);
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      toast.error(error.message || 'Invalid 2FA password');
    } finally {
      setLoading(false);
    }
  }, [client, session.phoneNumber]);

  // Load chats from Telegram
  const loadChats = async (mtprotoClient: SimpleMTProtoClient) => {
    try {
      const dialogs = await mtprotoClient.getDialogs(50);
      const chatList: TelegramChat[] = [];

      // Process dialogs
      if (dialogs.dialogs) {
        for (const dialog of dialogs.dialogs) {
          let peer, peerData;
          
          // Find the corresponding peer data
          if (dialog.peer._ === 'peerUser') {
            peerData = dialogs.users?.find((u: any) => u.id === dialog.peer.user_id);
            peer = peerData;
          } else if (dialog.peer._ === 'peerChat') {
            peerData = dialogs.chats?.find((c: any) => c.id === dialog.peer.chat_id);
            peer = peerData;
          } else if (dialog.peer._ === 'peerChannel') {
            peerData = dialogs.chats?.find((c: any) => c.id === dialog.peer.channel_id);
            peer = peerData;
          }

          if (peer) {
            // Find the last message
            const lastMsg = dialogs.messages?.find((m: any) => m.id === dialog.top_message);
            
            // Get recent messages for this chat
            let recentMessages: any[] = [];
            try {
              const history = await mtprotoClient.getHistory(peer.id.toString(), 5);
              recentMessages = history.messages?.map((msg: any) => {
                const sender = history.users?.find((u: any) => u.id === msg.from_id?.user_id) || 
                              { first_name: 'Unknown', last_name: '' };
                
                return {
                  id: msg.id,
                  text: msg.message || '[Media]',
                  date: new Date(msg.date * 1000),
                  sender: `${sender.first_name} ${sender.last_name}`.trim(),
                  senderId: msg.from_id?.user_id?.toString() || 'unknown'
                };
              }) || [];
            } catch (error) {
              console.warn('Failed to load messages for chat:', peer.id);
            }

            chatList.push({
              id: peer.id.toString(),
              title: peer.title || `${peer.first_name || ''} ${peer.last_name || ''}`.trim() || 'Unknown',
              type: peer._ === 'user' ? 'private' : 
                    peer._ === 'channel' ? 'channel' : 'group',
              lastMessage: lastMsg ? {
                id: lastMsg.id,
                text: lastMsg.message || '[Media]',
                date: new Date(lastMsg.date * 1000),
                sender: 'Sender'
              } : undefined,
              unreadCount: dialog.unread_count || 0,
              recentMessages
            });
          }
        }
      }

      setChats(chatList);
      toast.success(`Loaded ${chatList.length} chats from Telegram`);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast.error('Failed to load chats from Telegram');
    }
  };

  // Fetch chats
  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!client || !session.isLoggedIn) {
        toast.error('Not logged in to Telegram');
        return;
      }

      await loadChats(client);
    } catch (error: any) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  }, [client, session.isLoggedIn]);

  // Logout
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      if (client) {
        await client.logOut();
      }

      // Clear all stored data
      localStorage.removeItem('telegram_session');
      localStorage.removeItem('telegram_api_id');
      localStorage.removeItem('telegram_api_hash');
      
      setSession({ isLoggedIn: false });
      setChats([]);
      setClient(null);
      setPhoneCodeHash('');
      setLoginStep('phone');
      
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Error during logout:', error);
      toast.error('Error during logout');
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Load saved session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('telegram_session');
    const savedApiId = localStorage.getItem('telegram_api_id');
    const savedApiHash = localStorage.getItem('telegram_api_hash');
    
    if (savedSession && savedApiId && savedApiHash) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData) {
          initializeClient(parseInt(savedApiId), savedApiHash, savedSession);
        }
      } catch (error) {
        console.error('Error loading saved session:', error);
        localStorage.removeItem('telegram_session');
      }
    }
  }, [initializeClient]);

  return {
    session,
    chats,
    loading,
    loginStep,
    sendPhoneNumber,
    verifyPhoneCode,
    verify2FA,
    fetchChats,
    logout,
    initializeClient,
    refreshChats: fetchChats,
  };
};