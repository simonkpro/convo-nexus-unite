import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { MTProto } from '@mtproto/core';

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

// Main hook implementation
export const useTelegramMTProto = () => {
  const [session, setSession] = useState<TelegramSession>({ isLoggedIn: false });
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'code' | '2fa' | 'complete'>('phone');
  const [mtproto, setMtproto] = useState<MTProto | null>(null);
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>('');

  // Initialize MTProto client
  const initializeClient = useCallback(async (apiId: number, apiHash: string, sessionString?: string) => {
    try {
      setLoading(true);
      
      // Store credentials for reuse
      localStorage.setItem('telegram_api_id', apiId.toString());
      localStorage.setItem('telegram_api_hash', apiHash);

      const client = new MTProto({
        api_id: apiId,
        api_hash: apiHash,
        storageOptions: {
          instance: localStorage,
        },
      });

      setMtproto(client);

      // Check if we have a saved session
      if (sessionString) {
        // For MTProto core, we need to check if user is already logged in
        try {
          await client.call('users.getFullUser', {
            id: {
              _: 'inputUserSelf',
            },
          });
          
          setSession({
            isLoggedIn: true,
            sessionString,
          });
          setLoginStep('complete');
          return client;
        } catch (error) {
          console.log('Session invalid, need to login again');
          localStorage.removeItem('telegram_session');
        }
      }

      return client;
    } catch (error) {
      console.error('Failed to initialize MTProto client:', error);
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
      
      const client = await initializeClient(apiId, apiHash);
      if (!client) return;

      const result = await client.call('auth.sendCode', {
        phone_number: phoneNumber,
        api_id: apiId,
        api_hash: apiHash,
        settings: {
          _: 'codeSettings',
        },
      });

      setPhoneCodeHash(result.phone_code_hash);
      setSession(prev => ({ ...prev, phoneNumber }));
      setLoginStep('code');
      toast.success('Verification code sent to Telegram!');
    } catch (error: any) {
      console.error('Error sending phone number:', error);
      toast.error(error.error_message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  }, [initializeClient]);

  // Verify phone code
  const verifyPhoneCode = useCallback(async (code: string) => {
    try {
      setLoading(true);
      
      if (!mtproto || !phoneCodeHash || !session.phoneNumber) {
        toast.error('Missing authentication data');
        return;
      }

      const result = await mtproto.call('auth.signIn', {
        phone_number: session.phoneNumber,
        phone_code_hash: phoneCodeHash,
        phone_code: code,
      });

      // Save session data
      const sessionData = JSON.stringify({
        isLoggedIn: true,
        phoneNumber: session.phoneNumber,
      });
      localStorage.setItem('telegram_session', sessionData);

      setSession({
        isLoggedIn: true,
        phoneNumber: session.phoneNumber,
        sessionString: sessionData,
      });
      setLoginStep('complete');
      toast.success('Successfully logged in to Telegram!');
    } catch (error: any) {
      console.error('Error verifying code:', error);
      
      if (error.error_message?.includes('SESSION_PASSWORD_NEEDED')) {
        setLoginStep('2fa');
        toast.info('Please enter your 2FA password');
      } else {
        toast.error(error.error_message || 'Invalid verification code');
      }
    } finally {
      setLoading(false);
    }
  }, [mtproto, phoneCodeHash, session.phoneNumber]);

  // Verify 2FA password
  const verify2FA = useCallback(async (password: string) => {
    try {
      setLoading(true);
      
      if (!mtproto) {
        toast.error('No active session');
        return;
      }

      // Note: This is a simplified 2FA implementation
      // In production, you'd need proper SRP implementation
      const result = await mtproto.call('auth.checkPassword', {
        password: {
          _: 'inputCheckPasswordEmpty',
        },
      });

      // Save session data
      const sessionData = JSON.stringify({
        isLoggedIn: true,
        phoneNumber: session.phoneNumber,
      });
      localStorage.setItem('telegram_session', sessionData);

      setSession({
        isLoggedIn: true,
        phoneNumber: session.phoneNumber,
        sessionString: sessionData,
      });
      setLoginStep('complete');
      toast.success('Successfully logged in with 2FA!');
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      toast.error(error.error_message || 'Invalid 2FA password');
    } finally {
      setLoading(false);
    }
  }, [mtproto, session.phoneNumber]);

  // Fetch chats using MTProto
  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!mtproto) {
        toast.error('Not connected to Telegram');
        return;
      }

      // Get dialogs (chats)
      const dialogs = await mtproto.call('messages.getDialogs', {
        offset_date: 0,
        offset_id: 0,
        offset_peer: {
          _: 'inputPeerEmpty',
        },
        limit: 50,
        hash: 0,
      });

      const chatList: TelegramChat[] = [];

      // Process dialogs
      if (dialogs.dialogs) {
        for (const dialog of dialogs.dialogs) {
          // Find corresponding chat/user in chats array
          const peer = dialogs.chats?.find((chat: any) => 
            chat.id === Math.abs(dialog.peer.chat_id || dialog.peer.channel_id || 0)
          ) || dialogs.users?.find((user: any) => 
            user.id === dialog.peer.user_id
          );

          if (peer) {
            chatList.push({
              id: peer.id?.toString() || 'unknown',
              title: peer.title || peer.first_name || 'Unknown',
              type: peer._ === 'user' ? 'private' : 
                    peer._ === 'channel' ? 'channel' : 'group',
              lastMessage: dialog.top_message ? {
                id: 1,
                text: 'Recent message available',
                date: new Date(),
                sender: 'Unknown'
              } : undefined,
              lastMessageDate: new Date(),
              unreadCount: dialog.unread_count || 0,
              recentMessages: [], // Will be populated in a future update
            });
          }
        }
      }

      setChats(chatList);
      toast.success(`Loaded ${chatList.length} chats`);
    } catch (error: any) {
      console.error('Error fetching chats:', error);
      toast.error(error.error_message || 'Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  }, [mtproto]);

  // Logout
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      if (mtproto) {
        try {
          await mtproto.call('auth.logOut', {});
        } catch (error) {
          console.log('Logout error (expected):', error);
        }
      }

      // Clear all stored data
      localStorage.removeItem('telegram_session');
      localStorage.removeItem('telegram_api_id');
      localStorage.removeItem('telegram_api_hash');
      
      setSession({ isLoggedIn: false });
      setChats([]);
      setMtproto(null);
      setPhoneCodeHash('');
      setLoginStep('phone');
      
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Error during logout:', error);
      toast.error('Error during logout');
    } finally {
      setLoading(false);
    }
  }, [mtproto]);

  // Load saved session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('telegram_session');
    const savedApiId = localStorage.getItem('telegram_api_id');
    const savedApiHash = localStorage.getItem('telegram_api_hash');
    
    if (savedSession && savedApiId && savedApiHash) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.isLoggedIn) {
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
    refreshChats: fetchChats, // Add alias for compatibility
  };
};