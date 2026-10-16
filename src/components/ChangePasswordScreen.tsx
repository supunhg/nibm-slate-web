'use client';

import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '@/types';
import { changePasswordAction } from '@/lib/actions';

interface ChangePasswordScreenProps {
  currentUser: User;
  onDone: () => void;
  isRefreshing?: boolean;
}

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({ currentUser, onDone, isRefreshing }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = submitting || !!isRefreshing;
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    const res = await changePasswordAction(currentPassword, newPassword);

    if (!res.success) {
      setSubmitting(false);
      setError(res.error || 'Failed to change password.');
      return;
    }
    // Same reasoning as the login form: keep the button pinned to its busy
    // state through the parent's session refresh, not just this call.
    onDone();
    setSubmitting(false);
  };

  return (
    <div className="min-h-dvh bg-neutral-50 dark:bg-[#0a0a0a] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="animate-page-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-200">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Set a new password</h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Hi {currentUser.fullName.split(' ')[0]}, this account was created with a temporary password. Choose a new one to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm px-4 sm:px-0">
        <div className="surface-card space-y-5 px-5 py-6 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex animate-pop-in items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Temporary Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="field h-11 w-full pr-11 text-base sm:text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  tabIndex={-1}
                  className="btn btn-ghost btn-icon absolute right-1 top-1/2 size-9 -translate-y-1/2"
                  title={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="field h-11 w-full pr-11 text-base sm:text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  tabIndex={-1}
                  className="btn btn-ghost btn-icon absolute right-1 top-1/2 size-9 -translate-y-1/2"
                  title={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="field h-11 w-full pr-11 text-base sm:text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  className="btn btn-ghost btn-icon absolute right-1 top-1/2 size-9 -translate-y-1/2"
                  title={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary btn-lg w-full"
            >
              <span>{busy ? 'Saving…' : 'Save and continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
};
