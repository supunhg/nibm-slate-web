'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface NotifyOptions {
  title?: string;
  message: string;
  danger?: boolean;
}

interface DialogContextValue {
  // Resolves true/false instead of blocking the thread like window.confirm.
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
  // Single-button replacement for window.alert.
  notify: (opts: NotifyOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type PendingDialog =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'notify'; opts: NotifyOptions; resolve: () => void };

// App-wide replacement for window.confirm/window.alert: those render as
// native OS chrome (see e.g. Safari's blocking "Deactivate Test?" sheet)
// which looks out of place next to the rest of this dark, custom UI. Mount
// once near the app root; any descendant calls useDialog() to pop a
// dark-themed modal instead.
export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingDialog | null>(null);
  // Portals need document.body, which doesn't exist during SSR -- only
  // render the portal once mounted client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const normalized = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise((resolve) => setPending({ kind: 'confirm', opts: normalized, resolve }));
  }, []);

  const notify = useCallback((opts: NotifyOptions | string): Promise<void> => {
    const normalized = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise((resolve) => setPending({ kind: 'notify', opts: normalized, resolve: () => resolve() }));
  }, []);

  const close = (result: boolean) => {
    if (!pending) return;
    if (pending.kind === 'confirm') pending.resolve(result);
    else pending.resolve();
    setPending(null);
  };

  // Escape cancels, like the native dialog it replaces.
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pending.kind === 'confirm') pending.resolve(false);
        else pending.resolve();
        setPending(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const dialog = pending ? (
    <div
      className="fixed inset-0 z-[100] flex animate-fade-in items-end justify-center bg-black/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={pending.opts.title ? 'slate-dialog-title' : undefined}
        aria-describedby="slate-dialog-message"
        className="w-full max-w-sm animate-sheet-up rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:animate-pop-in dark:border-white/10 dark:bg-[#141414]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex size-10 items-center justify-center rounded-xl ${
            pending.opts.danger
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : 'bg-neutral-100 text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-200'
          }`}
        >
          {pending.opts.danger ? <AlertTriangle className="size-5" /> : <Info className="size-5" />}
        </div>
        {pending.opts.title && (
          <h3 id="slate-dialog-title" className="mt-4 text-base font-semibold text-neutral-900 dark:text-white">
            {pending.opts.title}
          </h3>
        )}
        <p
          id="slate-dialog-message"
          className={`${pending.opts.title ? 'mt-1' : 'mt-4'} whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-400`}
        >
          {pending.opts.message}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {pending.kind === 'confirm' && (
            <button onClick={() => close(false)} className="btn btn-secondary btn-lg sm:h-9 sm:px-4 sm:text-xs">
              {pending.opts.cancelLabel || 'Cancel'}
            </button>
          )}
          <button
            onClick={() => close(true)}
            autoFocus
            className={`btn btn-lg sm:h-9 sm:px-4 sm:text-xs ${
              pending.opts.danger ? 'bg-rose-600 text-white hover:bg-rose-500' : 'btn-primary'
            }`}
          >
            {pending.kind === 'confirm' ? pending.opts.confirmLabel || 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <DialogContext.Provider value={{ confirm, notify }}>
      {children}
      {/* Portalled straight to <body> so no ancestor's stacking context,
          transform, or filter can ever break this modal's fixed positioning
          or clip its width -- both symptoms observed when it was rendered
          inline in the component tree. */}
      {mounted && dialog && createPortal(dialog, document.body)}
    </DialogContext.Provider>
  );
};

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within a DialogProvider');
  return ctx;
}
