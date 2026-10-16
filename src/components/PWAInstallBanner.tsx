'use client';

import React, { useState } from 'react';
import { usePWA } from '@/context/PWAContext';
import { Download, Share, X, WifiOff, RefreshCw, Smartphone, Sparkles } from 'lucide-react';
import { AppLogo } from './AppLogo';

// Floating cards sit above the phone bottom navigation bar.
const floatingPosition =
  'fixed left-3 right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:left-auto sm:right-6 sm:w-[22rem] z-[60]';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isOffline, isUpdateAvailable, isIOS, installPwa, applyUpdate, dismissUpdate } =
    usePWA();

  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    setInstalling(true);
    await installPwa();
    setInstalling(false);
  };

  const handleUpdate = () => {
    setUpdating(true);
    applyUpdate();
  };

  return (
    <>
      {/* Offline pill */}
      {isOffline && (
        <div
          role="status"
          className="fixed left-1/2 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] flex -translate-x-1/2 animate-pop-in items-center gap-1.5 rounded-full border border-amber-500/30 bg-neutral-950/90 px-3 py-1.5 text-[11px] font-semibold text-amber-300 shadow-lg backdrop-blur-md print:hidden"
        >
          <WifiOff className="size-3.5 shrink-0" />
          You&rsquo;re offline. Changes will sync when you reconnect.
        </div>
      )}

      {/* New version available: one tap to reload onto it */}
      {isUpdateAvailable && (
        <aside
          role="alertdialog"
          aria-labelledby="slate-update-title"
          className={`${floatingPosition} animate-toast-in rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#141414]/95 print:hidden`}
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 id="slate-update-title" className="text-sm font-semibold text-neutral-900 dark:text-white">
                Update available
              </h4>
              <p className="mt-0.5 text-xs leading-snug text-neutral-500 dark:text-neutral-400">
                A new version of SLATE is ready. Reload to get the latest improvements.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissUpdate}
              aria-label="Remind me later"
              className="btn btn-ghost btn-icon -mr-1.5 -mt-1.5 size-8"
            >
              <X />
            </button>
          </div>
          <div className="mt-3.5 flex gap-2">
            <button type="button" onClick={dismissUpdate} className="btn btn-secondary flex-1">
              Later
            </button>
            <button type="button" onClick={handleUpdate} disabled={updating} className="btn btn-primary flex-1">
              <RefreshCw className={updating ? 'animate-spin' : ''} />
              {updating ? 'Updating…' : 'Reload now'}
            </button>
          </div>
        </aside>
      )}

      {/* Install prompt (hidden while an update prompt is showing) */}
      {!isUpdateAvailable && !isInstalled && (isInstallable || isIOS) && !dismissed && (
        <aside
          aria-label="Install SLATE"
          className={`${floatingPosition} animate-toast-in rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#141414]/95 print:hidden`}
        >
          <div className="flex items-start gap-3">
            <AppLogo className="size-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Install SLATE</h4>
              <p className="mt-0.5 text-xs leading-snug text-neutral-500 dark:text-neutral-400">
                Launch from your home screen, full screen, with automatic updates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="btn btn-ghost btn-icon -mr-1.5 -mt-1.5 size-8"
            >
              <X />
            </button>
          </div>
          <div className="mt-3.5 flex gap-2">
            <button type="button" onClick={() => setDismissed(true)} className="btn btn-secondary flex-1">
              Not now
            </button>
            <button type="button" onClick={handleInstallClick} disabled={installing} className="btn btn-primary flex-1">
              {isIOS ? <Share /> : <Download />}
              {isIOS ? 'Add to Home Screen' : installing ? 'Installing…' : 'Install'}
            </button>
          </div>
        </aside>
      )}

      {/* iOS instructions */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-[80] flex animate-fade-in items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-sm animate-sheet-up space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#141414]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
                <Smartphone className="size-4" />
                Install on iPhone or iPad
              </div>
              <button type="button" onClick={() => setShowIOSModal(false)} aria-label="Close" className="btn btn-ghost btn-icon size-8">
                <X />
              </button>
            </div>
            <ol className="list-inside list-decimal space-y-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
              <li>
                In Safari, tap <strong className="text-neutral-900 dark:text-white">Share</strong>
                <Share className="mx-1 inline size-3.5" /> in the toolbar.
              </li>
              <li>
                Choose <strong className="text-neutral-900 dark:text-white">Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong className="text-neutral-900 dark:text-white">Add</strong>.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => {
                setShowIOSModal(false);
                setDismissed(true);
              }}
              className="btn btn-primary btn-lg w-full"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
