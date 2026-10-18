'use client';
import { Select } from './ui/Select';
import { Segmented } from './ui/Segmented';

import { PageHeader, StatusPill } from './ui/PageHeader';
import React, { useState, useSyncExternalStore } from 'react';

// window.location.origin read through useSyncExternalStore: the server snapshot
// is null and the client one is real, so React re-renders the calendar links
// with absolute URLs after hydration instead of leaving the server's '#'.
const noopSubscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => null;
import { User, DutyAssignment, NightShift, LeaveRequest, RosterWeek } from '@/types';
import {
  Calendar,
  CalendarClock,
  Clock,
  Moon,
  MapPin,
  Send,
  CheckCircle2,
  AlertCircle,
  Filter,
  UserCheck,
  Users,
  Phone,
  CalendarPlus,
  Link2,
  Download,
  Info,
  Loader2,
  Undo2,
} from 'lucide-react';
import { submitLeaveAction, withdrawLeaveAction } from '@/lib/actions';
import { mergeDutyAssignments, formatApplicationDateTime } from '@/lib/roster-utils';
import { useDialog } from './DialogProvider';
import { DateRangePicker } from './ui/DatePicker';
import { todayYmd, addDaysYmd } from '@/lib/week-start';

interface InstructorPortalProps {
  currentUser: User;
  allInstructors: User[];
  dutyAssignments: DutyAssignment[];
  nightShifts: NightShift[];
  leaveRequests: LeaveRequest[];
  rosterWeek: RosterWeek;
  onRefresh: () => void;
  /** Which Roster Week the schedule shows: the current one or the next. */
  week: 'this' | 'next';
  /** Dates in the loaded week covered by a Published Roster Week. */
  publishedDates: string[];
  isWeekLoading?: boolean;
  onSelectWeek: (week: 'this' | 'next') => void;
  /** Which part of the portal to show; driven by the main app navigation. */
  section: InstructorSection;
}

export type InstructorSection = 'schedule' | 'applyLeave' | 'teamLeaves';

const SECTION_COPY: Record<InstructorSection, { eyebrow: string; title?: string; description: string }> = {
  schedule: { eyebrow: 'My schedule', description: 'Your duties and Night Duty for the week.' },
  applyLeave: { eyebrow: 'Leave', title: 'Apply for leave', description: 'Request time off. Approved leave blocks Duty and Night Duty automatically.' },
  teamLeaves: { eyebrow: 'Team', title: "Who's away", description: 'Approved leave across the cadre. Check coverage before you apply.' },
};

