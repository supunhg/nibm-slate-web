'use client';

import React, { useState } from 'react';
import { usePWA } from '@/context/PWAContext';
import { Download, Share, X, WifiOff, RefreshCw, Smartphone } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    isOffline,
    isUpdateAvailable,
    isIOS,
    installPwa,
    applyUpdate,
  } = usePWA();

  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    setInstalling(true);
    await installPwa();
    setInstalling(false);
  };

  return (
    <>
      {/* Offline Status Pill */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 text-xs px-3 py-1 font-semibold flex items-center justify-center space-x-1.5 shadow-sm transition-all animate-in slide-in-from-top-2">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>You are currently offline. Viewing cached roster & sessions.</span>
        </div>
      )}

      {/* Auto-Update Ready Notification */}
      {isUpdateAvailable && (
        <div className="bg-indigo-600 text-white text-xs px-4 py-2 font-medium flex items-center justify-between shadow-md transition-all">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-indigo-200" />
            <span>A new version of SLATE is ready.</span>
          </div>
          <button
            type="button"
            onClick={applyUpdate}
            className="px-2.5 py-1 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 active:scale-95 transition-all text-[11px] cursor-pointer"
          >
            Update Now
          </button>
        </div>
      )}

      {/* Install App Prompt (Shown when not installed and not dismissed) */}
      {!isInstalled && (isInstallable || isIOS) && !dismissed && (
        <aside
          aria-label="Install SLATE web application"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-white dark:bg-[#11192d] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xl z-50 transition-all animate-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
                S
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  Install SLATE App
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Zero downloads. Instant launch from your home screen.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 cursor-pointer transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center space-x-2">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={installing}
              className="flex-1 h-8 flex items-center justify-center space-x-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isIOS ? (
                <>
                  <Share className="w-3.5 h-3.5" />
                  <span>Add to Home Screen</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{installing ? 'Installing...' : 'Install App'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer active:scale-95"
            >
              Not Now
            </button>
          </div>
        </aside>
      )}

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#11192d] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Install on iPhone / iPad</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-3 list-decimal list-inside leading-relaxed">
              <li>
                In Safari, tap the <strong className="text-slate-900 dark:text-white">Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-indigo-500" /> at the bottom bar.
              </li>
              <li>
                Scroll down and tap <strong className="text-slate-900 dark:text-white">&ldquo;Add to Home Screen&rdquo;</strong>.
              </li>
              <li>
                Tap <strong className="text-slate-900 dark:text-white">&ldquo;Add&rdquo;</strong> in the top-right corner.
              </li>
            </ol>

            <button
              type="button"
              onClick={() => {
                setShowIOSModal(false);
                setDismissed(true);
              }}
              className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
