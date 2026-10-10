'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isUpdateAvailable: boolean;
  isIOS: boolean;
  installPwa: () => Promise<boolean>;
  applyUpdate: () => void;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  notificationPermission: NotificationPermission;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  isOffline: false,
  isUpdateAvailable: false,
  isIOS: false,
  installPwa: async () => false,
  applyUpdate: () => {},
  requestNotificationPermission: async () => 'default',
  notificationPermission: 'default',
});

export const usePWA = () => useContext(PWAContext);

// --- useSyncExternalStore Helpers for Browser State ---

// 1. Offline tracking
function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}
function getOfflineSnapshot(): boolean {
  return typeof navigator !== 'undefined' ? !navigator.onLine : false;
}
function getOfflineServerSnapshot(): boolean {
  return false;
}

// 2. Standalone (Installed) tracking
function subscribeStandalone(callback: () => void) {
  const mql = window.matchMedia('(display-mode: standalone)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}
function getStandaloneSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
function getStandaloneServerSnapshot(): boolean {
  return false;
}

// 3. iOS Safari detection
function getIOSSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isApple = /iphone|ipad|ipod/.test(userAgent);
  const isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isApple && !isStandalone;
}
function getIOSServerSnapshot(): boolean {
  return false;
}
const noopSubscribe = () => () => {};

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const isOffline = useSyncExternalStore(subscribeOnline, getOfflineSnapshot, getOfflineServerSnapshot);
  const isInstalled = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, getStandaloneServerSnapshot);
  const isIOS = useSyncExternalStore(noopSubscribe, getIOSSnapshot, getIOSServerSnapshot);

  // Capture beforeinstallprompt event for Android Chrome & Desktop PWA
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Register Service Worker and manage lifecycle
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        swRegistrationRef.current = reg;

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available; tell worker to skip waiting
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                setIsUpdateAvailable(true);
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service worker registration failed:', err);
      });

    // When the controlling service worker changes, new version is active
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        setIsUpdateAvailable(false);
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Periodically check for updates when returning to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update().catch(() => {});
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Trigger native install prompt
  const installPwa = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.error('[PWA] Install error:', err);
    }
    return false;
  }, [deferredPrompt]);

  // Apply update (reload window to get latest assets)
  const applyUpdate = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  // Request Web Push notification permission
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      return permission;
    } catch (err) {
      console.warn('[PWA] Permission request failed:', err);
      return 'denied';
    }
  }, []);

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isOffline,
        isUpdateAvailable,
        isIOS,
        installPwa,
        applyUpdate,
        requestNotificationPermission,
        notificationPermission: permissionState,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};
