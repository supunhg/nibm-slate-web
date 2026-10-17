'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { User } from '@/types';
import {
  Activity,
  CalendarDays,
  CalendarPlus,
  Users,
  CalendarRange,
  ClipboardCheck,
  LogOut,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Check,
  ChevronDown,
  Download,
  UserRound,
  Sun,
  Moon,
  Monitor,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { usePWA } from '@/context/PWAContext';
import { useTheme, Theme } from '@/context/ThemeContext';

export type AppTab = 'executive' | 'weekly' | 'planner' | 'instructor' | 'applyLeave' | 'whosAway' | 'leaves' | 'admin' | 'profile';

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

type NavItem = { tab: AppTab; label: string; short: string; icon: LucideIcon; badge?: number };

const ROLE_LABEL: Record<User['role'], string> = {
  ADMIN: 'Administrator',
  DEMONSTRATOR: 'Demonstrator',
  EXECUTIVE: 'Executive',
  INSTRUCTOR: 'Instructor',
  GUEST: 'Guest',
};

function navItemsFor(user: User, pendingLeaves: number): NavItem[] {
  const { role } = user;
  const items: NavItem[] = [];
  if (role === 'INSTRUCTOR') {
    items.push({ tab: 'instructor', label: 'My Schedule', short: 'Schedule', icon: CalendarDays });
    items.push({ tab: 'applyLeave', label: 'Apply for Leave', short: 'Apply leave', icon: CalendarPlus });
    items.push({ tab: 'whosAway', label: "Who's Away", short: "Who's away", icon: Users });
  }
  if (role === 'EXECUTIVE' || role === 'DEMONSTRATOR' || role === 'ADMIN') {
    items.push({ tab: 'executive', label: role === 'EXECUTIVE' ? 'Cockpit' : 'Live Status', short: 'Today', icon: Activity });
    items.push({ tab: 'weekly', label: 'Week Schedule', short: 'Week', icon: CalendarRange });
  }
  if (role === 'DEMONSTRATOR' || role === 'ADMIN') {
    items.push({ tab: 'planner', label: 'Planning Studio', short: 'Planner', icon: LayoutDashboard });
  }
  if (role === 'DEMONSTRATOR' || role === 'EXECUTIVE' || role === 'ADMIN') {
    items.push({ tab: 'leaves', label: 'Leave', short: 'Leave', icon: ClipboardCheck, badge: pendingLeaves });
  }
  if (role === 'ADMIN') {
    items.push({ tab: 'admin', label: 'Staff & Access', short: 'Staff', icon: ShieldCheck });
  }
  return items;
}

const REFRESH_OPTIONS = [
  { label: 'Live (5s)', value: 5 },
  { label: '10 seconds', value: 10 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: 'Manual only', value: 0 },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'Auto', icon: Monitor },
];

function useClickOutside(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, close]);
}

const menuPanel =
  'absolute right-0 top-full z-50 mt-2 origin-top-right animate-pop-in rounded-2xl border border-neutral-200 bg-white/95 p-1.5 text-xs shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#141414]/95';
