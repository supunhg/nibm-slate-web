'use client';
import { Select } from './ui/Select';

import React, { useState, useMemo } from 'react';
import { User, RosterWeek, DutyAssignment, NightShift, LeaveRequest } from '@/types';
import { isSameSession } from '@/lib/roster-utils';
import { PageHeader, StatusPill } from './ui/PageHeader';
import {
  Calendar,
  Clock,
  Moon,
  MapPin,
  Filter,
  Search,
  Printer,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Phone,
  X,
  FileText,
  Info,
} from 'lucide-react';
import { DatePicker } from './ui/DatePicker';

interface SessionCardProps {
  duty: DutyAssignment;
  slotType: 'morning' | 'afternoon' | 'sunday';
  isFullDay: boolean;
  allInstructors: User[];
}

const SessionCard: React.FC<SessionCardProps> = ({
  duty,
  slotType,
  isFullDay,
  allInstructors,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const instructor = allInstructors.find((i) => i.id === duty.instructorId);

  const colorStyles = {
    morning: {
      card: 'bg-white dark:bg-white/[0.03] border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.14] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full print:before:hidden pl-2.5 before:bg-blue-500 print:bg-blue-50/80 print:border-blue-300',
      title: 'text-neutral-900 dark:text-white print:text-blue-950',
      batch: 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 print:bg-blue-200 print:text-blue-900',
      avatarBg: 'bg-blue-600 print:bg-blue-700',
      badgeBorder: 'border-neutral-100 dark:border-white/[0.06] print:border-blue-200',
      fullDayBadge:
        'text-blue-800 dark:text-blue-300 print:text-indigo-950 bg-blue-500/15 dark:bg-blue-500/20 print:bg-indigo-100 border-blue-500/30 print:border-indigo-300',
    },
    afternoon: {
      card: 'bg-white dark:bg-white/[0.03] border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.14] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full print:before:hidden pl-2.5 before:bg-amber-400 print:bg-amber-50/80 print:border-amber-300',
      title: 'text-neutral-900 dark:text-white print:text-amber-950',
      batch: 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 print:bg-amber-200 print:text-amber-900',
      avatarBg: 'bg-amber-600 print:bg-amber-700',
      badgeBorder: 'border-neutral-100 dark:border-white/[0.06] print:border-amber-200',
      fullDayBadge:
        'text-amber-900 dark:text-amber-300 print:text-amber-950 bg-amber-500/15 dark:bg-amber-500/20 print:bg-amber-100 border-amber-500/30 print:border-amber-300',
    },
    sunday: {
      card: 'bg-white dark:bg-white/[0.03] border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.14] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full print:before:hidden pl-2.5 before:bg-indigo-500 print:bg-purple-50/80 print:border-purple-300',
      title: 'text-neutral-900 dark:text-white print:text-purple-950',
      batch: 'bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 print:bg-purple-200 print:text-purple-900',
      avatarBg: 'bg-purple-700 print:bg-purple-800',
      badgeBorder: 'border-neutral-100 dark:border-white/[0.06] print:border-purple-200',
      fullDayBadge:
        'text-purple-900 dark:text-purple-300 print:text-purple-950 bg-purple-500/15 dark:bg-purple-500/20 print:bg-purple-100 border-purple-500/30 print:border-purple-300',
    },
  }[slotType];

  return (
    <div
      className={`relative overflow-hidden rounded-lg print:rounded p-2 print:p-1 border transition-[border-color,background-color] duration-200 shadow-2xs print:shadow-none print-avoid-break group animate-rise-in ${colorStyles.card}`}
      onMouseEnter={() => setPopoverOpen(true)}
      onMouseLeave={() => setPopoverOpen(false)}
    >
      {/* Session Title / Module */}
      <div className={`text-xs print:text-[9.5px] font-bold line-clamp-2 leading-snug ${colorStyles.title}`}>
        {duty.moduleName ?? duty.dutyType}
      </div>

      {/* Batch & Room */}
      <div className="mt-1 print:mt-0.5 flex items-center justify-between text-[11px] print:text-[8.5px]">
        {duty.batchName && (
          <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] print:text-[8px] ${colorStyles.batch}`}>
            {duty.batchName}
          </span>
        )}
        {duty.roomLab && (
          <span className="text-slate-400 print:text-slate-600 font-medium text-[10px] print:text-[8.5px] flex items-center gap-0.5">
            <MapPin className="w-2.5 h-2.5 text-slate-400 print:text-slate-600" />
            {duty.roomLab}
          </span>
        )}
      </div>

      {/* Full Day Indicator */}
      {isFullDay && (
        <div
          className={`mt-1.5 print:mt-0.5 inline-flex items-center gap-1 text-[10px] print:text-[8px] font-bold px-1.5 py-0.5 print:py-0.2 rounded border shadow-2xs ${colorStyles.fullDayBadge}`}
        >
          <Clock className="w-2.5 h-2.5 shrink-0" />
          <span>09:00 - 16:00 (Full Day)</span>
        </div>
      )}

      {/* Interactive Compact Note Pill on Screen */}
      {duty.notes && (
        <div className="mt-1 print:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPopoverOpen((prev) => !prev);
            }}
            className="inline-flex items-center gap-1 text-[9.5px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.06] dark:hover:bg-white/10 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-white/10 transition-colors cursor-pointer max-w-full"
            title="Click to view full session notes"
          >
            <FileText className="w-2.5 h-2.5 text-blue-400 shrink-0" />
            <span className="truncate max-w-[130px]">{duty.notes}</span>
          </button>
        </div>
      )}

      {/* Printed Notes (Preserved on Paper) */}
      {duty.notes && (
        <div className="hidden print:block mt-0.5 text-[8px] text-slate-600 italic line-clamp-2">
          {duty.notes}
        </div>
      )}

      {/* Instructor Footer */}
      <div
        className={`mt-1.5 print:mt-0.5 pt-1 border-t flex items-center justify-between text-[11px] print:text-[8.5px] font-semibold text-neutral-700 dark:text-neutral-200 print:text-slate-800 ${colorStyles.badgeBorder}`}
      >
        <div className="flex items-center space-x-1 min-w-0">
          <div
            className={`w-4 h-4 print:w-3.5 print:h-3.5 rounded-full text-white font-bold flex items-center justify-center text-[9px] print:text-[7.5px] shrink-0 ${colorStyles.avatarBg}`}
          >
            {duty.instructorName ? duty.instructorName.substring(0, 1) : 'I'}
          </div>
          <span className="truncate">{duty.instructorName}</span>
        </div>

        {/* Info button on mobile for quick tap popover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPopoverOpen((prev) => !prev);
          }}
          className="lg:hidden text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
          title="Session details"
        >
          <Info className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Interactive Floating Popover Card */}
      {popoverOpen && (
        <div
          className={`absolute z-40 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 ${
            slotType === 'morning' ? 'top-full mt-2' : 'bottom-full mb-2'
          } w-72 max-w-[85vw] p-3 rounded-xl bg-slate-950 text-slate-100 border border-slate-700 shadow-2xl backdrop-blur-md animate-pop-in print:hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                {isFullDay ? 'Full-Day Session (09:00 - 16:00)' : `${duty.startTime} - ${duty.endTime}`}
              </div>
              <div className="text-xs font-bold text-white mt-0.5 leading-snug">
                {duty.moduleName ?? duty.dutyType}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer transition-colors"
              title="Close details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 space-y-1.5 text-[11px]">
            {duty.batchName && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Target Batch:</span>
                <span className="font-bold text-white bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                  {duty.batchName}
                </span>
              </div>
            )}
            {duty.roomLab && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Room / Facility:</span>
                <span className="font-bold text-slate-200 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  {duty.roomLab}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Assigned Instructor:</span>
              <span className="font-bold text-white">{duty.instructorName}</span>
            </div>
            {instructor?.phone && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Contact:</span>
                <a
                  href={`tel:${instructor.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
                >
                  <Phone className="w-2.5 h-2.5" />
                  <span>{instructor.phone}</span>
                </a>
              </div>
            )}
            {duty.notes && (
              <div className="mt-2 pt-2 border-t border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span>Session Notes & Instructions</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {duty.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface WeeklyScheduleViewProps {
  rosterWeek: RosterWeek;
  dutyAssignments: DutyAssignment[];
  nightShifts: NightShift[];
  leaveRequests: LeaveRequest[];
  allInstructors: User[];
  onWeekChange?: (newStartDate: string) => void;
  onSelectDateForCockpit?: (dateStr: string) => void;
}

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  rosterWeek,
  dutyAssignments,
  nightShifts,
  leaveRequests,
  allInstructors,
  onWeekChange,
  onSelectDateForCockpit,
}) => {
  const [planningStartDate, setPlanningStartDate] = useState<string>(rosterWeek.startDate);
  const [prevRosterStartDate, setPrevRosterStartDate] = useState<string>(rosterWeek.startDate);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileSelectedDay, setMobileSelectedDay] = useState<string>('ALL');

  const selectedInstructor = useMemo(() => {
    if (selectedInstructorId === 'ALL') return null;
    return allInstructors.find((i) => i.id === selectedInstructorId) || null;
  }, [selectedInstructorId, allInstructors]);

  if (rosterWeek.startDate !== prevRosterStartDate) {
    setPrevRosterStartDate(rosterWeek.startDate);
    setPlanningStartDate(rosterWeek.startDate);
  }

  const handleDateChange = (newDateStr: string) => {
    setPlanningStartDate(newDateStr);
    onWeekChange?.(newDateStr);
  };

  const handleShiftDate = (days: number) => {
    const d = new Date(planningStartDate);
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().split('T')[0];
    handleDateChange(newDateStr);
  };

  const handleJumpToSunday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = (7 - day) % 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + diff);
    handleDateChange(nextSunday.toISOString().split('T')[0]);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Generate 7-day horizon
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(planningStartDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isSunday = d.getDay() === 0;
      const isToday = dateStr === todayStr;

      return {
        dateStr,
        dayName,
        fullDayName,
        formattedDate,
        isSunday,
        isToday,
      };
    });
  }, [planningStartDate, todayStr]);

  const weekEndDate = weekDays[6]?.dateStr || rosterWeek.endDate;

  // Filtered assignments based on instructor & search query
  const filteredAssignments = useMemo(() => {
    return dutyAssignments.filter((a) => {
      if (selectedInstructorId !== 'ALL' && a.instructorId !== selectedInstructorId) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesModule = a.moduleName?.toLowerCase().includes(query);
        const matchesBatch = a.batchName?.toLowerCase().includes(query);
        const matchesRoom = a.roomLab?.toLowerCase().includes(query);
        const matchesInstructor = a.instructorName?.toLowerCase().includes(query);
        if (!matchesModule && !matchesBatch && !matchesRoom && !matchesInstructor) {
          return false;
        }
      }
      return true;
    });
  }, [dutyAssignments, selectedInstructorId, searchQuery]);

  // Aggregate instructor weekly metrics
  const instructorStats = useMemo(() => {
    const stats: Record<
      string,
      {
        instructor: User;
        morningCount: number;
        afternoonCount: number;
        sundayCount: number;
        totalSessions: number;
        totalHours: number;
        nightShiftsCount: number;
        nightShiftDates: string[];
        onLeaveDates: string[];
      }
    > = {};

    allInstructors.forEach((inst) => {
      stats[inst.id] = {
        instructor: inst,
        morningCount: 0,
        afternoonCount: 0,
        sundayCount: 0,
        totalSessions: 0,
        totalHours: 0,
        nightShiftsCount: 0,
        nightShiftDates: [],
        onLeaveDates: [],
      };
    });

    // Count duties in this 7-day range
    dutyAssignments.forEach((a) => {
      if (a.dutyDate >= planningStartDate && a.dutyDate <= weekEndDate) {
        if (stats[a.instructorId]) {
          stats[a.instructorId].totalSessions += 1;
          if (a.startTime === '09:00') {
            stats[a.instructorId].morningCount += 1;
            stats[a.instructorId].totalHours += 3;
          } else if (a.startTime === '13:00') {
            stats[a.instructorId].afternoonCount += 1;
            stats[a.instructorId].totalHours += 3;
          } else if (a.startTime === '16:30') {
            stats[a.instructorId].sundayCount += 1;
            stats[a.instructorId].totalHours += 1;
          } else {
            stats[a.instructorId].totalHours += 3;
          }
        }
      }
    });

    // Count night shifts
    nightShifts.forEach((s) => {
      if (s.shiftDate >= planningStartDate && s.shiftDate <= weekEndDate) {
        if (stats[s.instructorId]) {
          stats[s.instructorId].nightShiftsCount += 1;
          stats[s.instructorId].nightShiftDates.push(s.shiftDate);
        }
      }
    });

    // Check leaves
    weekDays.forEach((day) => {
      leaveRequests.forEach((l) => {
        if (
          l.status === 'APPROVED' &&
          day.dateStr >= l.startDate &&
          day.dateStr <= l.endDate &&
          stats[l.instructorId]
        ) {
          if (!stats[l.instructorId].onLeaveDates.includes(day.dateStr)) {
            stats[l.instructorId].onLeaveDates.push(day.dateStr);
          }
        }
      });
    });

    return Object.values(stats);
  }, [allInstructors, dutyAssignments, nightShifts, leaveRequests, planningStartDate, weekEndDate, weekDays]);

  // Overall Week Totals
  const totalWeeklySessions = useMemo(() => {
    return dutyAssignments.filter((a) => a.dutyDate >= planningStartDate && a.dutyDate <= weekEndDate).length;
  }, [dutyAssignments, planningStartDate, weekEndDate]);

  const totalWeeklyNightShifts = useMemo(() => {
    return nightShifts.filter((s) => s.shiftDate >= planningStartDate && s.shiftDate <= weekEndDate).length;
  }, [nightShifts, planningStartDate, weekEndDate]);

  const totalWeeklyLeaves = useMemo(() => {
    const leaveSet = new Set<string>();
    leaveRequests.forEach((l) => {
      if (l.status === 'APPROVED') {
        weekDays.forEach((day) => {
          if (day.dateStr >= l.startDate && day.dateStr <= l.endDate) {
            leaveSet.add(`${l.instructorId}-${day.dateStr}`);
          }
        });
      }
    });
    return leaveSet.size;
  }, [leaveRequests, weekDays]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-3">
      <PageHeader
        eyebrow={<><Shield className="size-3" /> Week overview</>}
        title="Week schedule"
        description="Every session and night duty across the seven-day window."
        status={
          rosterWeek.status === 'PUBLISHED' ? (
            <StatusPill tone="emerald">Published</StatusPill>
          ) : (
            <StatusPill tone="amber" pulse>Draft</StatusPill>
          )
        }
        actions={
          <button onClick={handlePrint} className="btn btn-secondary" title="Print the weekly timetable (landscape)">
            <Printer className="text-neutral-400" />
            Print
          </button>
        }
      />

      {/* Week navigation */}
      <div className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5 print:hidden">
        <div className="flex items-center gap-2">
          <DatePicker
            label="Week starting"
            size="sm"
            weekWindow
            value={planningStartDate}
            onChange={handleDateChange}
            className="w-auto min-w-52"
          />
        </div>
        <div className="grid grid-cols-4 items-center rounded-lg border border-neutral-200 p-0.5 sm:flex sm:w-fit dark:border-white/[0.08]">
          <button onClick={() => handleShiftDate(-7)} className="btn btn-ghost btn-sm" title="Previous week">
            <ChevronLeft /> Prev
          </button>
          <button onClick={() => handleDateChange(todayStr)} className="btn btn-ghost btn-sm" title="Jump to the current week">
            This week
          </button>
          <button onClick={handleJumpToSunday} className="btn btn-ghost btn-sm" title="Start the window on Sunday">
            Sunday
          </button>
          <button onClick={() => handleShiftDate(7)} className="btn btn-ghost btn-sm" title="Next week">
            Next <ChevronRight />
          </button>
        </div>
      </div>

      {/* Dedicated Filter & Search Control Center */}
      <div className="surface-card space-y-3 p-3 sm:p-3.5 print:hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left: Instructor Cadre Dropdown */}
          <div className="flex items-center gap-2 min-w-0 sm:w-auto">
            <Select
              label="Instructor"
              size="sm"
              icon={<Filter className="size-3.5" />}
              value={selectedInstructorId}
              onChange={setSelectedInstructorId}
              className="w-full sm:w-60"
              options={[
                { value: 'ALL', label: `All ${allInstructors.length} instructors` },
                ...allInstructors.map((inst) => ({ value: inst.id, label: inst.fullName })),
              ]}
            />
          </div>

          {/* Right: Search Box with Clear Button */}
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search module, batch (e.g. DSE 24.1), room, or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field h-9 pl-9 pr-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips & Match Count */}
        {(selectedInstructorId !== 'ALL' || searchQuery.trim() !== '') && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Active filters:</span>
              {selectedInstructorId !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 chip animate-pop-in py-1">
                  <span>Instructor: {selectedInstructor?.fullName}</span>
                  <button
                    onClick={() => setSelectedInstructorId('ALL')}
                    className="hover:text-white transition-colors cursor-pointer"
                    title="Remove instructor filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery.trim() !== '' && (
                <span className="inline-flex items-center gap-1.5 chip animate-pop-in py-1">
                  <span>Query: &quot;{searchQuery}&quot;</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:text-white transition-colors cursor-pointer"
                    title="Clear search filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedInstructorId('ALL');
                  setSearchQuery('');
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-200">{filteredAssignments.length}</span> lectures
            </div>
          </div>
        )}

        {/* Mobile Horizontal Day Switcher (Visible only on < lg screens) */}
        <div className="block lg:hidden pt-2 border-t border-neutral-100 dark:border-white/[0.06]">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
            Focus Day (Mobile Quick Jump):
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setMobileSelectedDay('ALL')}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                mobileSelectedDay === 'ALL'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                  : 'border border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-400'
              }`}
            >
              All 7 Days
            </button>
            {weekDays.map((day) => {
              const isSelected = mobileSelectedDay === day.dateStr;
              return (
                <button
                  key={day.dateStr}
                  onClick={() => setMobileSelectedDay(day.dateStr)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                      : day.isToday
                      ? 'border border-neutral-400 text-neutral-900 dark:border-white/30 dark:text-white'
                      : 'border border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-400'
                  }`}
                >
                  {day.dayName} {day.formattedDate.split(' ')[1]}
                  {day.isToday && ' • Today'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-3 pb-2.5 border-b-2 border-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              National Institute of Business Management • School of Computing
            </div>
            <h1 className="text-lg font-semibold text-slate-950 tracking-tight">
              Faculty Academic & Duty Timetable
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-900">
              Week: {planningStartDate} → {weekEndDate}
            </div>
            <div className="text-[10px] text-slate-600 font-medium">
              Status: <span className="font-bold text-slate-900">{rosterWeek.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week at a glance */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:hidden stagger-children">
        {[
          { label: 'Sessions', value: totalWeeklySessions, hint: 'this week', dot: 'bg-neutral-400' },
          { label: 'Night coverage', value: `${totalWeeklyNightShifts}/7`, hint: 'nights', dot: 'bg-indigo-400' },
          { label: 'Absences', value: totalWeeklyLeaves, hint: 'person-days', dot: 'bg-rose-500' },
          { label: 'Cadre', value: allInstructors.length, hint: 'instructors', dot: 'bg-emerald-500' },
        ].map((kpi) => (
          <div key={kpi.label} className="surface-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <span className={`size-2 rounded-full ${kpi.dot}`} />
              {kpi.label}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-white">{kpi.value}</span>
              <span className="text-xs text-neutral-500">{kpi.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 7-Day Master Roster Matrix */}
      <div className="surface-card overflow-hidden print:bg-white print:border-0 print:rounded-none print:shadow-none print:m-0 print:p-0">
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-white/[0.05] print:hidden">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-blue-400" />
              <span>7-Day Departmental Timetable Grid</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click &quot;Drilldown ↗&quot; on any date to inspect immediate standby free pools and live room assignments in the Daily Cockpit.
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> Morning (09-12)
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Afternoon (13-16)
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded bg-purple-500"></span> Sunday CCS
            </span>
          </div>
        </div>

        {/* 7-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 print:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x print:divide-y-0 print:divide-x divide-slate-200 dark:divide-white/[0.06] print:divide-slate-300 bg-slate-200 dark:bg-white/[0.06] print:bg-white print:border print:border-slate-300 print:rounded-lg print:overflow-hidden print:w-full">
          {weekDays.map((day) => {
            // Find morning assignments for this day
            const morningDuties = filteredAssignments.filter(
              (a) => a.dutyDate === day.dateStr && (a.startTime === '09:00' || a.slotLabel.includes('Morning'))
            );

            // Find afternoon assignments for this day
            const afternoonDuties = filteredAssignments.filter(
              (a) => a.dutyDate === day.dateStr && (a.startTime === '13:00' || a.slotLabel.includes('Afternoon'))
            );

            // Find Sunday CCS assignment
            const sundayDuties = filteredAssignments.filter(
              (a) => a.dutyDate === day.dateStr && (a.startTime === '16:30' || a.slotLabel.includes('CCS'))
            );

            // Night Shift
            const nightShift = nightShifts.find((s) => s.shiftDate === day.dateStr);
            const nightInstructor = nightShift ? allInstructors.find((i) => i.id === nightShift.instructorId) : null;

            // Leaves on this date
            const dayLeaves = leaveRequests.filter(
              (l) => l.status === 'APPROVED' && day.dateStr >= l.startDate && day.dateStr <= l.endDate
            );

            return (
              <div
                key={day.dateStr}
                className={`${
                  mobileSelectedDay !== 'ALL' && mobileSelectedDay !== day.dateStr
                    ? 'hidden lg:flex'
                    : 'flex'
                } bg-white dark:bg-[#111111] print:!flex print:bg-white flex-col min-h-[520px] print:min-h-0 print-avoid-break transition-colors ${
                  day.isToday ? 'bg-neutral-50 dark:!bg-white/[0.035] print:ring-0' : ''
                }`}
              >
                {/* Column Header */}
                <div
                  className={`p-3 print:p-1.5 border-b border-slate-200 dark:border-white/[0.08] print:border-b-2 print:border-slate-300 text-center ${
                    day.isToday
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 print:bg-slate-100 print:text-slate-950'
                      : day.isSunday
                      ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-900 dark:text-purple-300 print:bg-purple-50 print:text-purple-950'
                      : 'bg-slate-50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 print:bg-slate-100 print:text-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between print:justify-center">
                    <span className="text-xs print:text-[11px] font-semibold uppercase tracking-wider">{day.dayName}</span>
                    {day.isToday && (
                      <span className="text-[9px] bg-white/20 dark:bg-black/10 font-bold px-1.5 py-0.2 rounded-full uppercase print:hidden">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-sm print:text-xs font-semibold mt-0.5">{day.formattedDate}</div>

                  {/* Drilldown button to Daily Cockpit */}
                  {onSelectDateForCockpit && (
                    <button
                      onClick={() => onSelectDateForCockpit(day.dateStr)}
                      className={`text-[10px] mt-1.5 font-semibold flex items-center justify-center space-x-1 w-full py-0.5 rounded transition-all cursor-pointer print:hidden ${
                        day.isToday
                          ? 'bg-white/15 hover:bg-white/25 text-white dark:bg-black/10 dark:hover:bg-black/20 dark:text-neutral-950'
                          : 'bg-white hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]'
                      }`}
                      title={`Open Dr. Thisara's Cockpit for ${day.dayName} ${day.formattedDate}`}
                    >
                      <span>Drilldown</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Day Slots Container */}
                <div className="p-2 print:p-1 space-y-3 print:space-y-1 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 print:space-y-1">
                    {/* 1. MORNING SLOT (09:00 - 12:00) */}
                    <div className="space-y-1.5 print:space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] print:text-[9.5px] font-semibold text-neutral-500 print:text-slate-800 uppercase tracking-wider px-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600 print:text-blue-700" />
                          <span>09:00 - 12:00</span>
                        </span>
                        {morningDuties.length > 0 && (
                          <span className="text-[10px] print:text-[8px] font-semibold text-blue-400 print:text-blue-900 bg-blue-500/10 print:bg-blue-100 px-1 rounded">
                            {morningDuties.length}
                          </span>
                        )}
                      </div>

                      {morningDuties.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-neutral-200 p-2 dark:border-white/[0.06] print:bg-slate-50 print:rounded print:p-1 print:border-slate-300 text-center">
                          <span className="text-[10px] print:text-[8.5px] text-slate-400 print:text-slate-500 italic">No lectures</span>
                        </div>
                      ) : (
                        morningDuties.map((duty) => {
                          const isFullDay = afternoonDuties.some((a) => isSameSession(duty, a));
                          return (
                            <SessionCard
                              key={duty.id}
                              duty={duty}
                              slotType="morning"
                              isFullDay={isFullDay}
                              allInstructors={allInstructors}
                            />
                          );
                        })
                      )}
                    </div>

                    {/* 2. AFTERNOON SLOT (13:00 - 16:00) */}
                    <div className="space-y-1.5 print:space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] print:text-[9.5px] font-semibold text-neutral-500 print:text-slate-800 uppercase tracking-wider px-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600 print:text-amber-700" />
                          <span>13:00 - 16:00</span>
                        </span>
                        {afternoonDuties.length > 0 && (
                          <span className="text-[10px] print:text-[8px] font-semibold text-amber-400 print:text-amber-900 bg-amber-500/10 print:bg-amber-100 px-1 rounded">
                            {afternoonDuties.length}
                          </span>
                        )}
                      </div>

                      {afternoonDuties.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-neutral-200 p-2 dark:border-white/[0.06] print:bg-slate-50 print:rounded print:p-1 print:border-slate-300 text-center">
                          <span className="text-[10px] print:text-[8.5px] text-slate-400 print:text-slate-500 italic">No lectures</span>
                        </div>
                      ) : (
                        afternoonDuties.map((duty) => {
                          const isFullDay = morningDuties.some((m) => isSameSession(duty, m));
                          return (
                            <SessionCard
                              key={duty.id}
                              duty={duty}
                              slotType="afternoon"
                              isFullDay={isFullDay}
                              allInstructors={allInstructors}
                            />
                          );
                        })
                      )}
                    </div>

                    {/* 3. SUNDAY CCS SPECIAL SLOT (16:30 - 17:30) */}
                    {day.isSunday && (
                      <div className="space-y-1.5 print:space-y-0.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] print:text-[9.5px] font-bold text-purple-400 print:text-purple-800 uppercase tracking-wider px-1">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>Sunday CCS (16:30 - 17:30)</span>
                          </span>
                        </div>

                        {sundayDuties.length === 0 ? (
                          <div className="bg-purple-500/10 print:bg-purple-50/50 rounded-lg print:rounded p-2 print:p-1 border border-dashed border-purple-500/20 print:border-purple-200 text-center">
                            <span className="text-[10px] print:text-[8.5px] text-purple-400 print:text-purple-600 italic">No CCS session</span>
                          </div>
                        ) : (
                          sundayDuties.map((duty) => (
                            <SessionCard
                              key={duty.id}
                              duty={duty}
                              slotType="sunday"
                              isFullDay={false}
                              allInstructors={allInstructors}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM SECTION: NIGHT SHIFT & LEAVES */}
                  <div className="pt-2 print:pt-1 border-t border-slate-800 print:border-slate-300 space-y-2 print:space-y-1">
                    {/* Night Shift Officer */}
                    <div className="bg-indigo-950 print:bg-indigo-50/80 text-white print:text-indigo-950 rounded-lg print:rounded p-2 print:p-1 text-xs print:border print:border-indigo-200 print-avoid-break">
                      <div className="flex items-center justify-between text-[10px] print:text-[9px] font-bold text-indigo-300 print:text-indigo-800 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Moon className="w-3 h-3 text-amber-300 print:text-indigo-600 shrink-0" />
                          <span>Night Shift</span>
                        </span>
                      </div>
                      <div className="mt-1 font-bold text-white print:text-indigo-950 text-[11px] print:text-[9.5px] truncate">
                        {nightInstructor ? (
                          <span className="text-amber-300 print:text-indigo-900">{nightInstructor.fullName}</span>
                        ) : (
                          <span className="text-slate-400 print:text-slate-500 italic font-normal text-[10px] print:text-[8.5px]">Not Assigned</span>
                        )}
                      </div>
                      {nightInstructor?.phone && (
                        <div className="mt-0.5 text-[10px] print:text-[8px] text-slate-300 print:text-slate-600 truncate">
                          <span className="print:hidden">
                            <a
                              href={`tel:${nightInstructor.phone.replace(/\s+/g, '')}`}
                              className="inline-flex items-center gap-1 text-[10px] text-amber-300 hover:text-white mt-1 bg-indigo-900/80 hover:bg-indigo-800 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                              title={`Call ${nightInstructor.fullName}`}
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>Call: {nightInstructor.phone}</span>
                            </a>
                          </span>
                          <span className="hidden print:inline">📞 {nightInstructor.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Approved Leaves On This Date */}
                    {dayLeaves.length > 0 && (
                      <div className="bg-rose-500/10 print:bg-rose-50/80 border border-rose-500/20 print:border-rose-200 rounded-lg print:rounded p-1.5 print:p-1 print-avoid-break">
                        <div className="text-[10px] print:text-[8.5px] font-bold text-rose-400 print:text-rose-800 uppercase flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                          <span>On Leave ({dayLeaves.length})</span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayLeaves.map((l) => (
                            <div
                              key={l.id}
                              className="text-[10px] print:text-[8px] font-medium text-rose-400 print:text-rose-900 bg-rose-500/15 print:bg-rose-100 px-1 py-0.2 rounded truncate"
                              title={`${l.instructorName}: ${l.reason}`}
                            >
                              {l.instructorName}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cadre Deployment & Workload Summary Table */}
      <div className="surface-card overflow-hidden print:bg-white print:border print:border-slate-300 print:rounded-lg print:shadow-none print-page-break print:mt-4">
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-white/[0.05] print:bg-slate-100 print:border-b print:border-slate-300 print:p-2.5">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white text-sm sm:text-base flex items-center gap-2 print:text-slate-900 print:text-xs">
              <Users className="w-4 h-4 text-indigo-600 dark:text-blue-400 print:text-blue-700" />
              <span>Instructor Cadre Weekly Workload & Deployment Table</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 print:text-[10px] print:text-slate-600">
              Comprehensive distribution of teaching hours and night shifts for all {allInstructors.length} team members across this 7-day period.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-full print:bg-slate-200 print:text-slate-800 print:text-[9px] print:px-2 print:py-0.5">
            {allInstructors.length} Instructors Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 print:text-[9px] print:text-slate-800">
            <thead className="bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/[0.08] uppercase text-[10px] tracking-wider print:bg-slate-100 print:text-slate-800 print:border-slate-300 print:text-[8px]">
              <tr>
                <th className="px-4 py-3 print:px-2 print:py-1.5">Instructor</th>
                <th className="px-3 py-3 text-center print:px-1.5 print:py-1.5">Morning (09-12)</th>
                <th className="px-3 py-3 text-center print:px-1.5 print:py-1.5">Afternoon (13-16)</th>
                <th className="px-3 py-3 text-center print:px-1.5 print:py-1.5">Sunday CCS</th>
                <th className="px-3 py-3 text-center print:px-1.5 print:py-1.5">Total Sessions</th>
                <th className="px-3 py-3 text-center print:px-1.5 print:py-1.5">Est. Teaching Hrs</th>
                <th className="px-4 py-3 text-center print:px-2 print:py-1.5">Night Shifts</th>
                <th className="px-4 py-3 text-center print:px-2 print:py-1.5">Leave Status</th>
                <th className="px-4 py-3 text-center print:px-2 print:py-1.5">Workload Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] print:divide-slate-200">
              {instructorStats.map((item) => {
                const isSelected = selectedInstructorId === item.instructor.id;
                const totalHours = item.totalHours;

                let balanceBadge = (
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 print:bg-emerald-100 print:text-emerald-900 text-[10px] print:text-[8px] font-bold px-2 py-0.5 rounded-full">
                    Balanced
                  </span>
                );
                if (item.onLeaveDates.length >= 3) {
                  balanceBadge = (
                    <span className="bg-rose-500/15 text-rose-700 dark:text-rose-400 print:bg-rose-100 print:text-rose-900 text-[10px] print:text-[8px] font-bold px-2 py-0.5 rounded-full">
                      On Leave
                    </span>
                  );
                } else if (item.totalSessions >= 5) {
                  balanceBadge = (
                    <span className="bg-purple-500/15 text-purple-700 dark:text-purple-400 print:bg-purple-100 print:text-purple-900 text-[10px] print:text-[8px] font-bold px-2 py-0.5 rounded-full">
                      Heavy Load
                    </span>
                  );
                } else if (item.totalSessions === 0 && item.onLeaveDates.length === 0) {
                  balanceBadge = (
                    <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 print:bg-amber-100 print:text-amber-900 text-[10px] print:text-[8px] font-bold px-2 py-0.5 rounded-full">
                      Standby / Free
                    </span>
                  );
                }

                return (
                  <tr
                    key={item.instructor.id}
                    className={`hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-colors print:hover:bg-transparent ${
                      isSelected ? 'bg-indigo-50/70 dark:bg-blue-500/10 font-semibold print:bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 print:px-2 print:py-1">
                      <div className="flex items-center space-x-2.5 print:space-x-1.5">
                        <div className="w-7 h-7 print:w-5 print:h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center text-[10px] print:text-[8px]">
                          {item.instructor.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 print:text-slate-900 print:text-[10px]">{item.instructor.fullName}</div>
                          {item.instructor.phone ? (
                            <a
                              href={`tel:${item.instructor.phone.replace(/\s+/g, '')}`}
                              className="inline-flex items-center gap-1 text-[10px] print:text-[8.5px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                              title={`Call ${item.instructor.fullName}`}
                            >
                              <Phone className="w-2.5 h-2.5 text-emerald-600 print:hidden" />
                              <span>{item.instructor.phone}</span>
                            </a>
                          ) : (
                            <div className="text-[10px] print:text-[8.5px] text-slate-400 print:text-slate-500">@{item.instructor.username}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 print:px-1.5 print:py-1 text-center font-medium print:text-slate-800">{item.morningCount}</td>
                    <td className="px-3 py-3 print:px-1.5 print:py-1 text-center font-medium print:text-slate-800">{item.afternoonCount}</td>
                    <td className="px-3 py-3 print:px-1.5 print:py-1 text-center font-medium">
                      {item.sundayCount > 0 ? (
                        <span className="text-purple-700 dark:text-purple-400 font-bold">{item.sundayCount}</span>
                      ) : (
                        <span className="text-slate-400 print:text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 print:px-1.5 print:py-1 text-center">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm print:text-xs">{item.totalSessions}</span>
                    </td>
                    <td className="px-3 py-3 print:px-1.5 print:py-1 text-center font-semibold text-slate-800 dark:text-slate-200 print:text-slate-800">
                      {totalHours} hrs
                    </td>
                    <td className="px-4 py-3 print:px-2 print:py-1 text-center">
                      {item.nightShiftsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-indigo-500/15 print:bg-indigo-100 text-indigo-700 dark:text-indigo-400 font-bold px-2 py-0.5 rounded text-[11px] print:text-[8px]">
                          <Moon className="w-3 h-3 text-amber-500 print:text-indigo-700" />
                          <span>{item.nightShiftsCount} Night{item.nightShiftsCount > 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 print:text-slate-500 text-[11px] print:text-[8px]">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 print:px-2 print:py-1 text-center">
                      {item.onLeaveDates.length > 0 ? (
                        <span className="bg-rose-500/15 print:bg-rose-100 text-rose-700 dark:text-rose-400 font-semibold px-2 py-0.5 rounded text-[10px] print:text-[8px]">
                          {item.onLeaveDates.length} day{item.onLeaveDates.length > 1 ? 's' : ''} away
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] print:text-[8px] flex items-center justify-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 print:text-emerald-700" /> Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 print:px-2 print:py-1 text-center">{balanceBadge}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
