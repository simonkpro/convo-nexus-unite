import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

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

// Mock implementation for browser compatibility
export const useTelegramMTProto = () => {
  const [session, setSession] = useState<TelegramSession>({ isLoggedIn: false });
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'code' | '2fa' | 'complete'>('phone');

  // Mock initialization
  const initializeClient = useCallback(async (apiId: number, apiHash: string, sessionString?: string) => {
    try {
      setLoading(true);
      
      // Store credentials for reuse
      localStorage.setItem('telegram_api_id', apiId.toString());
      localStorage.setItem('telegram_api_hash', apiHash);

      // Simulate initialization delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if we have a saved session
      if (sessionString) {
        try {
          const sessionData = JSON.parse(sessionString);
          if (sessionData.isLoggedIn) {
            setSession({
              isLoggedIn: true,
              sessionString,
              phoneNumber: sessionData.phoneNumber,
            });
            setLoginStep('complete');
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
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mock phone number verification
  const sendPhoneNumber = useCallback(async (phoneNumber: string, apiId: number, apiHash: string) => {
    try {
      setLoading(true);
      
      // Validate input
      if (!apiId || !apiHash || !phoneNumber) {
        toast.error('Please provide API ID, API Hash, and phone number');
        return;
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSession(prev => ({ ...prev, phoneNumber }));
      setLoginStep('code');
      toast.success('Verification code sent to Telegram! (Demo mode - enter any 5-digit code)');
    } catch (error: any) {
      console.error('Error sending phone number:', error);
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mock code verification
  const verifyPhoneCode = useCallback(async (code: string) => {
    try {
      setLoading(true);
      
      if (!session.phoneNumber) {
        toast.error('Missing phone number');
        return;
      }

      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Accept any 5-digit code in demo mode
      if (code.length === 5) {
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
        toast.success('Successfully logged in to Telegram! (Demo mode)');
        
        // Load demo chats
        await loadDemoChats();
      } else {
        toast.error('Please enter a 5-digit verification code');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error('Invalid verification code');
    } finally {
      setLoading(false);
    }
  }, [session.phoneNumber]);

  // Mock 2FA verification
  const verify2FA = useCallback(async (password: string) => {
    try {
      setLoading(true);
      
      // Simulate 2FA verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Accept any password in demo mode
      if (password.length > 0) {
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
        toast.success('Successfully logged in with 2FA! (Demo mode)');
        
        // Load demo chats
        await loadDemoChats();
      } else {
        toast.error('Please enter your 2FA password');
      }
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      toast.error('Invalid 2FA password');
    } finally {
      setLoading(false);
    }
  }, [session.phoneNumber]);

  // Load demo chats
  const loadDemoChats = async () => {
    const demoChats: TelegramChat[] = [
      {
        id: '1',
        title: 'John Doe',
        type: 'private',
        lastMessage: {
          id: 101,
          text: 'Hey, how are you doing?',
          date: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          sender: 'John Doe'
        },
        unreadCount: 2,
        recentMessages: [
          {
            id: 101,
            text: 'Hey, how are you doing?',
            date: new Date(Date.now() - 1000 * 60 * 30),
            sender: 'John Doe',
            senderId: '1'
          },
          {
            id: 100,
            text: 'Thanks for the help yesterday!',
            date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            sender: 'John Doe',
            senderId: '1'
          }
        ]
      },
      {
        id: '2',
        title: 'Design Team',
        type: 'group',
        lastMessage: {
          id: 201,
          text: 'The new mockups are ready for review',
          date: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          sender: 'Alice'
        },
        unreadCount: 5,
        recentMessages: [
          {
            id: 201,
            text: 'The new mockups are ready for review',
            date: new Date(Date.now() - 1000 * 60 * 60),
            sender: 'Alice',
            senderId: '2'
          },
          {
            id: 200,
            text: 'Great work everyone!',
            date: new Date(Date.now() - 1000 * 60 * 60 * 3),
            sender: 'Bob',
            senderId: '3'
          }
        ]
      },
      {
        id: '3',
        title: 'Tech News',
        type: 'channel',
        lastMessage: {
          id: 301,
          text: 'Breaking: New JavaScript framework announced',
          date: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
          sender: 'Tech News'
        },
        unreadCount: 0,
        recentMessages: [
          {
            id: 301,
            text: 'Breaking: New JavaScript framework announced',
            date: new Date(Date.now() - 1000 * 60 * 15),
            sender: 'Tech News',
            senderId: '4'
          }
        ]
      }
    ];

    setChats(demoChats);
  };

  // Fetch chats
  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!session.isLoggedIn) {
        toast.error('Not logged in to Telegram');
        return;
      }

      // Simulate fetching delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await loadDemoChats();
      toast.success('Chats refreshed successfully! (Demo mode)');
    } catch (error: any) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  }, [session.isLoggedIn]);

  // Logout
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Simulate logout delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clear all stored data
      localStorage.removeItem('telegram_session');
      localStorage.removeItem('telegram_api_id');
      localStorage.removeItem('telegram_api_hash');
      
      setSession({ isLoggedIn: false });
      setChats([]);
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