const menuItem =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/[0.06]';

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
  const [syncOpen, setSyncOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const syncRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const { isInstallable, isInstalled, installPwa, syncPush } = usePWA();

  // Signed in: make sure this device's push subscription belongs to this user.
  useEffect(() => {
    syncPush();
  }, [syncPush, currentUser.id]);
  const { theme, setTheme } = useTheme();

  useClickOutside(syncRef, syncOpen, () => setSyncOpen(false));
  useClickOutside(accountRef, accountOpen, () => setAccountOpen(false));

  const items = navItemsFor(currentUser, pendingLeavesCount);
  const canSetGlobal = currentUser.role === 'ADMIN' || currentUser.role === 'DEMONSTRATOR';
  const live = (autoRefreshSeconds ?? 0) > 0;
  const initials = currentUser.fullName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Slide the desktop nav pill under the active tab (DOM write only, no state).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const pill = indicatorRef.current;
    if (!nav || !pill) return;
    const place = () => {
      const active = nav.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) {
        pill.style.opacity = '0';
        return;
      }
      pill.style.opacity = '1';
      pill.style.width = `${active.offsetWidth}px`;
      pill.style.transform = `translateX(${active.offsetLeft}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [activeTab, items.length]);

  const handleLogoutClick = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } catch {
      // logoutAction redirects on success; only a genuine failure lands here.
      setLoggingOut(false);
    }
  };

  // Phones: the same tabs move to a bottom bar. Profile lives in the account menu (top right).
  const bottomItems = items;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-colors dark:border-white/[0.06] dark:bg-[#0a0a0a]/80 print:hidden">
        {/* Three columns (brand | nav | account) so the nav pill is truly centred on desktop. */}
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr] lg:px-8">
          {/* Brand */}
          <button
            type="button"
            onClick={() => items[0] && onSelectTab(items[0].tab)}
            className="pressable -ml-1 flex items-center gap-2.5 justify-self-start rounded-xl px-1 py-1"
            aria-label="SLATE home"
          >
            <AppLogo className="size-8 shrink-0" />
            <span className="flex flex-col items-start leading-none">
              <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">SLATE</span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-neutral-500 sm:block">NIBM School of Computing</span>
            </span>
          </button>

          {/* Desktop navigation: segmented pill with a sliding indicator */}
          <nav aria-label="Primary" className="hidden min-w-0 justify-center md:flex">
            <div
              ref={navRef}
              className="no-scrollbar relative flex items-center gap-0.5 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-100/70 p-1 dark:border-white/[0.06] dark:bg-white/[0.03]"
            >
              <span
                ref={indicatorRef}
                aria-hidden
                className="absolute left-0 top-1 bottom-1 rounded-lg bg-white opacity-0 shadow-sm transition-[transform,width,opacity] duration-300 ease-[var(--ease-soft)] dark:bg-white/[0.1] dark:shadow-none"
              />
              {items.map((item) => {
                const isActive = activeTab === item.tab;
                const Icon = item.icon;
                return (
                  <button
                    key={item.tab}
                    type="button"
                    data-active={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onSelectTab(item.tab)}
                    className={`relative z-10 flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors duration-200 ${
                      isActive
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden">{item.short}</span>
                    {!!item.badge && (
                      <span className="ml-0.5 min-w-4 animate-pop-in rounded-full bg-indigo-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="ml-auto flex items-center justify-end gap-1.5">
            {/* Live sync status */}
            {autoRefreshSeconds !== undefined && onChangeAutoRefreshSeconds && (
              <div className="relative" ref={syncRef}>
                <button
                  type="button"
                  onClick={() => setSyncOpen((v) => !v)}
                  aria-expanded={syncOpen}
                  aria-label={live ? `Live sync every ${autoRefreshSeconds} seconds` : 'Live sync off'}
                  className="btn btn-ghost h-9 gap-2 px-2.5"
                >
                  <span className="relative flex size-2">
                    {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
                    <span className={`relative inline-flex size-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-neutral-600'}`} />
                  </span>
                  <span className="hidden text-[11px] sm:inline">{live ? 'Live' : 'Paused'}</span>
                  {isRefreshing && <RefreshCw className="animate-spin text-neutral-400" />}
                </button>

                {syncOpen && (
                  <div className={`${menuPanel} w-64`}>
                    <div className="px-2.5 pb-2 pt-1.5">
                      <div className="flex items-center justify-between font-semibold text-neutral-900 dark:text-white">
                        Live sync
                        {lastRefreshedAt && (
                          <span className="font-mono text-[10px] font-normal text-neutral-500">
                            {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-neutral-500">How often schedules refresh in the background.</p>
                    </div>
                    <div className="space-y-0.5 border-t border-neutral-100 pt-1.5 dark:border-white/[0.06]">
                      {REFRESH_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onChangeAutoRefreshSeconds(opt.value, false);
                            setSyncOpen(false);
                          }}
                          className={`${menuItem} justify-between`}
                        >
                          {opt.label}
                          {autoRefreshSeconds === opt.value && <Check className="size-3.5 text-neutral-900 dark:text-white" />}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1.5 flex gap-1.5 border-t border-neutral-100 pt-1.5 dark:border-white/[0.06]">
                      {onManualRefresh && (
                        <button
                          type="button"
                          onClick={() => {
                            onManualRefresh();
                            setSyncOpen(false);
                          }}
                          className="btn btn-secondary btn-sm flex-1"
                        >
                          <RefreshCw className={isRefreshing ? 'animate-spin' : ''} /> Refresh now
                        </button>
                      )}
                      {canSetGlobal && (
                        <button
                          type="button"
                          disabled={savingGlobal}
                          onClick={async () => {
                            setSavingGlobal(true);
                            try {
                              await onChangeAutoRefreshSeconds(autoRefreshSeconds, true);
                            } finally {
                              setSavingGlobal(false);
                              setSyncOpen(false);
                            }
                          }}
                          className="btn btn-ghost btn-sm flex-1"
                          title="Use this rate as the default for everyone"
                        >
                          {savingGlobal ? 'Saving…' : 'Set as default'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Account menu */}
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-label="Account menu"
                className={`pressable flex h-9 cursor-pointer items-center gap-2 rounded-xl border pl-1 pr-2 transition-colors ${
                  activeTab === 'profile' || accountOpen
                    ? 'border-neutral-300 bg-neutral-100 dark:border-white/15 dark:bg-white/[0.08]'
                    : 'border-neutral-200 hover:bg-neutral-100 dark:border-white/[0.08] dark:hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-neutral-900 text-[10px] font-semibold text-white dark:bg-white dark:text-neutral-950">
                  {initials}
                </span>
                <span className="hidden max-w-32 truncate text-xs font-medium text-neutral-800 lg:block dark:text-neutral-200">
                  {currentUser.fullName}
                </span>
                <ChevronDown
                  className={`size-3.5 text-neutral-400 transition-transform duration-200 ease-[var(--ease-soft)] ${accountOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {accountOpen && (
                <div className={`${menuPanel} w-64`}>
                  <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-1.5">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-950">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{currentUser.fullName}</div>
                      <div className="text-[11px] text-neutral-500">{ROLE_LABEL[currentUser.role]}</div>
                    </div>
                  </div>
                  <div className="border-t border-neutral-100 pt-1.5 dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('profile');
                        setAccountOpen(false);
                      }}
                      className={menuItem}
                    >
                      <UserRound className="size-4 text-neutral-400" /> Profile & security
                    </button>
                    {isInstallable && !isInstalled && (
                      <button
                        type="button"
                        onClick={() => {
                          installPwa();
                          setAccountOpen(false);
                        }}
                        className={menuItem}
                      >
                        <Download className="size-4 text-neutral-400" /> Install app
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 border-t border-neutral-100 px-1 pb-1 pt-2.5 dark:border-white/[0.06]">
                    <div className="eyebrow mb-1.5 px-1.5">Appearance</div>
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-white/[0.04]">
                      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTheme(value)}
                          aria-pressed={theme === value}
                          className={`flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                            theme === value
                              ? 'bg-white text-neutral-900 shadow-sm dark:bg-white/[0.12] dark:text-white'
                              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <Icon className="size-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-1.5 border-t border-neutral-100 pt-1.5 dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      disabled={loggingOut}
                      className={`${menuItem} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10`}
                    >
                      {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                      {loggingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Phone navigation: bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:border-white/[0.06] dark:bg-[#0a0a0a]/90 print:hidden"
      >
        <ul className="mx-auto flex h-16 max-w-md items-stretch px-1">
          {bottomItems.map((item) => {
            const isActive = activeTab === item.tab;
            const Icon = item.icon;
            return (
              <li key={item.tab} className="flex flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(8);
                    onSelectTab(item.tab);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex flex-1 cursor-pointer select-none flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                    isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'
                  }`}
                >
                  <span
                    className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300 ease-[var(--ease-soft)] group-active:scale-90 ${
                      isActive ? 'bg-neutral-900/[0.07] dark:bg-white/[0.1]' : ''
                    }`}
                  >
                    <Icon className={`size-5 ${isActive ? 'stroke-[2.25]' : ''}`} />
                    {!!item.badge && (
                      <span className="absolute right-2.5 top-0.5 min-w-4 animate-pop-in rounded-full bg-indigo-500 px-1 text-center text-[9px] font-semibold leading-4 text-white">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span className={isActive ? 'font-semibold' : ''}>{item.short}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
