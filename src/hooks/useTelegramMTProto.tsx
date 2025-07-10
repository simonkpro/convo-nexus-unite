import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Types
interface TelegramSession {
  isLoggedIn: boolean;
  phoneNumber?: string;
  sessionString?: string;
  authKey?: string;
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

export const useTelegramMTProto = () => {
  const [session, setSession] = useState<TelegramSession>({ isLoggedIn: false });
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'code' | '2fa' | 'complete'>('phone');
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>('');

  // Call the Telegram MTProto edge function
  const callTelegramAPI = async (method: string, params: any) => {
    try {
      console.log('Calling Telegram API:', method, params);
      
      const { data, error } = await supabase.functions.invoke('telegram-mtproto', {
        body: { method, params }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'API call failed');
      }

      if (!data.success) {
        console.error('Telegram API error:', data.error);
        throw new Error(data.error || 'Telegram API call failed');
      }

      console.log('Telegram API success:', data.result);
      return data.result;
    } catch (error) {
      console.error('Error calling Telegram API:', error);
      throw error;
    }
  };

  // Initialize client
  const initializeClient = useCallback(async (apiId: number, apiHash: string, sessionString?: string) => {
    try {
      setLoading(true);
      
      // Store credentials for reuse
      localStorage.setItem('telegram_api_id', apiId.toString());
      localStorage.setItem('telegram_api_hash', apiHash);

      // Check if we have a saved session
      if (sessionString) {
        try {
          const sessionData = JSON.parse(sessionString);
          if (sessionData.isLoggedIn && sessionData.sessionString) {
            setSession({
              isLoggedIn: true,
              sessionString: sessionData.sessionString,
              phoneNumber: sessionData.phoneNumber,
            });
            setLoginStep('complete');
            toast.success('Session restored successfully!');
            return true;
          }
        } catch (error) {
          console.log('Session invalid, need to login again');
          localStorage.removeItem('telegram_session');
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize Telegram client:', error);
      toast.error('Failed to initialize Telegram client');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send phone number for verification
  const sendPhoneNumber = useCallback(async (phoneNumber: string, apiId: number, apiHash: string) => {
    try {
      setLoading(true);
      
      // Validate input
      if (!apiId || !apiHash || !phoneNumber) {
        toast.error('Please provide API ID, API Hash, and phone number');
        return;
      }

      console.log('Sending phone number to Telegram API...');
      
      const result = await callTelegramAPI('sendCode', {
        api_id: apiId,
        api_hash: apiHash,
        phone_number: phoneNumber
      });

      console.log('Phone code sent successfully:', result);
      
      // Extract phone code hash from response (handle both formats)
      const codeHash = result.phoneCodeHash || result.phone_code_hash;
      if (!codeHash) {
        throw new Error('No phone code hash received from Telegram');
      }

      setPhoneCodeHash(codeHash);
      setSession(prev => ({ ...prev, phoneNumber }));
      setLoginStep('code');
      toast.success('Verification code sent to your Telegram app!');
      
    } catch (error: any) {
      console.error('Error sending phone number:', error);
      
      // Handle specific Telegram API errors
      let errorMessage = 'Failed to send verification code';
      if (error.message?.includes('PHONE_NUMBER_INVALID')) {
        errorMessage = 'Invalid phone number format';
      } else if (error.message?.includes('API_ID_INVALID')) {
        errorMessage = 'Invalid API ID - check your credentials';
      } else if (error.message?.includes('API_HASH_INVALID')) {
        errorMessage = 'Invalid API Hash - check your credentials';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify phone code
  const verifyPhoneCode = useCallback(async (code: string) => {
    try {
      setLoading(true);
      
      if (!phoneCodeHash || !session.phoneNumber) {
        toast.error('Missing authentication data');
        return;
      }

      const apiId = localStorage.getItem('telegram_api_id');
      const apiHash = localStorage.getItem('telegram_api_hash');
      
      if (!apiId || !apiHash) {
        toast.error('Missing API credentials');
        return;
      }

      console.log('Verifying phone code...');

      try {
        const result = await callTelegramAPI('signIn', {
          api_id: parseInt(apiId),
          api_hash: apiHash,
          phone_number: session.phoneNumber,
          phone_code_hash: phoneCodeHash,
          phone_code: code
        });

        console.log('Sign in successful:', result);
        
        // Use the session string from the MTProto result
        const sessionString = result.sessionString || result.authKey;
        
        // Save session data
        const sessionData = {
          isLoggedIn: true,
          phoneNumber: session.phoneNumber,
          sessionString: sessionString,
          user: result.user
        };
        
        localStorage.setItem('telegram_session', JSON.stringify(sessionData));

        setSession({
          isLoggedIn: true,
          phoneNumber: session.phoneNumber,
          sessionString: sessionString,
        });
        setLoginStep('complete');
        toast.success('Successfully logged in to Telegram!');
        
        // Load chats
        setTimeout(() => {
          fetchChats();
        }, 1000);

      } catch (error: any) {
        console.error('Sign in error:', error);
        
        if (error.message?.includes('SESSION_PASSWORD_NEEDED') || 
            error.message?.includes('2FA')) {
          setLoginStep('2fa');
          toast.info('Please enter your 2FA password');
        } else if (error.message?.includes('PHONE_CODE_INVALID')) {
          toast.error('Invalid verification code');
        } else if (error.message?.includes('PHONE_CODE_EXPIRED')) {
          toast.error('Verification code expired - please request a new one');
          setLoginStep('phone');
        } else {
          toast.error(error.message || 'Verification failed');
        }
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  }, [phoneCodeHash, session.phoneNumber]);

  // Verify 2FA password
  const verify2FA = useCallback(async (password: string) => {
    try {
      setLoading(true);
      
      const apiId = localStorage.getItem('telegram_api_id');
      const apiHash = localStorage.getItem('telegram_api_hash');
      
      if (!apiId || !apiHash) {
        toast.error('Missing API credentials');
        return;
      }

      console.log('Verifying 2FA password...');

      const result = await callTelegramAPI('checkPassword', {
        api_id: parseInt(apiId),
        api_hash: apiHash,
        password: password
      });

      console.log('2FA verification successful:', result);
      
      // Use the session string from the MTProto result
      const sessionString = result.sessionString || result.authKey;
      
      // Save session data
      const sessionData = {
        isLoggedIn: true,
        phoneNumber: session.phoneNumber,
        sessionString: sessionString,
        user: result.user
      };
      
      localStorage.setItem('telegram_session', JSON.stringify(sessionData));

      setSession({
        isLoggedIn: true,
        phoneNumber: session.phoneNumber,
        sessionString: sessionString,
      });
      setLoginStep('complete');
      toast.success('Successfully logged in with 2FA!');
      
      // Load chats
      setTimeout(() => {
        fetchChats();
      }, 1000);

    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      
      if (error.message?.includes('PASSWORD_HASH_INVALID')) {
        toast.error('Invalid 2FA password');
      } else {
        toast.error(error.message || 'Invalid 2FA password');
      }
    } finally {
      setLoading(false);
    }
  }, [session.phoneNumber]);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!session.isLoggedIn || !session.sessionString) {
        toast.error('Not logged in to Telegram');
        return;
      }

      const apiId = localStorage.getItem('telegram_api_id');
      const apiHash = localStorage.getItem('telegram_api_hash');
      
      if (!apiId || !apiHash) {
        toast.error('Missing API credentials');
        return;
      }

      console.log('Fetching chats from Telegram...');

      const result = await callTelegramAPI('getDialogs', {
        api_id: parseInt(apiId),
        api_hash: apiHash,
        session_string: session.sessionString,
        limit: 50
      });

      console.log('Dialogs fetched:', result);
      
      // Transform the response to match our expected format
      const chatList: TelegramChat[] = [];
      
      if (result.dialogs && result.dialogs.length > 0) {
        for (const dialog of result.dialogs) {
          chatList.push({
            id: dialog.id,
            title: dialog.title,
            type: dialog.type === 'user' ? 'private' : 
                  dialog.type === 'channel' ? 'channel' : 'group',
            lastMessage: dialog.lastMessage ? {
              id: 1,
              text: dialog.lastMessage,
              date: new Date(dialog.lastMessageDate),
              sender: 'Sender'
            } : undefined,
            unreadCount: dialog.unreadCount || 0,
            recentMessages: [] // Will be populated when viewing individual chats
          });
        }
      }

      setChats(chatList);
      toast.success(`Loaded ${chatList.length} chats from Telegram`);
      
    } catch (error: any) {
      console.error('Error fetching chats:', error);
      toast.error(error.message || 'Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  }, [session.isLoggedIn, session.sessionString]);

  // Logout
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear all stored data
      localStorage.removeItem('telegram_session');
      localStorage.removeItem('telegram_api_id');
      localStorage.removeItem('telegram_api_hash');
      
      setSession({ isLoggedIn: false });
      setChats([]);
      setPhoneCodeHash('');
      setLoginStep('phone');
      
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Error during logout:', error);
      toast.error('Error during logout');
    } finally {
      setLoading(false);
    }
  }, []);

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
    refreshChats: fetchChats,
  };
};