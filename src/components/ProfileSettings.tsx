'use client';

import React, { useState } from 'react';
import { Mail, Phone, Lock, CheckCircle2, AlertCircle, UserCircle, Eye, EyeOff, ArrowLeft, Bell, Smartphone, Download, Check, Shield } from 'lucide-react';
import { User } from '@/types';
import { updateProfileAction, changePasswordAction } from '@/lib/actions';
import { usePWA } from '@/context/PWAContext';

const ROLE_LABELS: Record<User['role'], string> = {
  ADMIN: 'System Administrator',
  DEMONSTRATOR: 'Demonstrator (Roster Master)',
  EXECUTIVE: 'Executive / Director',
  INSTRUCTOR: 'Instructor',
  GUEST: 'Guest',
};

interface ProfileSettingsProps {
  currentUser: User;
  onUpdated: () => void;
  onBack?: () => void;
  isRefreshing?: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, onUpdated, onBack, isRefreshing }) => {
  const { isInstalled, isInstallable, installPwa, notificationPermission, requestNotificationPermission } = usePWA();
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const busyContact = savingContact || !!isRefreshing;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(false);
    setSavingContact(true);
    const res = await updateProfileAction({ email, phone });

    if (!res.success) {
      setSavingContact(false);
      setContactError(res.error);
      return;
    }
    setContactSuccess(true);
    onUpdated();
    setSavingContact(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    const res = await changePasswordAction(currentPassword, newPassword);
    setSavingPassword(false);

    if (!res.success) {
      setPasswordError(res.error || 'Failed to change password.');
      return;
    }
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Define role access permissions for the overview card
  const rolePermissions: Record<User['role'], string[]> = {
    INSTRUCTOR: [
      'Personal lecture & duty schedule access',
      'Overnight campus caretaker rotation (Night Duty)',
      'Self-service holiday & leave applications',
      '1-Click Calendar Sync (.ICS & Google Calendar)',
      'PWA offline caching & instant launch',
    ],
    DEMONSTRATOR: [
      'Flexible 7-Day Planning Studio (Any start date)',
      'Cadre workload balancer & session duplicates',
      'WhatsApp automated schedule dispatcher',
      'Academic catalog & lab management',
      'Weekly roster publishing authority',
    ],
    EXECUTIVE: [
      'Live Operational Readiness Cockpit (3-Bucket View)',
      'Master 7-day academic cadre timetable',
      'Dual reviewing authority for leave approvals',
      'Overnight caretaker monitoring & callouts',
      'Governance & audit log review',
    ],
    ADMIN: [
      'Full administrative access & system configuration',
      'Staff account management & credential resets',
      'Academic catalog & venue room control',
      'Database health & automated schedule solver',
      'Full publishing & leave approval rights',
    ],
    GUEST: [
      'Read-only operational status access',
    ],
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Navigation & Breadcrumb */}
      {onBack && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0d1424] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 group"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Schedule & Tasks</span>
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
            Personal Account Settings
          </span>
        </div>
      )}

      {/* Hero Profile Banner (Full Width) */}
      <div className="bg-white dark:bg-[#0d1424] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
            {currentUser.fullName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <UserCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Personal Account Profile</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
              {currentUser.fullName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono text-slate-700 dark:text-slate-300">@{currentUser.username}</span>
              <span>•</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {currentUser.jobTitle || ROLE_LABELS[currentUser.role]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {ROLE_LABELS[currentUser.role]}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Cadre</span>
          </span>
        </div>
      </div>

      {/* 2-Column Responsive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left Column: Contact Info + App & Notification Preferences */}
        <div className="space-y-6">
          {/* Contact Information Card */}
          <div className="bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
              <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Contact Information</span>
            </h3>
            <form onSubmit={handleSaveContact} className="space-y-4">
              {contactError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{contactError}</span>
                </div>
              )}
              {contactSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Contact details saved.</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setContactSuccess(false);
                      }}
                      placeholder="you@nibm.lk"
                      className="w-full text-sm bg-slate-50 dark:bg-[#080b12] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 dark:text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setContactSuccess(false);
                      }}
                      placeholder="071 234 5678"
                      className="w-full text-sm bg-slate-50 dark:bg-[#080b12] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={busyContact}
                className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {busyContact ? 'Saving...' : 'Save Contact Info'}
              </button>
            </form>
          </div>

          {/* App & Notification Preferences Card */}
          <div className="bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>App & Notification Preferences</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* PWA Mode Status */}
              <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/60 dark:bg-[#080b12] flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Application Mode</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isInstalled
                      ? 'Running as installed standalone application with offline caching.'
                      : 'Running in web browser mode. Install for instant home screen launch.'}
                  </p>
                </div>
                <div className="mt-3">
                  {isInstalled ? (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                      <Check className="w-3 h-3" />
                      <span>Installed PWA</span>
                    </span>
                  ) : isInstallable ? (
                    <button
                      type="button"
                      onClick={() => installPwa()}
                      className="h-7 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95 inline-flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Install App</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">Available via browser menu</span>
                  )}
                </div>
              </div>

              {/* Web Push Status */}
              <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/60 dark:bg-[#080b12] flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    <span>Web Push Alerts</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Receive instant system alerts when Sunday roster is published or night shifts are assigned.
                  </p>
                </div>
                <div className="mt-3">
                  {notificationPermission === 'granted' ? (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                      <Check className="w-3 h-3" />
                      <span>Alerts Active</span>
                    </span>
                  ) : notificationPermission === 'denied' ? (
                    <span className="text-[11px] font-medium text-rose-500 dark:text-rose-400">
                      Blocked in browser settings
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => requestNotificationPermission()}
                      className="h-7 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95 inline-flex items-center space-x-1"
                    >
                      <Bell className="w-3 h-3" />
                      <span>Enable Alerts</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security & Password + Role Access Scope */}
        <div className="space-y-6">
          {/* Security & Password Card */}
          <div className="bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Change Password</span>
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Password changed successfully.</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-[#080b12] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    title={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 chars"
                      className="w-full text-sm bg-slate-50 dark:bg-[#080b12] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      title={showNew ? 'Hide password' : 'Show password'}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-[#080b12] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      title={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {savingPassword ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Role & Access Scope Card */}
          <div className="bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Role Permissions & Access Scope</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authorized capabilities granted to your account as a <span className="font-semibold text-slate-700 dark:text-slate-200">{ROLE_LABELS[currentUser.role]}</span>:
            </p>
            <div className="space-y-2 pt-1">
              {(rolePermissions[currentUser.role] || rolePermissions.INSTRUCTOR).map((perm, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
