'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User } from '@/types';
import {
  Shield,
  Calendar,
  Users,
  Clock,
  LogOut,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Check,
  ChevronDown,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { ThemeToggle } from './ThemeToggle';
import { usePWA } from '@/context/PWAContext';

export type AppTab = 'executive' | 'weekly' | 'planner' | 'instructor' | 'leaves' | 'admin' | 'profile';

interface HeaderProps {
  currentUser: User;
  onLogout: () => Promise<void>;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  pendingLeavesCount: number;
  autoRefreshSeconds?: number;
  onChangeAutoRefreshSeconds?: (seconds: number, updateGlobal?: boolean) => Promise<void> | void;
  isRefreshing?: boolean;
  onManualRefresh?: () => Promise<void> | void;
  lastRefreshedAt?: Date;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  activeTab,
  onSelectTab,
  pendingLeavesCount,
  autoRefreshSeconds,
  onChangeAutoRefreshSeconds,
  isRefreshing,
  onManualRefresh,
  lastRefreshedAt,
}) => {
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshMenuOpen, setRefreshMenuOpen] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isInstallable, isInstalled, installPwa } = usePWA();

  // Close auto-refresh dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRefreshMenuOpen(false);
      }
    };
    if (refreshMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refreshMenuOpen]);

  const refreshIntervalOptions = [
    { label: '5s (Recommended / Live)', value: 5 },
    { label: '10s', value: 10 },
    { label: '15s', value: 15 },
    { label: '30s', value: 30 },
    { label: '60s (1 min)', value: 60 },
    { label: 'Off (Manual only)', value: 0 },
  ];

  const handleLogoutClick = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } catch {
      // logoutAction redirects on success (no error here); only a genuine
      // failure reaches this catch, so re-enable the button to allow retry.
      setLoggingOut(false);
    }
  };

  const isInstructor = currentUser.role === 'INSTRUCTOR';
  const isExecutive = currentUser.role === 'EXECUTIVE';
  const isDemonstrator = currentUser.role === 'DEMONSTRATOR';
  const isAdmin = currentUser.role === 'ADMIN';

  const tabClass = (isActive: boolean) =>
    `flex items-center space-x-2 px-3.5 py-2 rounded-lg font-medium text-xs transition-all whitespace-nowrap cursor-pointer select-none ${
      isActive
        ? 'bg-indigo-600 text-white shadow-xs font-semibold dark:bg-indigo-500/25 dark:text-indigo-200 dark:border dark:border-indigo-500/40'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
    }`;

  return (
    <header className="bg-white/95 dark:bg-[#0d1424]/95 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-50 print:hidden backdrop-blur-md transition-colors">
      {/* Top Bar: Brand + Logged-in User Profile & Logout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Institute Branding */}
          <div className="flex items-center space-x-3">
            <AppLogo className="h-8.5 w-8.5 shrink-0" />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  SLATE
                </h1>
                <span className="hidden sm:inline-block text-[11px] text-slate-500 font-medium">
                  School of Computing
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
                Instructor Roster & Task Allocation • National Institute of Business Management
              </p>
            </div>
          </div>

          {/* User Profile Badge, Theme Switcher & Actions */}
          <div className="flex items-center space-x-2">
            {/* Auto-Refresh Live Indicator & Selector */}
            {autoRefreshSeconds !== undefined && onChangeAutoRefreshSeconds && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setRefreshMenuOpen(!refreshMenuOpen)}
                  title="Configure auto-refresh interval"
                  className={`h-8 flex items-center space-x-1.5 px-2.5 rounded-lg border transition-all cursor-pointer text-xs font-medium active:scale-95 ${
                    autoRefreshSeconds > 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {autoRefreshSeconds > 0 && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        autoRefreshSeconds > 0 ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
                      }`}
                    ></span>
                  </span>
                  <RefreshCw
                    className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}
                  />
                  <span className="font-semibold hidden sm:inline">
                    {autoRefreshSeconds > 0 ? `${autoRefreshSeconds}s` : 'Off'}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {refreshMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden"
                      onClick={() => setRefreshMenuOpen(false)}
                    />
                    <div className="fixed inset-x-4 top-20 sm:absolute sm:inset-auto sm:right-0 sm:top-full mt-2 sm:w-64 max-w-xs mx-auto sm:mx-0 bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1.5 border-b border-slate-150 dark:border-slate-800 mb-1.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>Auto-Refresh Rate</span>
                        {isRefreshing && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Syncing...
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        <span>Sessions update in background</span>
                        {lastRefreshedAt && (
                          <span className="text-slate-400 dark:text-slate-500 font-mono text-[9px]">
                            {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      {refreshIntervalOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onChangeAutoRefreshSeconds(opt.value, false);
                            setRefreshMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            autoRefreshSeconds === opt.value
                              ? 'bg-indigo-50 dark:bg-purple-600/20 text-indigo-700 dark:text-purple-300 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {autoRefreshSeconds === opt.value && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-purple-400" />}
                        </button>
                      ))}
                    </div>

                    {/* Admin Global Default Controls */}
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'DEMONSTRATOR') && (
                      <div className="mt-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                        <button
                          type="button"
                          disabled={savingGlobal}
                          onClick={async () => {
                            setSavingGlobal(true);
                            try {
                              await onChangeAutoRefreshSeconds(autoRefreshSeconds, true);
                            } finally {
                              setSavingGlobal(false);
                              setRefreshMenuOpen(false);
                            }
                          }}
                          className="w-full text-center py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {savingGlobal ? 'Saving...' : `Set ${autoRefreshSeconds}s as Default for All Users`}
                        </button>
                      </div>
                    )}

                    {/* Manual Refresh Now Button */}
                    {onManualRefresh && (
                      <div className="mt-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            onManualRefresh();
                            setRefreshMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                          <span>Refresh Now</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

            {/* PWA Install Button (desktop / mobile browser before installation) */}
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={() => installPwa()}
                title="Install SLATE as a Desktop / Mobile App"
                className="h-8 flex items-center space-x-1.5 px-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Install App</span>
              </button>
            )}

            {/* Theme Switcher Toggle (Light, Obsidian Velvet Dark, System) */}
            <ThemeToggle />

            {/* Profile Avatar / Settings Button */}
            {(() => {
              const defaultReturnTab: AppTab = isInstructor
                ? 'instructor'
                : (isExecutive || isDemonstrator || isAdmin)
                ? 'executive'
                : 'instructor';

              return (
                <button
                  onClick={() => onSelectTab(activeTab === 'profile' ? defaultReturnTab : 'profile')}
                  title={activeTab === 'profile' ? "Return to Schedule & Dashboard" : "My Profile & Settings"}
                  className={`h-8 flex items-center space-x-2 px-2.5 rounded-lg border transition-all cursor-pointer select-none active:scale-95 ${
                    activeTab === 'profile'
                      ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-400 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-200 font-semibold shadow-xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className={`w-5.5 h-5.5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                    activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {currentUser.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-semibold leading-tight text-slate-900 dark:text-white">
                      {currentUser.fullName}
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* Logout Button */}
            <button
              onClick={handleLogoutClick}
              disabled={loggingOut}
              className="h-8 flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 px-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              title="Sign Out"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline font-medium">{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role-Restricted Navigation Tabs */}
      <div className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080b12]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-1.5 overflow-x-auto py-1.5 text-xs font-medium">
          {/* TAB: BACK TO SCHEDULE / DASHBOARD (Shown prominently when in Profile) */}
          {activeTab === 'profile' && (
            <button
              onClick={() => onSelectTab(isInstructor ? 'instructor' : (isExecutive || isDemonstrator || isAdmin) ? 'executive' : 'instructor')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white shadow-xs font-bold shrink-0 hover:bg-indigo-500 transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {isInstructor ? 'My Schedule' : 'Dashboard'}</span>
            </button>
          )}

          {/* TAB: INSTRUCTOR PORTAL (Visible ONLY to Instructors) */}
          {isInstructor && (
            <button onClick={() => onSelectTab('instructor')} className={tabClass(activeTab === 'instructor')}>
              <Users className="w-4 h-4" />
              <span>My Teaching Schedule & Leave Portal</span>
            </button>
          )}

          {/* TAB: DR. THISARA'S COCKPIT (Visible to Executive, Demonstrator & Admin) */}
          {(isExecutive || isDemonstrator || isAdmin) && (
            <button onClick={() => onSelectTab('executive')} className={tabClass(activeTab === 'executive')}>
              <Shield className="w-4 h-4" />
              <span>{isExecutive ? "Today's Executive Cockpit" : 'Live Daily Status'}</span>
            </button>
          )}

          {/* TAB: ENTIRE WEEK MASTER SCHEDULE (Visible to Executive, Demonstrator & Admin) */}
          {(isExecutive || isDemonstrator || isAdmin) && (
            <button onClick={() => onSelectTab('weekly')} className={tabClass(activeTab === 'weekly')}>
              <Calendar className="w-4 h-4" />
              <span>Entire Week Schedule</span>
            </button>
          )}

          {/* TAB: SUNDAY PLANNING STUDIO (Visible to Demonstrator & Admin) */}
          {(isDemonstrator || isAdmin) && (
            <button onClick={() => onSelectTab('planner')} className={tabClass(activeTab === 'planner')}>
              <Calendar className="w-4 h-4" />
              <span>Sunday Planning Studio</span>
            </button>
          )}

          {/* TAB: LEAVE CENTRAL (Visible to Demonstrator, Executive & Admin for Approvals) */}
          {(isDemonstrator || isExecutive || isAdmin) && (
            <button onClick={() => onSelectTab('leaves')} className={`${tabClass(activeTab === 'leaves')} relative`}>
              <Clock className="w-4 h-4" />
              <span>Leave Approvals</span>
              {pendingLeavesCount > 0 && (
                <span className="bg-indigo-500 text-white font-semibold text-[10px] leading-none px-1.5 py-1 rounded-full ml-1">
                  {pendingLeavesCount}
                </span>
              )}
            </button>
          )}

          {/* TAB: ADMIN CONSOLE (Visible ONLY to Admin) */}
          {isAdmin && (
            <button onClick={() => onSelectTab('admin')} className={tabClass(activeTab === 'admin')}>
              <ShieldCheck className="w-4 h-4" />
              <span>Staff & Access Management</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
