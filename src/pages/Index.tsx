
import { useState } from "react";
import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { ConversationList } from "@/components/conversations/ConversationList";
import { ConversationView } from "@/components/conversations/ConversationView";
import { CustomerPanel } from "@/components/customers/CustomerPanel";
import { ReportsView } from "@/components/reports/ReportsView";
import { IntegrationsView } from "@/components/integrations/IntegrationsView";
import { TelegramMTProtoView } from "@/components/telegram/TelegramMTProtoView";
import type { Conversation } from "@/hooks/useConversations";

const Index = () => {
  const [activeView, setActiveView] = useState("conversations");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);

  // Listen for navigation events
  React.useEffect(() => {
    const handleNavigateToTelegram = () => {
      setActiveView("telegram");
    };

    window.addEventListener('navigate-to-telegram', handleNavigateToTelegram);
    return () => window.removeEventListener('navigate-to-telegram', handleNavigateToTelegram);
  }, []);

  const renderMainContent = () => {
    switch (activeView) {
      case "conversations":
        return (
          <div className="flex h-full">
            <div className="w-1/3 border-r">
              <ConversationList 
                onSelectConversation={setSelectedConversation}
                selectedId={selectedConversation?.id}
              />
            </div>
            <div className="flex-1">
              <ConversationView 
                conversation={selectedConversation}
                onShowCustomer={() => setShowCustomerPanel(true)}
              />
            </div>
          </div>
        );
      case "reports":
        return <ReportsView />;
      case "integrations":
        return <IntegrationsView onNavigateToTelegram={() => setActiveView("telegram")} />;
      case "telegram":
        return <TelegramMTProtoView />;
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-hidden">
          {renderMainContent()}
        </main>
      </div>

      {showCustomerPanel && (
        <CustomerPanel 
          customer={selectedConversation?.customer}
          onClose={() => setShowCustomerPanel(false)}
        />
      )}
    </div>
  );
};

export default Index;
