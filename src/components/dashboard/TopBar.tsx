
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Bell, 
  Filter, 
  RefreshCw,
  Plus 
} from "lucide-react";

export const TopBar = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search conversations, customers, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          3 Active Integrations
        </Badge>
        
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync
        </Button>
        
        <Button variant="outline" size="sm">
          <Bell className="w-4 h-4" />
        </Button>
        
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>
    </div>
  );
};
