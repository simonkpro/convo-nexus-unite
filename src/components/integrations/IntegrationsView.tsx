
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Mail, 
  Users, 
  MessageCircle, 
  Bot,
  Settings,
  CheckCircle,
  AlertCircle,
  Plus,
  ExternalLink
} from "lucide-react";

export const IntegrationsView = () => {
  const [integrations, setIntegrations] = useState([
    {
      id: "gmail",
      name: "Gmail",
      description: "Sync emails, threads, and labels from your Gmail account",
      icon: Mail,
      connected: true,
      status: "active",
      lastSync: "2 minutes ago",
      messageCount: 1247,
      accountEmail: "support@company.com"
    },
    {
      id: "teams",
      name: "Microsoft Teams",
      description: "Import chats and channel conversations from Teams",
      icon: Users,
      connected: true,
      status: "active",
      lastSync: "5 minutes ago",
      messageCount: 892,
      accountEmail: "team@company.com"
    },
    {
      id: "telegram",
      name: "Telegram",
      description: "Fetch direct messages and group conversations",
      icon: MessageCircle,
      connected: true,
      status: "active",
      lastSync: "1 minute ago",
      messageCount: 445,
      accountEmail: "@company_support"
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "Enable AI-powered summarization and insights",
      icon: Bot,
      connected: true,
      status: "active",
      lastSync: "Active",
      messageCount: null,
      accountEmail: "GPT-4 API"
    }
  ]);

  const availableIntegrations = [
    {
      id: "slack",
      name: "Slack",
      description: "Connect Slack workspaces and channels",
      icon: MessageCircle,
      comingSoon: false
    },
    {
      id: "discord",
      name: "Discord",
      description: "Import Discord server conversations",
      icon: MessageCircle,
      comingSoon: true
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      description: "Sync WhatsApp Business conversations",
      icon: MessageCircle,
      comingSoon: true
    }
  ];

  const toggleIntegration = (id: string) => {
    setIntegrations(integrations.map(integration => 
      integration.id === id 
        ? { ...integration, connected: !integration.connected, status: integration.connected ? "inactive" : "active" }
        : integration
    ));
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600">Manage your connected platforms and AI services</p>
        </div>
        
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Connected Integrations */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card key={integration.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                      <p className="text-sm text-gray-500">{integration.accountEmail}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={integration.status === "active" ? "default" : "secondary"}
                      className={integration.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {integration.connected ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <AlertCircle className="w-3 h-3 mr-1" />
                      )}
                      {integration.status}
                    </Badge>
                    <Switch 
                      checked={integration.connected}
                      onCheckedChange={() => toggleIntegration(integration.id)}
                    />
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{integration.description}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    {integration.messageCount && (
                      <span className="text-gray-500">
                        {integration.messageCount.toLocaleString()} messages
                      </span>
                    )}
                    <span className="text-gray-500">
                      Last sync: {integration.lastSync}
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Available Integrations */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableIntegrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card key={integration.id} className="p-6 relative">
                {integration.comingSoon && (
                  <Badge className="absolute top-4 right-4 bg-orange-100 text-orange-800">
                    Coming Soon
                  </Badge>
                )}
                
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{integration.description}</p>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={integration.comingSoon}
                >
                  {integration.comingSoon ? "Coming Soon" : "Connect"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Integration Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Auto-sync intervals</h4>
              <p className="text-sm text-gray-500">How often to check for new messages</p>
            </div>
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option>Every 5 minutes</option>
              <option>Every 15 minutes</option>
              <option>Every 30 minutes</option>
              <option>Every hour</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">AI auto-summarization</h4>
              <p className="text-sm text-gray-500">Automatically generate summaries for new conversations</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Smart notifications</h4>
              <p className="text-sm text-gray-500">Get notified about important conversations</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button>Save Settings</Button>
        </div>
      </Card>
    </div>
  );
};
