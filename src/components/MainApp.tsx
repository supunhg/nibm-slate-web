'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, RosterWeek, DutyAssignment, NightShift, LeaveRequest, ExecutiveStatusReport, AcademicCatalog } from '@/types';
import { Header, AppTab } from '@/components/Header';
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';
import { SundayPlanner } from '@/components/SundayPlanner';
import { InstructorPortal } from '@/components/InstructorPortal';
import { LeaveManagement } from '@/components/LeaveManagement';
import { LoginPage } from '@/components/LoginPage';
import { PublicStatusBoard } from '@/components/PublicStatusBoard';
import { WeeklyScheduleView } from '@/components/WeeklyScheduleView';
import { ChangePasswordScreen } from '@/components/ChangePasswordScreen';
import { AdminUserManagement } from '@/components/AdminUserManagement';
import { ProfileSettings } from '@/components/ProfileSettings';
import { DialogProvider } from '@/components/DialogProvider';
import { getAppData, logoutAction, updateAutoRefreshIntervalAction } from '@/lib/actions';
import { addDaysYmd } from '@/lib/week-start';
import { rosterWeekStart } from '@/lib/roster-week';

interface MainAppProps {
  initialData: {
    users: User[];
    instructors: User[];
    rosterWeek: RosterWeek;
    dutyAssignments: DutyAssignment[];
    nightShifts: NightShift[];
    leaveRequests: LeaveRequest[];
    executiveReport: ExecutiveStatusReport;
    catalog: AcademicCatalog;
    /** Dates in the loaded week covered by a Published Roster Week. */
    publishedDates: string[];
  };
  initialCurrentUser: User | null;
}

function defaultTabForRole(user: User | null): AppTab {
  if (!user) return 'planner';
  if (user.role === 'INSTRUCTOR') return 'instructor';
  if (user.role === 'EXECUTIVE') return 'executive';
  if (user.role === 'ADMIN') return 'executive'; // Live Status first; Staff & Access is one tap away
  return 'planner';
}

