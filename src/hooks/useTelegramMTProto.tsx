import { useState, useEffect, useCallback } from 'react';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { toast } from 'sonner';

interface TelegramSession {
  isConnected: boolean;
  isLoggedIn: boolean;
  phoneNumber: string | null;
  sessionString: string | null;
}

interface TelegramChat {
  id: string;
  title: string;
  type: 'private' | 'group' | 'channel';
  unreadCount: number;
  lastMessage?: {
    id: number;
    text: string;
    date: Date;
    sender: string;
  };
  recentMessages: Array<{
    id: number;
    text: string;
    date: Date;
    sender: string;
    senderId: string;
  }>;
}

export const useTelegramMTProto = () => {
  const [client, setClient] = useState<TelegramClient | null>(null);
  const [session, setSession] = useState<TelegramSession>({
    isConnected: false,
    isLoggedIn: false,
    phoneNumber: null,
    sessionString: null
  });
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'code' | '2fa' | 'complete'>('phone');
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>('');

  // Initialize client with existing session
  const initializeClient = useCallback(async (apiId: number, apiHash: string, sessionString?: string) => {
    try {
      setLoading(true);
      const stringSession = new StringSession(sessionString || '');
      const telegramClient = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });

      await telegramClient.connect();
      
      // Check if already authorized
      if (await telegramClient.checkAuthorization()) {
        let sessionStr = '';
        try {
          const sessionData: any = telegramClient.session.save();
          sessionStr = sessionData || '';
        } catch (e) {
          console.warn('Could not save session:', e);
        }
        
        setClient(telegramClient);
        setSession(prev => ({ 
          ...prev, 
          isConnected: true,
          isLoggedIn: true,
          sessionString: sessionStr
        }));
        if (sessionStr) {
          localStorage.setItem('telegram_session', sessionStr);
        }
        await fetchChatsWithClient(telegramClient);
        setLoginStep('complete');
        return telegramClient;
      } else {
        setClient(telegramClient);
        setSession(prev => ({ ...prev, isConnected: true }));
        return telegramClient;
      }
    } catch (error) {
      console.error('Failed to initialize Telegram client:', error);
      toast.error('Failed to connect to Telegram');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send phone number for login
  const sendPhoneNumber = async (phoneNumber: string, apiId: number, apiHash: string) => {
    try {
      setLoading(true);
      let telegramClient = client;
      
      if (!telegramClient) {
        const stringSession = new StringSession('');
        telegramClient = new TelegramClient(stringSession, apiId, apiHash, {
          connectionRetries: 5,
        });
        await telegramClient.connect();
        setClient(telegramClient);
      }
      
      const result = await telegramClient.invoke(
        new Api.auth.SendCode({
          phoneNumber: phoneNumber,
          apiId: apiId,
          apiHash: apiHash,
          settings: new Api.CodeSettings({
            allowFlashcall: true,
            currentNumber: true,
            allowAppHash: true,
          }),
        })
      );

      // Handle different result types
      if (result instanceof Api.auth.SentCode) {
        setPhoneCodeHash(result.phoneCodeHash);
      }
      
      setSession(prev => ({ ...prev, phoneNumber }));
      setLoginStep('code');
      toast.success('Verification code sent to your Telegram app');
    } catch (error) {
      console.error('Error sending phone number:', error);
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Verify phone code
  const verifyPhoneCode = async (code: string) => {
    if (!client || !session.phoneNumber) return;

    try {
      setLoading(true);
      const result = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: session.phoneNumber,
          phoneCodeHash: phoneCodeHash,
          phoneCode: code,
        })
      );

      if (result instanceof Api.auth.Authorization) {
        let sessionString = '';
        try {
          const sessionData: any = client.session.save();
          sessionString = sessionData || '';
        } catch (e) {
          console.warn('Could not save session:', e);
        }
        
        if (sessionString) {
          localStorage.setItem('telegram_session', sessionString);
        }
        setSession(prev => ({ 
          ...prev, 
          isLoggedIn: true, 
          isConnected: true,
          sessionString 
        }));
        setLoginStep('complete');
        toast.success('Successfully logged in to Telegram!');
        await fetchChatsWithClient(client);
      }
    } catch (error: any) {
      if (error.message?.includes('SESSION_PASSWORD_NEEDED') || error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        setLoginStep('2fa');
        toast.info('2FA password required');
      } else {
        console.error('Error verifying code:', error);
        toast.error('Invalid verification code');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify 2FA password
  const verify2FA = async (password: string) => {
    if (!client) return;

    try {
      setLoading(true);
      // Get password information first
      const passwordInfo = await client.invoke(new Api.account.GetPassword());
      const { computeCheck } = await import('telegram/Password');
      const passwordSRP = await computeCheck(passwordInfo, password);
      
      const result = await client.invoke(
        new Api.auth.CheckPassword({
          password: passwordSRP,
        })
      );

      if (result instanceof Api.auth.Authorization) {
        let sessionString = '';
        try {
          const sessionData: any = client.session.save();
          sessionString = sessionData || '';
        } catch (e) {
          console.warn('Could not save session:', e);
        }
        
        if (sessionString) {
          localStorage.setItem('telegram_session', sessionString);
        }
        setSession(prev => ({ 
          ...prev, 
          isLoggedIn: true, 
          isConnected: true,
          sessionString 
        }));
        setLoginStep('complete');
        toast.success('Successfully logged in to Telegram!');
        await fetchChatsWithClient(client);
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      toast.error('Invalid 2FA password');
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch chats with a specific client
  const fetchChatsWithClient = async (telegramClient: TelegramClient) => {
    try {
      const dialogs = await telegramClient.getDialogs({ limit: 50 });
      
      const chatList: TelegramChat[] = await Promise.all(
        dialogs.map(async (dialog) => {
          try {
            // Get recent messages for this chat
            const messages = await telegramClient.getMessages(dialog.entity, { limit: 5 });
            
            const recentMessages = messages.map(msg => {
              let senderName = 'Unknown';
              if (msg.sender) {
                if ('firstName' in msg.sender) {
                  senderName = msg.sender.firstName || 'Unknown';
                } else if ('title' in msg.sender) {
                  senderName = msg.sender.title || 'Unknown';
                }
              }
              
              return {
                id: msg.id,
                text: msg.text || '[Media]',
                date: new Date(msg.date * 1000),
                sender: senderName,
                senderId: msg.senderId?.toString() || 'unknown'
              };
            });

            return {
              id: dialog.entity.id.toString(),
              title: dialog.title || dialog.name || 'Unknown',
              type: dialog.isGroup ? 'group' : dialog.isChannel ? 'channel' : 'private',
              unreadCount: dialog.unreadCount || 0,
              lastMessage: recentMessages[0] ? {
                id: recentMessages[0].id,
                text: recentMessages[0].text,
                date: recentMessages[0].date,
                sender: recentMessages[0].sender
              } : undefined,
              recentMessages
            };
          } catch (error) {
            console.error('Error fetching messages for dialog:', error);
            return {
              id: dialog.entity.id.toString(),
              title: dialog.title || dialog.name || 'Unknown',
              type: dialog.isGroup ? 'group' : dialog.isChannel ? 'channel' : 'private',
              unreadCount: dialog.unreadCount || 0,
              recentMessages: []
            };
          }
        })
      );

      setChats(chatList);
      toast.success(`Loaded ${chatList.length} chats`);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to fetch chats');
    }
  };

  // Fetch user's chats and recent messages
  const fetchChats = async () => {
    if (!client || !session.isLoggedIn) return;
    setLoading(true);
    try {
      await fetchChatsWithClient(client);
    } finally {
      setLoading(false);
    }
  };

  // Logout and clear session
  const logout = async () => {
    try {
      if (client) {
        await client.invoke(new Api.auth.LogOut());
        await client.disconnect();
      }
      
      localStorage.removeItem('telegram_session');
      setClient(null);
      setSession({
        isConnected: false,
        isLoggedIn: false,
        phoneNumber: null,
        sessionString: null
      });
      setChats([]);
      setLoginStep('phone');
      setPhoneCodeHash('');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Error during logout');
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('telegram_session');
    if (savedSession) {
      setSession(prev => ({ 
        ...prev, 
        sessionString: savedSession,
        isLoggedIn: true,
        isConnected: true 
      }));
    }
  }, []);

  return {
    session,
    chats,
    loading,
    loginStep,
    initializeClient,
    sendPhoneNumber,
    verifyPhoneCode,
    verify2FA,
    fetchChats,
    logout,
    refreshChats: fetchChats
  };
};