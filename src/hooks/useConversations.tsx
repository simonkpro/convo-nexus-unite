import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Conversation {
  id: string;
  subject: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  platform: 'gmail' | 'telegram' | 'teams';
  status: 'open' | 'pending' | 'resolved' | 'archived';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  is_unread: boolean;
  last_message_at: string;
  message_count?: number;
  latest_message?: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          subject,
          platform,
          status,
          priority,
          tags,
          is_unread,
          last_message_at,
          customer_id,
          customers (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Get message counts and latest messages for each conversation
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { data: messagesData } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count: messageCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          return {
            id: conv.id,
            subject: conv.subject || 'No Subject',
            customer: {
              id: conv.customers?.id || '',
              name: conv.customers?.name || 'Unknown',
              email: conv.customers?.email,
              avatar: conv.customers?.avatar_url || conv.customers?.name?.charAt(0) || '?',
            },
            platform: conv.platform as 'gmail' | 'telegram' | 'teams',
            status: conv.status as 'open' | 'pending' | 'resolved' | 'archived',
            priority: (conv.priority as 'high' | 'medium' | 'low') || 'medium',
            tags: conv.tags || [],
            is_unread: conv.is_unread,
            last_message_at: conv.last_message_at,
            message_count: messageCount || 0,
            latest_message: messagesData?.[0]?.content?.substring(0, 100) || 'No messages',
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ is_unread: false })
        .eq('id', conversationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, is_unread: false }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const updateStatus = async (conversationId: string, status: 'open' | 'pending' | 'resolved' | 'archived') => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', conversationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, status }
            : conv
        )
      );

      toast.success(`Conversation marked as ${status}`);
    } catch (error) {
      console.error('Error updating conversation status:', error);
      toast.error('Failed to update status');
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

  useEffect(() => {
    fetchConversations();
  }, [user]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    markAsRead,
    updateStatus,
    generateSummary
  };
};