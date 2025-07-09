
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Mail, 
  MessageCircle, 
  Users, 
  Clock,
  AlertCircle,
  CheckCircle,
  Star
} from "lucide-react";

interface ConversationListProps {
  onSelectConversation: (conversation: any) => void;
  selectedId?: string;
}

// Mock data for conversations
const mockConversations = [
  {
    id: "1",
    subject: "Product Integration Questions",
    customer: { name: "Sarah Chen", email: "sarah@acme.com", avatar: "SC" },
    platform: "gmail",
    lastMessage: "Thanks for the detailed explanation. Could you also...",
    timestamp: "2 min ago",
    unread: true,
    priority: "high",
    tags: ["Technical", "Integration"],
    messageCount: 12
  },
  {
    id: "2",
    subject: "Billing Issue Resolution",
    customer: { name: "Mike Johnson", email: "mike@techcorp.com", avatar: "MJ" },
    platform: "teams",
    lastMessage: "The payment has been processed successfully.",
    timestamp: "15 min ago",
    unread: false,
    priority: "medium",
    tags: ["Billing", "Resolved"],
    messageCount: 6
  },
  {
    id: "3",
    subject: "Feature Request Discussion",
    customer: { name: "Alex Rodriguez", email: "alex@startup.io", avatar: "AR" },
    platform: "telegram",
    lastMessage: "This feature would really help our workflow...",
    timestamp: "1 hour ago",
    unread: true,
    priority: "low",
    tags: ["Feature Request"],
    messageCount: 3
  },
  {
    id: "4",
    subject: "Onboarding Support",
    customer: { name: "Emma Wilson", email: "emma@bigcompany.com", avatar: "EW" },
    platform: "gmail",
    lastMessage: "Perfect! I'll set up the team training next week.",
    timestamp: "3 hours ago",
    unread: false,
    priority: "medium",
    tags: ["Onboarding", "Training"],
    messageCount: 8
  }
];

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

export const ConversationList = ({ onSelectConversation, selectedId }: ConversationListProps) => {
  const [conversations] = useState(mockConversations);

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
        {conversations.map((conversation) => {
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
                      conversation.unread ? "text-gray-900" : "text-gray-700"
                    )}>
                      {conversation.subject}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <PlatformIcon className="w-3 h-3 text-gray-400" />
                      {conversation.unread && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">{conversation.customer.name}</p>
                  
                  <p className="text-sm text-gray-500 truncate mb-2">
                    {conversation.lastMessage}
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
                        {conversation.messageCount} messages
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{conversation.timestamp}</span>
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
        })}
      </div>
    </div>
  );
};
