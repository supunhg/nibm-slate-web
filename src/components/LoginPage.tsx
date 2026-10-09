'use client';

import React, { useState } from 'react';
import { Lock, User as UserIcon, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { loginAction } from '@/lib/actions';
import { AppLogo } from './AppLogo';
import { ThemeToggle } from './ThemeToggle';

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#080b12] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-colors relative">
      {/* Top Floating Theme Switcher */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
        {/* NIBM Emblem */}
        <AppLogo className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          SLATE
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Instructor Roster Portal • School of Computing, NIBM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm px-4 sm:px-0">
        <div className="bg-white dark:bg-[#11192d] py-8 px-6 shadow-sm dark:shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-5 transition-colors">
          {/* PUBLIC ACCESS BUTTON (NO LOGIN REQUIRED) */}
          <button
            type="button"
            onClick={onOpenPublicBoard}
            className="w-full text-left bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-xl transition-all group cursor-pointer flex items-center justify-between active:scale-[0.99]"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-700 flex items-center justify-center text-indigo-600 dark:text-slate-300 shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  View Live Status Board
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  No login required • Public view
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="absolute bg-white dark:bg-[#11192d] px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Staff Sign In
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="yourusername"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-[#080b12] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-[#080b12] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <span>{busy ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-500">
          SLATE • NIBM Technical Cadre Operational System
        </p>
      </div>
    </div>
  );
};
