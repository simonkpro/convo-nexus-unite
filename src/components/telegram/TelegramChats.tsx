import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Users, 
  Hash, 
  User, 
  RefreshCw, 
  LogOut,
  Loader2,
  Clock
} from "lucide-react";
import { useTelegramMTProto } from "@/hooks/useTelegramMTProto";
import { format } from 'date-fns';

interface TelegramChatsProps {
  onLogout: () => void;
}

export const TelegramChats = ({ onLogout }: TelegramChatsProps) => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  const {
    chats,
    loading,
    refreshChats,
    logout
  } = useTelegramMTProto();

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'group':
        return <Users className="w-4 h-4" />;
      case 'channel':
        return <Hash className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const selectedChat = chats.find(chat => chat.id === selectedChatId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Chat List */}
      <div className="w-1/3 border-r bg-white">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Telegram Chats</h2>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshChats}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {chats.length} chats loaded
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedChatId === chat.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
                onClick={() => setSelectedChatId(chat.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getChatIcon(chat.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {chat.title}
                      </h3>
                      {chat.unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 text-xs">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 capitalize">
                      {chat.type}
                    </p>
                    {chat.lastMessage && (
                      <div className="mt-1">
                        <p className="text-sm text-gray-500 truncate">
                          <span className="font-medium">{chat.lastMessage.sender}:</span>{' '}
                          {chat.lastMessage.text}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {format(chat.lastMessage.date, 'MMM d, HH:mm')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Details */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-white">
              <div className="flex items-center space-x-3">
                {getChatIcon(selectedChat.type)}
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedChat.title}</h3>
                  <p className="text-sm text-gray-600 capitalize">
                    {selectedChat.type} • {selectedChat.recentMessages.length} recent messages
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 mb-3">Recent Messages</h4>
                {selectedChat.recentMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recent messages</p>
                  </div>
                ) : (
                  selectedChat.recentMessages.map((message) => (
                    <Card key={message.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {message.sender}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(message.date, 'MMM d, HH:mm')}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {message.text}
                      </p>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a chat</h3>
              <p>Choose a chat from the list to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};