import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, Shield, Key } from "lucide-react";
import { useTelegramMTProto } from "@/hooks/useTelegramMTProto";

interface TelegramLoginProps {
  onLoginComplete: () => void;
}

export const TelegramLogin = ({ onLoginComplete }: TelegramLoginProps) => {
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFAPassword, setTwoFAPassword] = useState('');
  
  // Load saved credentials on mount
  useEffect(() => {
    const savedApiId = localStorage.getItem('telegram_api_id');
    const savedApiHash = localStorage.getItem('telegram_api_hash');
    if (savedApiId) setApiId(savedApiId);
    if (savedApiHash) setApiHash(savedApiHash);
  }, []);
  
  const {
    loading,
    loginStep,
    sendPhoneNumber,
    verifyPhoneCode,
    verify2FA,
    initializeClient
  } = useTelegramMTProto();

  const handleSendPhoneNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiId || !apiHash || !phoneNumber) {
      return;
    }
    await sendPhoneNumber(phoneNumber, parseInt(apiId), apiHash);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) return;
    await verifyPhoneCode(verificationCode);
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFAPassword) return;
    await verify2FA(twoFAPassword);
  };

  const handleInitializeWithSession = async () => {
    if (!apiId || !apiHash) return;
    const savedSession = localStorage.getItem('telegram_session');
    if (savedSession) {
      await initializeClient(parseInt(apiId), apiHash, savedSession);
      onLoginComplete();
    }
  };

  if (loginStep === 'complete') {
    onLoginComplete();
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Connect to Telegram</h2>
          <p className="text-gray-600 mt-2">
            Login using your Telegram account with MTProto
          </p>
        </div>

        {loginStep === 'phone' && (
          <form onSubmit={handleSendPhoneNumber} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiId">API ID</Label>
              <Input
                id="apiId"
                type="number"
                value={apiId}
                onChange={(e) => setApiId(e.target.value)}
                placeholder="Get from my.telegram.org"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiHash">API Hash</Label>
              <Input
                id="apiHash"
                value={apiHash}
                onChange={(e) => setApiHash(e.target.value)}
                placeholder="Get from my.telegram.org"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Phone className="w-4 h-4 mr-2" />
              )}
              Send Verification Code
            </Button>

            {localStorage.getItem('telegram_session') && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={handleInitializeWithSession}
                disabled={loading}
              >
                Use Saved Session
              </Button>
            )}
          </form>
        )}

        {loginStep === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold">Enter Verification Code</h3>
              <p className="text-gray-600">
                We sent a code to your Telegram app
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="12345"
                maxLength={5}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Verify Code
            </Button>
          </form>
        )}

        {loginStep === '2fa' && (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div className="text-center">
              <Key className="w-12 h-12 mx-auto text-orange-600 mb-4" />
              <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
              <p className="text-gray-600">
                Enter your 2FA password
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twoFAPassword">2FA Password</Label>
              <Input
                id="twoFAPassword"
                type="password"
                value={twoFAPassword}
                onChange={(e) => setTwoFAPassword(e.target.value)}
                placeholder="Enter your 2FA password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Key className="w-4 h-4 mr-2" />
              )}
              Verify 2FA
            </Button>
          </form>
        )}

        <div className="text-center text-sm text-gray-500">
          <p>
            Get your API ID and Hash from{' '}
            <a 
              href="https://my.telegram.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              my.telegram.org
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};