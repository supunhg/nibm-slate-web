'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';
import { getWebPushConfigAction, saveWebPushSubscriptionAction } from '@/lib/actions';

function base64UrlToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Register this browser for Web Push and store the subscription server-side.
 * Idempotent: safe to call on every app start (keeps the server copy fresh,
 * and re-subscribes if the server's VAPID key changed). No-op when the server
 * has no VAPID keys configured or the user hasn't granted permission.
 */
async function syncWebPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || Notification.permission !== 'granted') return false;
  const { enabled, publicKey } = await getWebPushConfigAction();
  if (!enabled || !publicKey) return false;
  const reg = await navigator.serviceWorker.ready;
  const key = base64UrlToUint8Array(publicKey);
  let sub = await reg.pushManager.getSubscription();
  const current = sub?.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
  if (sub && current && (current.length !== key.length || current.some((b, i) => b !== key[i]))) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const res = await saveWebPushSubscriptionAction(json);
  return res.success;
}

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
  dismissUpdate: () => void;
  /** Re-register this browser for push (call after sign-in). */
  syncPush: () => void;
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
  dismissUpdate: () => {},
  syncPush: () => {},
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

  // Service worker + deployment update detection.
  //
  // Two signals, either of which shows the "update available" prompt:
  //  1. The worker is registered as /sw.js?v=<buildId>, so every deploy is a
  //     new script URL and the browser installs the new worker. It then
  //     *waits* (no auto skipWaiting) until the user taps Reload.
  //  2. /api/version is polled on focus and every few minutes. This catches
  //     deploys in plain browser tabs and on browsers that throttle worker
  //     update checks.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const buildId = process.env.NEXT_PUBLIC_BUILD_ID;
    let cancelled = false;

    const watchWorker = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) setIsUpdateAvailable(true);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !cancelled) {
            setIsUpdateAvailable(true);
          }
        });
      });
    };

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
      // Dev chunks aren't content-hashed, so a caching worker serves stale code.
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    } else if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(buildId ?? 'dev')}`, { updateViaCache: 'none' })
        .then((reg) => {
          swRegistrationRef.current = reg;
          watchWorker(reg);
          syncWebPushSubscription().catch((err) => console.warn('[PWA] Web push re-sync failed:', err));
        })
        .catch((err) => console.warn('[PWA] Service worker registration failed:', err));
    }

    const checkForDeploy = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      swRegistrationRef.current?.update().catch(() => {});
      if (!buildId || buildId.startsWith('local-')) return;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId: live } = (await res.json()) as { buildId?: string };
        if (live && live !== 'unknown' && live !== buildId && !cancelled) setIsUpdateAvailable(true);
      } catch {
        // Offline or transient network error: try again next tick.
      }
    };

    const interval = window.setInterval(checkForDeploy, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', checkForDeploy);
    window.addEventListener('online', checkForDeploy);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', checkForDeploy);
      window.removeEventListener('online', checkForDeploy);
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

  // Activate the waiting worker (if any), then reload onto the new deployment.
  const applyUpdate = useCallback(() => {
    if (typeof window === 'undefined') return;
    const reload = () => window.location.reload();
    const waiting = swRegistrationRef.current?.waiting;
    if (waiting && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
      waiting.postMessage({ type: 'SKIP_WAITING' });
      // Fallback if the worker never takes control (e.g. it failed to activate).
      window.setTimeout(reload, 1500);
    } else {
      reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => setIsUpdateAvailable(false), []);

  const syncPush = useCallback(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') return;
    syncWebPushSubscription().catch((err) => console.warn('[PWA] Web push re-sync failed:', err));
  }, []);

  // Request Web Push notification permission
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission === 'granted') {
        syncWebPushSubscription().catch((err) => console.warn('[PWA] Web push subscription failed:', err));
      }
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
        dismissUpdate,
        syncPush,
        requestNotificationPermission,
        notificationPermission: permissionState,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};
