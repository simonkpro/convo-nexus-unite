import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  connected: boolean;
  status: 'active' | 'inactive' | 'error';
  lastSync: string;
  messageCount: number | null;
  accountEmail: string;
  platform: string;
}

export const useIntegrations = () => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Transform database data to UI format
      const transformedIntegrations: Integration[] = data?.map(integration => ({
        id: integration.platform,
        name: getPlatformName(integration.platform),
        description: getPlatformDescription(integration.platform),
        icon: integration.platform, // Just pass the platform name, not the icon component
        connected: integration.status === 'connected',
        status: integration.status === 'connected' ? 'active' as const : 'inactive' as const,
        lastSync: integration.status === 'connected' ? 'Connected' : 'Not connected',
        messageCount: null,
        accountEmail: (integration.settings as any)?.email || (integration.settings as any)?.bot_username || 'Connected',
        platform: integration.platform
      })) || [];

      setIntegrations(transformedIntegrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;

      // Open OAuth popup
      const popup = window.open(data.authUrl, 'gmail-auth', 'width=500,height=600');
      
      // Monitor popup for auth completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Refresh integrations after auth
          setTimeout(() => fetchIntegrations(), 1000);
        }
      }, 1000);

    } catch (error) {
      console.error('Gmail connection error:', error);
      toast.error('Failed to connect Gmail');
    }
  };

  const syncGmail = async () => {
    try {
      toast.loading('Syncing Gmail messages...');
      
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { action: 'sync_emails' }
      });

      if (error) throw error;

      toast.success(`Synced ${data.synced_messages} new messages from Gmail!`);
      return data;
    } catch (error) {
      console.error('Gmail sync error:', error);
      toast.error('Failed to sync Gmail messages');
    }
  };

  const connectTelegram = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('telegram-setup', {
        body: { action: 'setup_bot' }
      });

      if (error) throw error;

      toast.success(`Telegram bot @${data.bot_username} connected successfully!`);
      fetchIntegrations();
    } catch (error) {
      console.error('Telegram connection error:', error);
      toast.error('Failed to connect Telegram bot');
    }
  };

  const syncTelegram = async () => {
    try {
      toast.loading('Syncing Telegram chats...');
      
      const { data, error } = await supabase.functions.invoke('telegram-sync', {
        body: { action: 'sync_chats' }
      });

      if (error) throw error;

      toast.success(`Synced ${data.synced_messages} new messages from Telegram!`);
      return data;
    } catch (error) {
      console.error('Telegram sync error:', error);
      toast.error('Failed to sync Telegram messages');
    }
  };

  const connectOpenAI = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('openai-setup', {
        body: { action: 'test_connection' }
      });

      if (error) throw error;

      toast.success(`OpenAI connected with ${data.available_models} models available!`);
      fetchIntegrations();
    } catch (error) {
      console.error('OpenAI connection error:', error);
      toast.error('Failed to connect OpenAI');
    }
  };

  const generateSummary = async (conversationId: string) => {
    try {
      toast.loading('Generating AI summary...');
      
      const { data, error } = await supabase.functions.invoke('ai-summarize', {
        body: { action: 'generate_summary', conversation_id: conversationId }
      });

      if (error) throw error;

      toast.success('AI summary generated successfully!');
      return data.summary;
    } catch (error) {
      console.error('AI summary error:', error);
      toast.error('Failed to generate AI summary');
    }
  };

  const connectIntegration = async (platform: string) => {
    switch (platform) {
      case 'gmail':
        await connectGmail();
        break;
      case 'telegram':
        await connectTelegram();
        break;
      case 'openai':
        await connectOpenAI();
        break;
      default:
        toast.error('Integration not supported');
    }
  };

  const disconnectIntegration = async (platform: string) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ status: 'disconnected' as any })
        .eq('user_id', user?.id)
        .eq('platform', platform as any);

      if (error) throw error;

      toast.success('Integration disconnected');
      fetchIntegrations();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect integration');
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [user]);

  return {
    integrations,
    loading,
    connectIntegration,
    disconnectIntegration,
    refreshIntegrations: fetchIntegrations,
    syncGmail,
    syncTelegram,
    generateSummary
  };
};

// Helper functions
function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    gmail: 'Gmail',
    telegram: 'Telegram',
    openai: 'OpenAI'
  };
  return names[platform] || platform;
}

function getPlatformDescription(platform: string): string {
  const descriptions: Record<string, string> = {
    gmail: 'Sync emails, threads, and labels from your Gmail account',
    telegram: 'Fetch direct messages and group conversations',
    openai: 'Enable AI-powered summarization and insights'
  };
  return descriptions[platform] || '';
}