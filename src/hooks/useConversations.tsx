import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
            latest_message: messagesData?.[0]?.content || 'No messages',
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

  useEffect(() => {
    fetchConversations();
  }, [user]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
};