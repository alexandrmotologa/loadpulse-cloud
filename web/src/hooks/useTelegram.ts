import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export function useTelegram() {
  const [isTelegram, setIsTelegram] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setIsTelegram(Boolean(tg.initData));
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
    }
  }, []);

  const triggerHaptic = useCallback((type: 'impact' | 'success' | 'error' | 'warning' = 'impact') => {
    const haptic = window.Telegram?.WebApp?.HapticFeedback;
    if (!haptic) return;

    try {
      if (type === 'impact') {
        haptic.impactOccurred('medium');
      } else if (type === 'success' || type === 'error' || type === 'warning') {
        haptic.notificationOccurred(type);
      }
    } catch {
      // Ignore if unsupported
    }
  }, []);

  const closeApp = useCallback(() => {
    window.Telegram?.WebApp?.close();
  }, []);

  return {
    tg: window.Telegram?.WebApp,
    isTelegram,
    user,
    triggerHaptic,
    closeApp,
  };
}
