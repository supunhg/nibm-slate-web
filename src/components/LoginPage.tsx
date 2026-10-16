'use client';

import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, AlertCircle, Loader2, Radio } from 'lucide-react';
import { loginAction } from '@/lib/actions';
import { AppLogo } from './AppLogo';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onOpenPublicBoard: () => void;
  isRefreshing?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenPublicBoard, isRefreshing }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = submitting || !!isRefreshing;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await loginAction(username, password);

    if (!res.success) {
      setSubmitting(false);
      setError(res.error);
      return;
    }
    onLoginSuccess();
    setSubmitting(false);
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-neutral-50 font-sans dark:bg-[#0a0a0a]">
      {/* Soft top glow for depth on the black canvas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(0,0,0,0.05),transparent)] dark:bg-[radial-gradient(60%_100%_at_50%_0%,rgba(255,255,255,0.07),transparent)]"
      />

      <main className="relative flex flex-1 flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-page-in">
          <div className="flex flex-col items-center text-center">
            <AppLogo className="size-14 drop-shadow-xl" />
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Sign in to SLATE</h1>
            <p className="mt-1.5 text-sm text-neutral-500">Instructor roster · NIBM School of Computing</p>
          </div>

          <form onSubmit={handleFormSubmit} className="mt-8 space-y-4">
            {error && (
              <div
                role="alert"
                className="flex animate-pop-in items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-username" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="e.g. yasith"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="field h-11 text-base sm:text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field h-11 pr-11 text-base sm:text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="btn btn-ghost btn-icon absolute right-1 top-1/2 size-9 -translate-y-1/2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={busy} className="btn btn-primary btn-lg mt-2 w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy && <ArrowRight className="size-4" />}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200 dark:bg-white/[0.08]" />
            or
            <span className="h-px flex-1 bg-neutral-200 dark:bg-white/[0.08]" />
          </div>

          <button
            type="button"
            onClick={onOpenPublicBoard}
            className="pressable group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 text-left hover:border-neutral-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.05]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Radio className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-neutral-900 dark:text-white">Live status board</span>
              <span className="block text-xs text-neutral-500">Who&rsquo;s on duty right now · no sign-in</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-neutral-400 transition-transform duration-200 ease-[var(--ease-soft)] group-hover:translate-x-0.5" />
          </button>
        </div>
      </main>

      <footer className="relative pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-center text-[11px] text-neutral-500">
        SLATE · National Institute of Business Management
      </footer>
    </div>
  );
};
