import { useState } from 'react';
import { TelegramLogin } from './TelegramLogin';
import { TelegramChats } from './TelegramChats';
import { useTelegramMTProto } from '@/hooks/useTelegramMTProto';

export const TelegramMTProtoView = () => {
  const { session } = useTelegramMTProto();
  const [showLogin, setShowLogin] = useState(!session.isLoggedIn);

  const handleLoginComplete = () => {
    setShowLogin(false);
  };

  const handleLogout = () => {
    setShowLogin(true);
  };

  if (showLogin || !session.isLoggedIn) {
    return <TelegramLogin onLoginComplete={handleLoginComplete} />;
  }

  return <TelegramChats onLogout={handleLogout} />;
};