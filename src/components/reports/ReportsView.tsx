
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Clock,
  Download,
  Calendar,
  Filter,
  Mail,
  MessageCircle
} from "lucide-react";

export const ReportsView = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("week");

  const metrics = [
    {
      title: "Total Conversations",
      value: "1,234",
      change: "+12%",
      trend: "up",
      icon: MessageSquare,
      color: "blue"
    },
    {
      title: "Active Customers",
      value: "456",
      change: "+8%",
      trend: "up",
      icon: Users,
      color: "green"
    },
    {
      title: "Avg Response Time",
      value: "2.3h",
      change: "-15%",
      trend: "down",
      icon: Clock,
      color: "purple"
    },
    {
      title: "Resolution Rate",
      value: "94%",
      change: "+3%",
      trend: "up",
      icon: TrendingUp,
      color: "orange"
    }
  ];

  const platformStats = [
    { platform: "Gmail", conversations: 456, percentage: 37, icon: Mail },
    { platform: "Teams", conversations: 378, percentage: 31, icon: Users },
    { platform: "Telegram", conversations: 400, percentage: 32, icon: MessageCircle }
  ];

  const topCustomers = [
    { name: "Acme Corp", conversations: 45, satisfaction: "High" },
    { name: "TechStart Inc", conversations: 38, satisfaction: "Medium" },
    { name: "Global Systems", conversations: 32, satisfaction: "High" },
    { name: "Innovation Labs", conversations: 28, satisfaction: "Medium" }
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Insights into your communication performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-white rounded-lg border border-gray-200">
            {["day", "week", "month", "quarter"].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "ghost"}
                size="sm"
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
          
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 bg-${metric.color}-100 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${metric.color}-600`} />
                </div>
                <Badge 
                  variant={metric.trend === "up" ? "default" : "secondary"}
                  className={metric.trend === "up" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                >
                  {metric.change}
                </Badge>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                <p className="text-sm text-gray-600">{metric.title}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h3>
          <div className="space-y-4">
            {platformStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.platform} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">{stat.platform}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">
                      {stat.conversations}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Customers */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
          <div className="space-y-4">
            {topCustomers.map((customer, index) => (
              <div key={customer.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{customer.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge 
                    variant="outline"
                    className={customer.satisfaction === "High" ? "text-green-700 border-green-300" : "text-yellow-700 border-yellow-300"}
                  >
                    {customer.satisfaction}
                  </Badge>
                  <span className="text-sm font-medium text-gray-600">
                    {customer.conversations} conversations
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Generated Reports</h3>
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Report
          </Button>
        </div>
        
        <div className="space-y-3">
          {[
            { name: "Weekly Communication Summary", date: "March 15, 2024", type: "PDF", size: "2.3 MB" },
            { name: "Customer Satisfaction Report", date: "March 10, 2024", type: "CSV", size: "856 KB" },
            { name: "Platform Performance Analysis", date: "March 8, 2024", type: "PDF", size: "1.7 MB" }
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{report.name}</h4>
                <p className="text-sm text-gray-500">{report.date} • {report.type} • {report.size}</p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