export const InstructorPortal: React.FC<InstructorPortalProps> = ({
  currentUser,
  allInstructors,
  dutyAssignments: loadedDuties,
  nightShifts: loadedNightShifts,
  leaveRequests,
  rosterWeek,
  onRefresh,
  section,
  week,
  publishedDates,
  isWeekLoading = false,
  onSelectWeek,
}) => {
  // Draft plans haven't been announced yet (GLOSSARY.md), so next week only
  // shows the days a Published Roster Week covers. Weeks can start on any
  // day, so this is checked per date. This week shows as before.
  const published = new Set(publishedDates);
  const dutyAssignments = week === 'next' ? loadedDuties.filter((d) => published.has(d.dutyDate)) : loadedDuties;
  const nightShifts = week === 'next' ? loadedNightShifts.filter((n) => published.has(n.shiftDate)) : loadedNightShifts;
  const nextWeekUnpublished = week === 'next' && publishedDates.length === 0;
  const unpublishedNextDays =
    week === 'next' && !nextWeekUnpublished
      ? Array.from({ length: 7 }, (_, i) => addDaysYmd(rosterWeek.startDate, i)).filter((d) => !published.has(d))
      : [];
  const shortDate = (ymd: string) =>
    new Date(`${ymd}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const { notify, confirm } = useDialog();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  // Withdrawal (GLOSSARY.md): own Pending or not-yet-ended Approved leave.
  const handleWithdraw = async (leave: LeaveRequest) => {
    const ok = await confirm({
      title: 'Withdraw this leave?',
      message: `${leave.startDate}${leave.startDate !== leave.endDate ? ` to ${leave.endDate}` : ''} will be cancelled${leave.status === 'APPROVED' ? ' and you become available for duty again' : ''}.`,
      confirmLabel: 'Withdraw',
      danger: true,
    });
    if (!ok) return;
    setWithdrawingId(leave.id);
    try {
      const res = await withdrawLeaveAction(leave.id);
      if (!res.success) await notify({ title: 'Could not withdraw', message: res.error, danger: true });
      onRefresh();
    } finally {
      setWithdrawingId(null);
    }
  };
  // The "instructors" account is the one shared kiosk login used by
  // whoever's physically at the terminal; every other account here belongs
  // to one real person, so the header shouldn't call it a shared terminal.
  const isSharedKiosk = currentUser.username === 'instructors';
  const activeSubTab = section;
  // Selected instructor filter for viewing tasks -- defaults to "just me"
  // for a real individual account, and the full roster for the shared kiosk.
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>(isSharedKiosk ? 'ALL' : currentUser.id);
  // Who's away filters
  const [awayPeriod, setAwayPeriod] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [awayInstructor, setAwayInstructor] = useState<string>('ALL');
  const [awayMonth, setAwayMonth] = useState<string>('ALL');

  // Leave Form State -- filed strictly for the currently authenticated instructor
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedLinkCopied, setFeedLinkCopied] = useState(false);

  // Absolute .ics feed URL for the currently filtered instructor (Google Calendar
  // and webcal:// subscriptions both need a fully-qualified URL, not a relative path).
  const origin = useSyncExternalStore(noopSubscribe, getOrigin, getServerOrigin);
  const getCalendarFeedUrl = (instId: string): string | null => {
    if (!origin) return null;
    return `${origin}/api/calendar/${instId}`;
  };

  const getGoogleCalendarSubscribeUrl = (instId: string): string | null => {
    const feedUrl = getCalendarFeedUrl(instId);
    if (!feedUrl) return null;
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;
  };

  const getDownloadIcsUrl = (instId: string): string => {
    return `/api/calendar/${instId}`;
  };

  const handleCopyFeedLink = async (instId: string) => {
    const feedUrl = getCalendarFeedUrl(instId);
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl.replace(/^https?:\/\//, 'webcal://'));
      setFeedLinkCopied(true);
      setTimeout(() => setFeedLinkCopied(false), 2500);
    } catch {
      await notify('Could not copy link. Long-press the Subscribe button and copy the URL manually.');
    }
  };

  // 1-Click direct add to Google Calendar for a specific lecture/session
  const getGoogleCalendarEventUrl = (a: DutyAssignment): string => {
    const summary = a.batchName || a.moduleName ? `${a.batchName || ''} — ${a.moduleName || ''}` : a.dutyType;
    const details = [a.slotLabel, a.notes, 'NIBM Instructor Roster'].filter(Boolean).join('\n');
    const location = a.roomLab || '';

    // Sri Lanka is UTC+5:30 with no DST
    const toUTC = (dateStr: string, timeStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      const utcMs = Date.UTC(year, month - 1, day, hour, minute) - 5.5 * 60 * 60 * 1000;
      return new Date(utcMs).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startUTC = toUTC(a.dutyDate, a.startTime);
    const endUTC = toUTC(a.dutyDate, a.endTime);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: summary,
      dates: `${startUTC}/${endUTC}`,
      details,
      location,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // 1-Click direct add to Google Calendar for a night duty (All-day date event, no fixed time)
  const getGoogleCalendarNightShiftUrl = (shift: NightShift): string => {
    const summary = '🌙 Night Duty';
    const details = [shift.notes, 'NIBM Night Duty', 'NIBM Instructor Roster'].filter(Boolean).join('\n');
    const startDateFormatted = shift.shiftDate.replace(/-/g, '');
    const d = new Date(`${shift.shiftDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    const endDateFormatted = d.toISOString().split('T')[0].replace(/-/g, '');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: summary,
      dates: `${startDateFormatted}/${endDateFormatted}`,
      details,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Filter assignments based on dropdown selection and merge full-day sessions (09:00 - 16:00)
  const filteredDuties = dutyAssignments.filter((a) => {
    if (selectedInstructorId === 'ALL') return true;
    return a.instructorId === selectedInstructorId;
  });
  const displayedAssignments = mergeDutyAssignments(filteredDuties).sort(
    (a, b) => a.dutyDate.localeCompare(b.dutyDate) || a.startTime.localeCompare(b.startTime)
  );

  // Filter night shifts
  const displayedNightShifts = nightShifts
    .filter((s) => {
      if (selectedInstructorId === 'ALL') return true;
      return s.instructorId === selectedInstructorId;
    })
    .sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));

  // Filter leave history
  const displayedLeaves = leaveRequests.filter((l) => {
    if (selectedInstructorId === 'ALL') return true;
    return l.instructorId === selectedInstructorId;
  });

  // Coverage hints for the leave calendar: colleagues already on approved
  // leave per day, and the days this instructor has duty.
  const colleagueAwayDates: Record<string, string[]> = {};
  for (const l of leaveRequests) {
    if (l.status !== 'APPROVED' || l.instructorId === currentUser.id) continue;
    for (let d = l.startDate; d <= l.endDate; d = addDaysYmd(d, 1)) {
      (colleagueAwayDates[d] ??= []).push(l.instructorName ?? 'Colleague');
    }
  }
  const myDutyDates = new Set(
    [
      ...dutyAssignments.filter((a) => a.instructorId === currentUser.id).map((a) => a.dutyDate),
      ...nightShifts.filter((n) => n.instructorId === currentUser.id).map((n) => n.shiftDate),
    ],
  );

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      setErrorMessage('Please pick a start date');
      return;
    }
    const end = endDate || startDate;
    if (end < startDate) {
      setErrorMessage('End date cannot be earlier than start date');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Please state a reason for your leave');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitLeaveAction(currentUser.id, startDate, end, reason.trim());
      const appliedTimeStr = formatApplicationDateTime(new Date().toISOString());
      setSuccessMessage(
        `Leave request submitted on ${appliedTimeStr}! It is now logged and awaiting review in the Leave Approvals queue.`
      );
      setReason('');
      setStartDate('');
      setEndDate('');
      onRefresh();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch {
      setErrorMessage('Failed to submit leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<><Users className="size-3" /> {isSharedKiosk && section === 'schedule' ? 'Shared workspace' : SECTION_COPY[section].eyebrow}</>}
        title={
          SECTION_COPY[section].title ??
          (isSharedKiosk ? 'Instructor workspace' : `Hi, ${currentUser.fullName.split(' ')[0]}`)
        }
        description={
          isSharedKiosk && section === 'schedule'
            ? `Shared terminal for the ${allInstructors.length}-member cadre: lectures and night duty.`
            : SECTION_COPY[section].description
        }
      />

      {/* Week switch: this week / next week */}
      {section === 'schedule' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Week"
            value={week}
            onChange={onSelectWeek}
            options={[
              { value: 'this', label: 'This week' },
              { value: 'next', label: 'Next week' },
            ]}
          />
          <span className="flex items-center gap-2 text-xs text-neutral-500">
            {isWeekLoading && <Loader2 className="size-3.5 animate-spin" />}
            {shortDate(rosterWeek.startDate)} – {shortDate(rosterWeek.endDate)}
          </span>
        </div>
      )}

      {/* Who + calendar sync */}
      {section === 'schedule' && (
      <div className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
        <Select
          label="Show schedule for"
          size="sm"
          icon={<Filter className="size-3.5" />}
          value={selectedInstructorId}
          onChange={setSelectedInstructorId}
          className="w-full sm:w-56"
          options={[
            { value: 'ALL', label: `All ${allInstructors.length} instructors` },
            ...allInstructors.map((inst) => ({ value: inst.id, label: inst.fullName })),
          ]}
        />

            {/* Calendar Export Actions */}
            {selectedInstructorId !== 'ALL' ? (
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <a
                  href={getGoogleCalendarSubscribeUrl(selectedInstructorId) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                  title="Subscribe to entire live calendar in Google Calendar"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Google Cal</span>
                </a>
                <a
                  href={getDownloadIcsUrl(selectedInstructorId)}
                  download={`nibm-roster-${selectedInstructorId}.ics`}
                  className="btn btn-secondary btn-sm"
                  title="Download .ics file to import directly into Google Calendar, Outlook, or Apple Calendar"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>.ICS</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleCopyFeedLink(selectedInstructorId)}
                  title="Copy the iCal feed link (for Apple Calendar / Outlook / webcal)"
                  className={`btn btn-sm btn-icon w-8 ${feedLinkCopied ? 'btn-success' : 'btn-secondary'}`}
                >
                  {feedLinkCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                </button>

                {/* Google Calendar sync notice: hover-and-view tooltip */}
                <div className="relative group shrink-0">
                  <button
                    type="button"
                    title="Google Calendar sync information"
                    className="btn btn-secondary btn-sm btn-icon w-8"
                  >
                    <Info className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-xl border border-neutral-200 bg-white/95 p-3.5 text-[11px] text-neutral-600 shadow-2xl backdrop-blur-xl sm:w-80 dark:border-white/10 dark:bg-[#161616]/95 dark:text-neutral-300 invisible group-hover:visible group-focus-within:visible opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mb-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Calendar sync</span>
                    </div>
                    <p className="leading-relaxed">
                      Google Calendar refreshes subscribed URL calendars automatically every 8–24 hours.
                    </p>
                    <p className="leading-relaxed mt-1 text-slate-500 dark:text-slate-400">
                      For an <span className="text-emerald-600 dark:text-emerald-400 font-semibold">immediate update</span>, click <span className="font-semibold text-blue-600 dark:text-blue-300">+ Google Cal</span> / <span className="font-semibold text-blue-600 dark:text-blue-300">+ Cal</span> on any duty below or use <span className="font-semibold text-slate-700 dark:text-slate-200">Download .ics</span> to import directly.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-xs text-neutral-500">
                Select an instructor to subscribe to calendar
              </span>
            )}
      </div>
      )}

      {/* SUBTAB 1: ASSIGNED TASKS & SCHEDULE */}
      {activeSubTab === 'schedule' && nextWeekUnpublished && (
        <div className="surface-card flex flex-col items-center px-6 py-14 text-center animate-page-in">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500 dark:bg-white/[0.06] dark:text-neutral-400">
            <CalendarClock className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Next week isn&apos;t published yet</h3>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            The roster for {shortDate(rosterWeek.startDate)} – {shortDate(rosterWeek.endDate)} is still being planned. It
            shows here as soon as it&apos;s published, and you&apos;ll get a notification if alerts are on.
          </p>
        </div>
      )}

      {activeSubTab === 'schedule' && !nextWeekUnpublished && (
        <div className={`space-y-6 animate-page-in transition-opacity ${isWeekLoading ? 'opacity-60' : ''}`}>
          {unpublishedNextDays.length > 0 && (
            <p className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-500 dark:border-white/[0.06]">
              <CalendarClock className="size-3.5 shrink-0" />
              Not published yet: {unpublishedNextDays.map((d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })).join(', ')}.
            </p>
          )}
          {/* Night Duty this week Banner */}
          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                    Night Duty {week === 'next' ? 'next week' : 'this week'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Week of {rosterWeek.startDate} to {rosterWeek.endDate}
                  </p>
                </div>
              </div>
              <span className="text-[11px] bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg font-medium">
                Daily Rotation
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
              {displayedNightShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded- border border-neutral-200 bg-neutral-50/60 dark:border-white/[0.06] dark:bg-white/[0.025] p-2.5 text-center flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                      {new Date(shift.shiftDate).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block mt-0.5 truncate">
                      {shift.instructorName}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                      {shift.shiftDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1.5 flex-wrap">
                    {shift.instructorPhone && shift.instructorId !== currentUser.id && (
                      <a
                        href={`tel:${shift.instructorPhone.replace(/\s+/g, '')}`}
                        className="inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-white/[0.04] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors"
                        title={`Call ${shift.instructorName}`}
                      >
                        <Phone className="w-2.5 h-2.5" />
                        <span>Call</span>
                      </a>
                    )}
                    {shift.instructorId === currentUser.id && (
                      <a
                        href={getGoogleCalendarNightShiftUrl(shift)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm h-7"
                        title="Add Night Duty to Google Calendar (All-day, no fixed time)"
                      >
                        <CalendarPlus className="w-2.5 h-2.5" />
                        <span>+ Cal</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Teaching Sessions */}
          <div className="surface-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-neutral-900 dark:text-white text-sm sm:text-base">
                  Your duties ({displayedAssignments.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedInstructorId === 'ALL' ? 'Showing entire team' : 'Filtered to selected instructor'}
              </span>
            </div>

            {displayedAssignments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-sm">No teaching slots match the current filter.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Yasith plans sessions every Sunday.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded- border border-neutral-200 bg-neutral-50/60 dark:border-white/[0.06] dark:bg-white/[0.025] p-4 hover:border-neutral-300 dark:hover:border-white/[0.14] transition-all shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {new Date(a.dutyDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            a.startTime === '09:00' && a.endTime === '16:00'
                              ? 'bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                              : 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
                          }`}
                        >
                          {a.startTime === '09:00' && a.endTime === '16:00'
                            ? '09:00 - 16:00 (Full Day)'
                            : `${a.startTime} - ${a.endTime}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                          <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>{a.instructorName}</span>
                        </div>
                        {a.instructorPhone && a.instructorId !== currentUser.id && (
                          <a
                            href={`tel:${a.instructorPhone.replace(/\s+/g, '')}`}
                            className="btn btn-secondary btn-sm h-7"
                            title={`Call ${a.instructorName}`}
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>Call</span>
                          </a>
                        )}
                      </div>

                      <h4 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">{a.moduleName ?? a.dutyType}</h4>
                      {a.notes && <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">{a.notes}</p>}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 pt-2.5 border-t border-slate-200 dark:border-white/[0.08] gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.batchName && (
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-[11px]">
                            Batch: {a.batchName}
                          </span>
                        )}
                        <span className="flex items-center space-x-1 text-slate-500 font-medium text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className={a.roomLab ? '' : 'italic'}>{a.roomLab || 'Room unassigned'}</span>
                        </span>
                      </div>
                      <a
                        href={getGoogleCalendarEventUrl(a)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm h-7 shrink-0"
                        title="Add this duty to your Google Calendar"
                      >
                        <CalendarPlus className="w-3 h-3" />
                        <span>+ Google Cal</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: APPLY FOR HOLIDAY / LEAVE */}
      {activeSubTab === 'applyLeave' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-page-in">
          {/* Application Form */}
          <div className="surface-card lg:col-span-2 p-5 sm:p-6">
            <h3 className="mb-1 text-sm font-semibold text-neutral-900 sm:text-base dark:text-white">New request</h3>
            <p className="mb-5 text-xs text-neutral-500">
              A demonstrator, executive or admin reviews it in Leave Approvals.
            </p>

            {successMessage && (
              <div className="mb-4 flex animate-pop-in items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 flex animate-pop-in items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-4">
              {/* Applicant Name: Strictly locked to authenticated caller */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Applicant
                </label>
                <div className="field flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white">{currentUser.fullName}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">(@{currentUser.username})</span>
                  </div>
                  <span className="chip">You</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Dates</label>
                <DateRangePicker
                  label="Leave dates"
                  placeholder="Tap a start day, then an end day"
                  className="w-full"
                  min={todayYmd()}
                  value={{ from: startDate, to: endDate }}
                  onChange={({ from, to }) => {
                    setStartDate(from);
                    setEndDate(to);
                  }}
                  awayDates={colleagueAwayDates}
                  dutyDates={myDutyDates}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Reason
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. University exam duty, medical leave, family event, personal emergency"
                  className="field h-auto py-2.5 w-full text-sm resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-lg w-full sm:w-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting…' : 'Submit request'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Leave History / Status Log */}
          <div className="surface-card p-5 sm:p-6 flex flex-col">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-3">
              Your requests
            </h4>

            <div className="space-y-3 overflow-y-auto max-h-[380px] flex-1">
              {displayedLeaves.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                  No leave requests logged yet.
                </div>
              ) : (
                displayedLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="rounded- border border-neutral-200 bg-neutral-50/60 dark:border-white/[0.06] dark:bg-white/[0.025] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{leave.instructorName}</span>
                      <StatusPill
                        tone={leave.status === 'APPROVED' ? 'emerald' : leave.status === 'REJECTED' ? 'rose' : leave.status === 'PENDING' ? 'amber' : 'neutral'}
                        pulse={leave.status === 'PENDING'}
                      >
                        {leave.status === 'REJECTED' ? 'Rejected' : leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
                      </StatusPill>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{leave.startDate} {leave.startDate !== leave.endDate && `to ${leave.endDate}`}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span>Applied: <strong className="text-slate-700 dark:text-slate-300 font-medium">{formatApplicationDateTime(leave.appliedAt || leave.createdAt)}</strong></span>
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 italic mt-1">&ldquo;{leave.reason}&rdquo;</p>
                    {leave.reviewedByName && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pt-1 border-t border-slate-200 dark:border-white/[0.08]">
                        Reviewed by <strong className="text-slate-700 dark:text-slate-300">{leave.reviewedByName}</strong>: &ldquo;{leave.reviewComment}&rdquo;
                      </div>
                    )}
                    {leave.instructorId === currentUser.id &&
                      (leave.status === 'PENDING' || leave.status === 'APPROVED') &&
                      leave.endDate >= todayYmd() && (
                        <button
                          type="button"
                          onClick={() => handleWithdraw(leave)}
                          disabled={withdrawingId === leave.id}
                          className="btn btn-secondary btn-sm mt-2.5 w-full"
                        >
                          {withdrawingId === leave.id ? <Loader2 className="animate-spin" /> : <Undo2 />}
                          Withdraw
                        </button>
                      )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: WHO'S AWAY (current, upcoming and past approved leave) */}
      {activeSubTab === 'teamLeaves' && (() => {
        const today = new Date().toISOString().split('T')[0];
        const approved = leaveRequests.filter((l) => l.status === 'APPROVED');
        // Months that actually contain leave, newest first, for the month filter.
        const months = Array.from(new Set(approved.map((l) => l.startDate.slice(0, 7)))).sort().reverse();
        const monthLabel = (ym: string) =>
          new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const shown = approved
          .filter((l) =>
            awayPeriod === 'upcoming' ? l.endDate >= today : awayPeriod === 'past' ? l.endDate < today : true,
          )
          .filter((l) => awayInstructor === 'ALL' || l.instructorId === awayInstructor)
          .filter((l) => awayMonth === 'ALL' || l.startDate.slice(0, 7) === awayMonth || l.endDate.slice(0, 7) === awayMonth)
          .sort((a, b) =>
            awayPeriod === 'upcoming' ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate),
          );
        const days = (l: LeaveRequest) =>
          Math.round((Date.parse(`${l.endDate}T00:00:00`) - Date.parse(`${l.startDate}T00:00:00`)) / 86_400_000) + 1;
        const filtered = awayInstructor !== 'ALL' || awayMonth !== 'ALL';

        return (
          <div className="space-y-4 animate-page-in">
            {/* Filters */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <Segmented
                label="Period"
                value={awayPeriod}
                onChange={setAwayPeriod}
                className="w-full sm:w-auto"
                options={[
                  { value: 'upcoming', label: 'Now & upcoming' },
                  { value: 'past', label: 'History' },
                  { value: 'all', label: 'All' },
                ]}
              />
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Select
                  label="Instructor"
                  size="sm"
                  icon={<Users className="size-3.5" />}
                  value={awayInstructor}
                  onChange={setAwayInstructor}
                  className="sm:w-44"
                  options={[
                    { value: 'ALL', label: 'Everyone' },
                    ...allInstructors.map((i) => ({ value: i.id, label: i.fullName })),
                  ]}
                />
                <Select
                  label="Month"
                  size="sm"
                  icon={<Calendar className="size-3.5" />}
                  value={awayMonth}
                  onChange={setAwayMonth}
                  className="sm:w-44"
                  options={[{ value: 'ALL', label: 'Any month' }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>
                {shown.length} {shown.length === 1 ? 'leave' : 'leaves'} · {shown.reduce((n, l) => n + days(l), 0)} days
              </span>
              {filtered && (
                <button
                  type="button"
                  onClick={() => {
                    setAwayInstructor('ALL');
                    setAwayMonth('ALL');
                  }}
                  className="btn btn-ghost btn-sm h-7"
                >
                  Clear filters
                </button>
              )}
            </div>

            {shown.length === 0 ? (
              <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
                <div className="flex size-12 animate-pop-in items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <Users className="size-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                  {awayPeriod === 'upcoming' && !filtered ? 'Everyone\u2019s in' : 'No leave found'}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {awayPeriod === 'upcoming' && !filtered
                    ? 'No current or upcoming approved leave. Check History for past leave.'
                    : 'Try another period, instructor or month.'}
                </p>
              </div>
            ) : (
              <ul key={`${awayPeriod}-${awayInstructor}-${awayMonth}`} className="grid grid-cols-1 gap-2.5 md:grid-cols-2 stagger-children">
                {shown.map((leave) => {
                  const awayNow = leave.startDate <= today && leave.endDate >= today;
                  const past = leave.endDate < today;
                  const n = days(leave);
                  return (
                    <li key={leave.id} className={`surface-card flex items-start justify-between gap-3 p-4 ${past ? 'opacity-80' : ''}`}>
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-700 dark:bg-white/[0.07] dark:text-neutral-200">
                          {(leave.instructorName ?? '?').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{leave.instructorName}</p>
                          <p className="mt-0.5 font-mono text-xs text-neutral-500">
                            {leave.startDate}
                            {leave.startDate !== leave.endDate && ` → ${leave.endDate}`}
                            <span className="font-sans"> · {n} {n === 1 ? 'day' : 'days'}</span>
                          </p>
                          {leave.reason && <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">{leave.reason}</p>}
                          {leave.reviewedByName && (
                            <p className="mt-1 text-[11px] text-neutral-500">Approved by {leave.reviewedByName}</p>
                          )}
                        </div>
                      </div>
                      <StatusPill tone={awayNow ? 'rose' : past ? 'neutral' : 'amber'} pulse={awayNow}>
                        {awayNow ? 'Away today' : past ? 'Past' : 'Upcoming'}
                      </StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })()}
    </div>
  );
};
