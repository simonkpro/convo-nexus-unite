
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  X, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  MessageSquare,
  TrendingUp,
  Clock,
  ExternalLink
} from "lucide-react";

interface CustomerPanelProps {
  customer: any;
  onClose: () => void;
}

// Mock customer data
const mockCustomerData = {
  name: "Sarah Chen",
  email: "sarah@acme.com",
  phone: "+1 (555) 123-4567",
  company: "Acme Corporation",
  role: "Senior Developer",
  joinDate: "March 2023",
  totalConversations: 15,
  avgResponseTime: "2.3 hours",
  satisfaction: "High",
  tags: ["Technical", "Enterprise", "Priority"],
  recentActivity: [
    { type: "email", subject: "API Integration Help", date: "Today", platform: "Gmail" },
    { type: "chat", subject: "Billing Question", date: "Yesterday", platform: "Teams" },
    { type: "message", subject: "Feature Request", date: "2 days ago", platform: "Telegram" }
  ],
  notes: [
    { id: 1, content: "Experienced developer, prefers technical documentation", author: "Alex", date: "Mar 15" },
    { id: 2, content: "Enterprise customer, high priority for support", author: "Sarah", date: "Mar 10" }
  ]
};

export const CustomerPanel = ({ customer, onClose }: CustomerPanelProps) => {
  const customerData = mockCustomerData; // In real app, this would come from props

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Customer Profile</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-medium">
            SC
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{customerData.name}</h3>
            <p className="text-sm text-gray-500">{customerData.role}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Contact Info */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{customerData.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{customerData.phone}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Building className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{customerData.company}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Customer since {customerData.joinDate}</span>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Communication Stats</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">{customerData.totalConversations}</div>
              <div className="text-xs text-gray-500">Total Conversations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{customerData.avgResponseTime}</div>
              <div className="text-xs text-gray-500">Avg Response Time</div>
            </div>
          </div>
          
          <Separator className="my-3" />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Satisfaction</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <TrendingUp className="w-3 h-3 mr-1" />
              {customerData.satisfaction}
            </Badge>
          </div>
        </Card>

        {/* Tags */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {customerData.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
          <div className="space-y-3">
            {customerData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.subject}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{activity.date}</span>
                    <span>•</span>
                    <span>{activity.platform}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Button variant="outline" size="sm" className="w-full mt-3">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Full History
          </Button>
        </Card>

        {/* Notes */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Internal Notes</h4>
          <div className="space-y-3">
            {customerData.notes.map((note) => (
              <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">{note.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>by {note.author}</span>
                  <span>{note.date}</span>
                </div>
              </div>
            ))}
          </div>
          
          <Button variant="outline" size="sm" className="w-full mt-3">
            Add Note
          </Button>
        </Card>
      </div>
    </div>
  );
};
