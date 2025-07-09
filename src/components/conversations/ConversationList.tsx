
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { 
  Mail, 
  MessageCircle, 
  Users, 
  Clock,
  AlertCircle,
  CheckCircle,
  Star,
  Loader2
} from "lucide-react";

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string;
}

const platformIcons = {
  gmail: Mail,
  teams: Users,
  telegram: MessageCircle
};

const priorityColors = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800"
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
};

export const ConversationList = ({ onSelectConversation, selectedId }: ConversationListProps) => {
  const { conversations, loading, error } = useConversations();

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <Badge variant="secondary">{conversations.length} total</Badge>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            All
          </Button>
          <Button variant="ghost" size="sm" className="flex-1">
            Unread
          </Button>
          <Button variant="ghost" size="sm" className="flex-1">
            Priority
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading conversations...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <span className="ml-2 text-red-500">Error loading conversations</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <MessageCircle className="h-6 w-6 text-gray-400" />
            <span className="ml-2 text-gray-500">No conversations yet</span>
          </div>
        ) : (
          conversations.map((conversation) => {
          const PlatformIcon = platformIcons[conversation.platform];
          
          return (
            <div
              key={conversation.id}
              className={cn(
                "p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                selectedId === conversation.id && "bg-blue-50 border-blue-200"
              )}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {conversation.customer.avatar}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={cn(
                      "text-sm font-medium truncate",
                      conversation.is_unread ? "text-gray-900" : "text-gray-700"
                    )}>
                      {conversation.subject}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <PlatformIcon className="w-3 h-3 text-gray-400" />
                      {conversation.is_unread && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">{conversation.customer.name}</p>
                  
                  <p className="text-sm text-gray-500 truncate mb-2">
                    {conversation.latest_message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", priorityColors[conversation.priority])}
                      >
                        {conversation.priority}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {conversation.message_count} messages
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{formatTimeAgo(conversation.last_message_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conversation.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
};