export const MainApp: React.FC<MainAppProps> = ({ initialData, initialCurrentUser }) => {
  const router = useRouter();
  // router.refresh() re-runs the server component (a handful of sequential
  // DB round-trips) but is otherwise invisible on its own -- useTransition
  // gives us `isSessionRefreshing` so login/password-change/profile screens
  // can keep showing a pending state for the *entire* refresh, not just the
  // fast server-action call that precedes it.
  const [isSessionRefreshing, startSessionRefresh] = useTransition();
  const refreshSession = () => startSessionRefresh(() => router.refresh());
  const [data, setData] = useState(initialData);
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>(() => defaultTabForRole(initialCurrentUser));
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(data.rosterWeek.startDate);
  // The week the server resolved as "this week" on load; instructors can flip to the one after it.
  const [currentWeekStart] = useState<string>(initialData.rosterWeek.startDate);
  const [isWeekLoading, setIsWeekLoading] = useState(false);

  // Auto-refresh state (defaults to system setting in catalog, e.g. 5s)
  const defaultInterval = data.catalog.autoRefreshSeconds ?? 5;
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('slate_auto_refresh_seconds');
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    }
    return defaultInterval;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(() => new Date());

  // Handle changing refresh interval (admin can also update global system setting)
  const handleChangeRefreshInterval = async (seconds: number, updateGlobal = false) => {
    setAutoRefreshSeconds(seconds);
    if (typeof window !== 'undefined') {
      localStorage.setItem('slate_auto_refresh_seconds', seconds.toString());
    }
    if (updateGlobal && (initialCurrentUser?.role === 'ADMIN' || initialCurrentUser?.role === 'DEMONSTRATOR')) {
      try {
        await updateAutoRefreshIntervalAction(seconds);
      } catch (err) {
        console.error('Failed to update global auto-refresh setting:', err);
      }
    }
  };

  // Handle tab navigation with browser history support
  // History is pushed outside the state updater: updaters must stay pure, and
  // pushState inside one updates the Next router mid-render.
  const handleSelectTab = useCallback(
    (newTab: AppTab) => {
      if (activeTab === newTab) return;
      window.history.pushState({ tab: newTab }, '', window.location.pathname);
      setActiveTab(newTab);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    },
    [activeTab],
  );

  // Listen to browser/hardware back button (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setActiveTab(e.state.tab as AppTab);
      } else {
        // Returned to root: navigate back to default landing tab for user's role
        setActiveTab(defaultTabForRole(initialCurrentUser));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialCurrentUser]);

  // The server resolves the session on every request; whenever a different
  // user arrives via props (login, logout, router.refresh()), reset the
  // active tab to that user's default landing tab.
  const [prevUserId, setPrevUserId] = useState<string | null>(initialCurrentUser?.id ?? null);
  if ((initialCurrentUser?.id ?? null) !== prevUserId) {
    setPrevUserId(initialCurrentUser?.id ?? null);
    setActiveTab(defaultTabForRole(initialCurrentUser));
  }

  const currentUser = initialCurrentUser;

  const handleLogout = async () => {
    await logoutAction();
  };

  const handleWeekChange = async (requestedDate: string) => {
    const newStartDate = rosterWeekStart(requestedDate);
    setSelectedWeekStart(newStartDate);
    setIsWeekLoading(true);
    try {
      const refreshed = await getAppData(newStartDate);
      setData(refreshed);
    } catch (err) {
      console.error('Failed to load week data:', err);
    } finally {
      setIsWeekLoading(false);
    }
  };

  const inFlightRef = useRef(false);

  const handleRefresh = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setIsRefreshing(true);
      const refreshed = await getAppData(selectedWeekStart);
      setData(refreshed);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
    }
  };

  // Background polling for sessions and night shifts (every N seconds)
  useEffect(() => {
    if (autoRefreshSeconds <= 0) return;

    let isMounted = true;
    const intervalMs = autoRefreshSeconds * 1000;

    const intervalId = setInterval(async () => {
      // Don't poll when tab is hidden in background
      if (typeof document !== 'undefined' && document.hidden) return;
      if (inFlightRef.current) return; // Prevent concurrent stacking
      inFlightRef.current = true;

      try {
        setIsRefreshing(true);
        const refreshed = await getAppData(selectedWeekStart);
        if (isMounted) {
          setData(refreshed);
          setLastRefreshedAt(new Date());
        }
      } catch (err) {
        console.error('Auto-refresh poll failed:', err);
      } finally {
        inFlightRef.current = false;
        if (isMounted) {
          setIsRefreshing(false);
        }
      }
    }, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [autoRefreshSeconds, selectedWeekStart]);

  // Immediate refresh when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && autoRefreshSeconds > 0) {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        try {
          setIsRefreshing(true);
          const refreshed = await getAppData(selectedWeekStart);
          setData(refreshed);
          setLastRefreshedAt(new Date());
        } catch (err) {
          console.error('Visibility refresh failed:', err);
        } finally {
          inFlightRef.current = false;
          setIsRefreshing(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoRefreshSeconds, selectedWeekStart]);

  // 1. Unauthenticated Public Status Board (No Login Required)
  if (isPublicMode) {
    return (
      <PublicStatusBoard
        initialReport={data.executiveReport}
        onOpenLogin={() => setIsPublicMode(false)}
      />
    );
  }

  // 2. Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={refreshSession}
        isRefreshing={isSessionRefreshing}
        onOpenPublicBoard={() => setIsPublicMode(true)}
      />
    );
  }

  // 3. Forced password change for admin-issued temp-password accounts
  if (currentUser.mustChangePassword) {
    return (
      <ChangePasswordScreen
        currentUser={currentUser}
        onDone={refreshSession}
        isRefreshing={isSessionRefreshing}
      />
    );
  }

  const pendingLeaves = data.leaveRequests.filter((l) => l.status === 'PENDING');

  const isInstructor = currentUser.role === 'INSTRUCTOR';
  const isExecutive = currentUser.role === 'EXECUTIVE';
  const isDemonstrator = currentUser.role === 'DEMONSTRATOR';
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <DialogProvider>
      <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a] flex flex-col font-sans antialiased text-neutral-900 dark:text-neutral-100 transition-colors duration-150 print:bg-white print:text-slate-900 print:min-h-0">
        {/* Header with Role Restraints */}
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          pendingLeavesCount={pendingLeaves.length}
          autoRefreshSeconds={autoRefreshSeconds}
          onChangeAutoRefreshSeconds={handleChangeRefreshInterval}
          isRefreshing={isRefreshing}
          onManualRefresh={handleRefresh}
          lastRefreshedAt={lastRefreshedAt}
        />

        {/* Main Container: Strictly Renders Authorized Views */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10 flex-1 w-full print:max-w-none print:p-0 print:m-0 print:w-full">
          {/* Keyed on the tab so each switch plays the page-in transition. */}
          <div key={activeTab} className="animate-page-in print:animate-none">
          {/* 1. Instructor Portal: ONLY for Instructors */}
          {isInstructor && (activeTab === 'instructor' || activeTab === 'applyLeave' || activeTab === 'whosAway') && (
            <InstructorPortal
              section={activeTab === 'applyLeave' ? 'applyLeave' : activeTab === 'whosAway' ? 'teamLeaves' : 'schedule'}
              currentUser={currentUser}
              allInstructors={data.instructors}
              dutyAssignments={data.dutyAssignments}
              nightShifts={data.nightShifts}
              leaveRequests={data.leaveRequests}
              rosterWeek={data.rosterWeek}
              onRefresh={handleRefresh}
              publishedDates={data.publishedDates}
              week={selectedWeekStart === currentWeekStart ? 'this' : 'next'}
              isWeekLoading={isWeekLoading}
              onSelectWeek={(w) => handleWeekChange(w === 'this' ? currentWeekStart : addDaysYmd(currentWeekStart, 7))}
            />
          )}

          {/* 2. Dr. Thisara's Executive Cockpit: For Executive, Demonstrator & Admin */}
          {(isExecutive || isDemonstrator || isAdmin) && activeTab === 'executive' && (
            <ExecutiveDashboard
              currentUser={currentUser}
              initialReport={data.executiveReport}
              pendingLeaves={pendingLeaves}
              allInstructors={data.instructors}
              rosterWeek={data.rosterWeek}
              dutyAssignments={data.dutyAssignments}
              nightShifts={data.nightShifts}
              leaveRequests={data.leaveRequests}
              onRefresh={handleRefresh}
              onWeekChange={handleWeekChange}
              initialViewMode="daily"
            />
          )}

          {/* 3. Entire Week Master Schedule: For Executive, Demonstrator & Admin */}
          {(isExecutive || isDemonstrator || isAdmin) && activeTab === 'weekly' && (
            <WeeklyScheduleView
              rosterWeek={data.rosterWeek}
              dutyAssignments={data.dutyAssignments}
              nightShifts={data.nightShifts}
              leaveRequests={data.leaveRequests}
              allInstructors={data.instructors}
              onWeekChange={handleWeekChange}
              publishedDates={data.publishedDates}
              onSelectDateForCockpit={() => {
                handleSelectTab('executive');
              }}
            />
          )}

          {/* 3. Yasith's Sunday Planning Studio: For Demonstrator & Admin */}
          {(isDemonstrator || isAdmin) && activeTab === 'planner' && (
            <SundayPlanner
              rosterWeek={data.rosterWeek}
              dutyAssignments={data.dutyAssignments}
              nightShifts={data.nightShifts}
              leaveRequests={data.leaveRequests}
              allInstructors={data.instructors}
              catalog={data.catalog}
              onRefresh={handleRefresh}
              onWeekChange={handleWeekChange}
              publishedDates={data.publishedDates}
            />
          )}

          {/* 4. Leave Approvals Console: For Demonstrator, Executive & Admin */}
          {(isDemonstrator || isExecutive || isAdmin) && activeTab === 'leaves' && (
            <LeaveManagement
              currentUser={currentUser}
              leaveRequests={data.leaveRequests}
              onRefresh={handleRefresh}
            />
          )}

          {/* 5. Admin Console: ONLY for Admin */}
          {isAdmin && activeTab === 'admin' && <AdminUserManagement currentUser={currentUser} />}

          {/* 6. My Profile: every signed-in user can edit their own contact info */}
          {activeTab === 'profile' && (
            <ProfileSettings
              currentUser={currentUser}
              onUpdated={refreshSession}
              onBack={() => handleSelectTab(defaultTabForRole(currentUser))}
              isRefreshing={isSessionRefreshing}
            />
          )}
          </div>
        </main>

        {/* Footer (desktop; phones have the bottom tab bar) */}
        <footer className="hidden md:block border-t border-neutral-200 dark:border-white/[0.06] py-5 text-[11px] text-neutral-500 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
            <span>SLATE · NIBM School of Computing</span>
            <span>
              Signed in as <span className="font-medium text-neutral-700 dark:text-neutral-300">{currentUser.fullName}</span>
            </span>
          </div>
        </footer>
      </div>
    </DialogProvider>
  );
};
