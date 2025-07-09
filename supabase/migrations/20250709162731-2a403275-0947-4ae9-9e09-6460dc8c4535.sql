-- Create database schema for unified inbox platform

-- Create enum types
CREATE TYPE platform_type AS ENUM ('gmail', 'telegram', 'teams');
CREATE TYPE conversation_status AS ENUM ('open', 'pending', 'resolved', 'archived');
CREATE TYPE message_type AS ENUM ('email', 'chat', 'system');
CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error');

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  company TEXT,
  phone TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create integrations table to track connected platforms
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform platform_type NOT NULL,
  status integration_status DEFAULT 'disconnected',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  platform platform_type NOT NULL,
  platform_thread_id TEXT NOT NULL,
  subject TEXT,
  status conversation_status DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  tags TEXT[],
  is_unread BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(platform, platform_thread_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  platform_message_id TEXT NOT NULL,
  type message_type DEFAULT 'chat',
  content TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, platform_message_id)
);

-- Create AI summaries table
CREATE TABLE public.ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  action_items TEXT[],
  sentiment TEXT,
  key_points TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customers (accessible to all authenticated users for now)
CREATE POLICY "Users can view all customers" ON public.customers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete customers" ON public.customers
  FOR DELETE TO authenticated USING (true);

-- Create RLS policies for integrations (user-specific)
CREATE POLICY "Users can manage their integrations" ON public.integrations
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create RLS policies for conversations (user-specific)
CREATE POLICY "Users can manage their conversations" ON public.conversations
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create RLS policies for messages (via conversation ownership)
CREATE POLICY "Users can access messages from their conversations" ON public.messages
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- Create RLS policies for AI summaries (via conversation ownership)
CREATE POLICY "Users can access summaries from their conversations" ON public.ai_summaries
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = ai_summaries.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- Create RLS policies for reports (user-specific)
CREATE POLICY "Users can manage their reports" ON public.reports
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_customer_id ON public.conversations(customer_id);
CREATE INDEX idx_conversations_platform ON public.conversations(platform);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_integrations_user_platform ON public.integrations(user_id, platform);