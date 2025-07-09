
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  Mail, 
  MessageCircle, 
  Users, 
  User,
  Clock,
  Star,
  Archive,
  Tag,
  Send,
  Paperclip,
  Sparkles,
  ExternalLink
} from "lucide-react";

interface ConversationViewProps {
  conversation: any;
  onShowCustomer: () => void;
}

// Mock conversation messages
const mockMessages = [
  {
    id: "1",
    sender: "Sarah Chen",
    senderEmail: "sarah@acme.com",
    content: "Hi there! I'm having some trouble integrating your API with our existing system. The documentation mentions OAuth2 authentication, but I'm getting a 401 error when trying to access the endpoints.",
    timestamp: "Today at 2:15 PM",
    platform: "gmail",
    isCustomer: true
  },
  {
    id: "2",
    sender: "Alex Support",
    senderEmail: "alex@unifiedinbox.com",
    content: "Hi Sarah! I'd be happy to help you with the API integration. The 401 error typically indicates an authentication issue. Can you please share the code snippet you're using for the OAuth2 flow?",
    timestamp: "Today at 2:18 PM",
    platform: "gmail",
    isCustomer: false
  },
  {
    id: "3",
    sender: "Sarah Chen",
    senderEmail: "sarah@acme.com",
    content: "Sure! Here's the code I'm using:\n\n```javascript\nconst token = await getAccessToken();\nconst response = await fetch('/api/v1/data', {\n  headers: {\n    'Authorization': `Bearer ${token}`\n  }\n});\n```\n\nThe getAccessToken() function returns what looks like a valid token, but I still get the 401 error.",
    timestamp: "Today at 2:25 PM",
    platform: "gmail",
    isCustomer: true
  }
];

const aiSummary = {
  summary: "Customer is experiencing API authentication issues with OAuth2 integration. Provided code snippet shows correct Bearer token format. Next step: validate token scope and endpoint permissions.",
  actionItems: [
    "Verify OAuth2 token scope includes required permissions",
    "Check if API endpoint requires additional headers",
    "Provide working code example"
  ],
  sentiment: "neutral",
  priority: "medium"
};

export const ConversationView = ({ conversation, onShowCustomer }: ConversationViewProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [showAiSummary, setShowAiSummary] = useState(true);

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Select a conversation</p>
          <p className="text-sm">Choose a conversation from the list to view details</p>
        </div>
      </div>
    );
  }

  const platformIcons = {
    gmail: Mail,
    teams: Users,
    telegram: MessageCircle
  };

  const PlatformIcon = platformIcons[conversation.platform];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {conversation.customer.avatar}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{conversation.subject}</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{conversation.customer.name}</span>
                <span>•</span>
                <span>{conversation.customer.email}</span>
                <PlatformIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onShowCustomer}>
              <User className="w-4 h-4 mr-2" />
              Customer
            </Button>
            <Button variant="outline" size="sm">
              <Star className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Tag className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {conversation.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
            {mockMessages.length} messages
          </Badge>
        </div>
      </div>

      {/* AI Summary */}
      {showAiSummary && (
        <Card className="m-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-medium text-purple-800">AI Summary</h3>
                <Badge variant="outline" className="text-xs text-purple-700">
                  {aiSummary.sentiment} sentiment
                </Badge>
              </div>
              <p className="text-sm text-gray-700 mb-3">{aiSummary.summary}</p>
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-1">Action Items:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  {aiSummary.actionItems.map((item, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <span className="w-1 h-1 bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAiSummary(false)}
              className="text-purple-600 hover:text-purple-700"
            >
              ×
            </Button>
          </div>
        </Card>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mockMessages.map((message) => (
          <div key={message.id} className={`flex ${message.isCustomer ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-3xl ${message.isCustomer ? 'mr-12' : 'ml-12'}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900">{message.sender}</span>
                <span className="text-xs text-gray-500">{message.timestamp}</span>
                <PlatformIcon className="w-3 h-3 text-gray-400" />
              </div>
              <div className={`p-3 rounded-lg ${
                message.isCustomer 
                  ? 'bg-gray-100 border border-gray-200' 
                  : 'bg-blue-600 text-white'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply Area */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-3">
          <Textarea
            placeholder="Type your reply..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Paperclip className="w-4 h-4 mr-2" />
                Attach
              </Button>
              <Button variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assist
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Save Draft
              </Button>
              <Button size="sm">
                <Send className="w-4 h-4 mr-2" />
                Send Reply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
