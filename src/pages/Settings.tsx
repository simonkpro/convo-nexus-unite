import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Save, Key, ExternalLink } from 'lucide-react';

export const Settings = () => {
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');

  useEffect(() => {
    // Load saved credentials
    const savedApiId = localStorage.getItem('telegram_api_id');
    const savedApiHash = localStorage.getItem('telegram_api_hash');
    if (savedApiId) setApiId(savedApiId);
    if (savedApiHash) setApiHash(savedApiHash);
  }, []);

  const handleSave = () => {
    if (!apiId || !apiHash) {
      toast.error('Please enter both API ID and API Hash');
      return;
    }

    localStorage.setItem('telegram_api_id', apiId);
    localStorage.setItem('telegram_api_hash', apiHash);
    toast.success('Telegram credentials saved!');
  };

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Configure your application settings and API credentials</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Telegram API Credentials</h2>
          </div>
          
          <p className="text-sm text-gray-600">
            To use Telegram MTProto, you need to get your API credentials from my.telegram.org
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiId">API ID</Label>
              <Input
                id="apiId"
                type="number"
                value={apiId}
                onChange={(e) => setApiId(e.target.value)}
                placeholder="Enter your API ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiHash">API Hash</Label>
              <Input
                id="apiHash"
                value={apiHash}
                onChange={(e) => setApiHash(e.target.value)}
                placeholder="Enter your API Hash"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => window.open('https://my.telegram.org', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Get API Credentials
              </Button>

              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Credentials
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};