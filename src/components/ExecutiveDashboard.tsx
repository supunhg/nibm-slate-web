import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  ExecutiveStatusReport,
  LeaveRequest,
  DutyAssignment,
  RosterWeek,
  NightShift,
  AuditLog,
} from '@/types';
import {
  Shield,
  Clock,
  Moon,
  CheckCircle2,
  AlertCircle,
  Coffee,
  BookOpen,
  MapPin,
  Check,
  X,
  Phone,
  ScrollText,
  Filter,
  Sparkles,
} from 'lucide-react';
import { reviewLeaveAction, getExecutiveReportAction, getAuditLogsAction } from '@/lib/actions';
import { WeeklyScheduleView } from '@/components/WeeklyScheduleView';
import { AiCopilotDrawer } from './AiCopilotDrawer';
import { formatApplicationDateTime } from '@/lib/roster-utils';
import { PageHeader } from './ui/PageHeader';
import { useDialog } from './DialogProvider';
import { Select } from './ui/Select';
import { Segmented } from './ui/Segmented';
import { DatePicker } from './ui/DatePicker';

const AUDIT_ACTION_LABELS: Record<string, string> = {
  DUTY_ASSIGNED: 'Duty Assigned',
  DUTY_REMOVED: 'Duty Removed',
  NIGHT_DUTY_SET: 'Night Duty Set',
  LEAVE_REQUESTED: 'Leave Requested',
  LEAVE_APPROVED: 'Leave Approved',
  LEAVE_REJECTED: 'Leave Rejected',
  ROSTER_PUBLISHED: 'Roster Published',
  WEEK_CLONED: 'Week Cloned',
  CATALOG_UPDATED: 'Catalog Updated',
};

const AUDIT_ACTION_STYLES: Record<string, string> = {
  DUTY_ASSIGNED: 'bg-indigo-500/15 text-indigo-400',
  DUTY_REMOVED: 'bg-rose-500/15 text-rose-400',
  NIGHT_DUTY_SET: 'bg-amber-500/15 text-amber-400',
  LEAVE_REQUESTED: 'bg-slate-700 text-slate-300',
  LEAVE_APPROVED: 'bg-emerald-500/15 text-emerald-400',
  LEAVE_REJECTED: 'bg-rose-500/15 text-rose-400',
  ROSTER_PUBLISHED: 'bg-blue-500/15 text-blue-400',
  WEEK_CLONED: 'bg-purple-500/15 text-purple-400',
  CATALOG_UPDATED: 'bg-teal-500/15 text-teal-400',
};

interface ExecutiveDashboardProps {
  currentUser: User;
  initialReport: ExecutiveStatusReport;
  pendingLeaves: LeaveRequest[];
  allInstructors: User[];
  rosterWeek?: RosterWeek;
  dutyAssignments?: DutyAssignment[];
  nightShifts?: NightShift[];
  leaveRequests?: LeaveRequest[];
  onRefresh: () => void;
  onWeekChange?: (newStartDate: string) => void;
  initialViewMode?: 'daily' | 'weekly';
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  currentUser,
  initialReport,
  pendingLeaves,
  allInstructors,
  rosterWeek,
  dutyAssignments,
  nightShifts,
  leaveRequests,
  onRefresh,
  onWeekChange,
  initialViewMode = 'daily',
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>(initialViewMode);
  const [selectedDate, setSelectedDate] = useState<string>(initialReport.date);
  const [slotFilter, setSlotFilter] = useState<string>('ALL');
  const [report, setReport] = useState<ExecutiveStatusReport>(initialReport);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const { notify } = useDialog();

  // AI Co-Pilot Drawer State
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAiDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---- Governance / Audit Trail Drawer ----
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('ALL');
  const [auditStartDate, setAuditStartDate] = useState<string>('');
  const [auditEndDate, setAuditEndDate] = useState<string>('');

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const logs = await getAuditLogsAction({
        action: auditActionFilter,
        userId: auditActorFilter,
        startDate: auditStartDate || undefined,
        endDate: auditEndDate || undefined,
      });
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, [auditActionFilter, auditActorFilter, auditStartDate, auditEndDate]);

  // Refetches from the server action whenever the drawer opens or a filter
  // changes -- the standard "fetch data on dependency change" effect.
  useEffect(() => {
    if (auditDrawerOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAuditLogs();
    }
  }, [auditDrawerOpen, fetchAuditLogs]);

  useEffect(() => {
    if (!auditDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAuditDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [auditDrawerOpen]);

  // Handle date or slot change
  const handleFilterChange = async (newDate: string, newSlot: string) => {
    setSelectedDate(newDate);
    setSlotFilter(newSlot);
    try {
      const updated = await getExecutiveReportAction(newDate, newSlot);
      setReport(updated);
    } catch (err) {
      console.error('Error fetching executive report:', err);
    }
  };

  // Quick leave review from cockpit
  const handleQuickReview = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    setReviewingId(leaveId);
    try {
      const res = await reviewLeaveAction(
        leaveId,
        status,
        status === 'APPROVED' ? 'Approved via Live Status' : 'Rejected via Live Status'
      );
      onRefresh();
      if (!res.success) await notify({ title: 'Could not review', message: res.error, danger: true });
      else if (res.warning) await notify({ title: 'Leave approved', message: res.warning });
      // Re-fetch report
      const updated = await getExecutiveReportAction(selectedDate, slotFilter);
      setReport(updated);
    } catch (err) {
      console.error('Error reviewing leave:', err);
    } finally {
      setReviewingId(null);
    }
  };

  const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<><Shield className="size-3" /> {currentUser.role === 'EXECUTIVE' ? 'Executive cockpit' : 'Live status'}</>}
        title="Daily readiness"
        description="Who is teaching, who is free and who is away, one time block at a time."
        actions={
          <>
            {rosterWeek && (currentUser.role === 'EXECUTIVE' || currentUser.role === 'ADMIN' || currentUser.role === 'DEMONSTRATOR') && (
              <button onClick={() => setAiDrawerOpen(true)} className="btn btn-secondary" title="AI Roster Co-Pilot & Radar (Ctrl+K / ⌘K)">
                <Sparkles className="text-indigo-400" />
                AI Co-Pilot
              </button>
            )}
            {(currentUser.role === 'EXECUTIVE' || currentUser.role === 'ADMIN') && (
              <button onClick={() => setAuditDrawerOpen(true)} className="btn btn-secondary">
                <ScrollText className="text-neutral-400" />
                Activity log
              </button>
            )}
          </>
        }
      />

      {viewMode === 'weekly' && rosterWeek && dutyAssignments && nightShifts && leaveRequests ? (
        <WeeklyScheduleView
          rosterWeek={rosterWeek}
          dutyAssignments={dutyAssignments}
          nightShifts={nightShifts}
          leaveRequests={leaveRequests}
          allInstructors={allInstructors}
          onWeekChange={onWeekChange}
          onSelectDateForCockpit={(dateStr) => {
            handleFilterChange(dateStr, slotFilter);
            setViewMode('daily');
          }}
        />
      ) : (
        <>
          {/* Date + slot toolbar */}
          <div className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5 print:hidden">
            <div className="flex items-center gap-2">
              <DatePicker
                label="Viewing date"
                size="sm"
                value={selectedDate}
                onChange={(v) => handleFilterChange(v, slotFilter)}
                className="w-auto min-w-44"
              />
              <button
                onClick={() => handleFilterChange(new Date().toISOString().split('T')[0], slotFilter)}
                className="btn btn-secondary"
              >
                Today
              </button>
              <span className="hidden text-xs text-neutral-500 lg:inline">{dayOfWeek}</span>
            </div>
            <Segmented
              label="Time block"
              value={slotFilter}
              onChange={(v) => handleFilterChange(selectedDate, v)}
              options={[
                { value: 'ALL', label: 'All day' },
                { value: 'Morning (09:00 - 12:00)', label: 'Morning' },
                { value: 'Afternoon (13:00 - 16:00)', label: 'Afternoon' },
                { value: 'Sunday CCS', label: 'Sunday CCS' },
              ]}
            />
          </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 stagger-children">
        {[
          { label: 'Cadre', value: allInstructors.length, hint: 'members', dot: 'bg-neutral-400' },
          { label: 'On duty', value: report.onDuty.length, hint: 'teaching now', dot: 'bg-emerald-500', pulse: true },
          { label: 'Free standby', value: report.freeStandby.length, hint: 'available', dot: 'bg-amber-400' },
          { label: 'On leave', value: report.onLeave.length, hint: 'away', dot: 'bg-rose-500' },
        ].map((kpi) => (
          <div key={kpi.label} className="surface-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <span className={`size-2 rounded-full ${kpi.dot} ${kpi.pulse ? 'animate-pulse' : ''}`} />
              {kpi.label}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-white">{kpi.value}</span>
              <span className="text-xs text-neutral-500">{kpi.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tonight's Night Duty Callout Banner */}
      <div className="surface-card flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Night Duty ({dayOfWeek} Night)
              </span>
              <span className="text-[10px] bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-semibold border border-slate-200 dark:border-white/10">
                7-Day Rotation
              </span>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 flex flex-wrap items-center gap-2">
              {report.nightDutyInstructor ? (
                <>
                  <span>
                    Designated Officer: <span className="font-semibold text-neutral-900 dark:text-white">{report.nightDutyInstructor.fullName}</span>
                  </span>
                  {report.nightDutyInstructor.phone && (
                    <a
                      href={`tel:${report.nightDutyInstructor.phone.replace(/\s+/g, '')}`}
                      className="btn btn-secondary btn-sm ml-1"
                      title={`Call ${report.nightDutyInstructor.fullName}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call: {report.nightDutyInstructor.phone}</span>
                    </a>
                  )}
                </>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 italic font-normal text-sm">
                  No night shift assigned for this date yet.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Operational Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: ON DUTY */}
        <div className="surface-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5 dark:border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <span className="size-2 rounded-full bg-emerald-500"></span>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">On Duty (Teaching)</h3>
            </div>
            <span className="chip font-mono tabular-nums">
              {report.onDuty.length} Active
            </span>
          </div>

          <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[520px] stagger-children">
            {report.onDuty.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                <Coffee className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-medium">No teaching sessions scheduled</p>
                <p className="text-xs text-slate-400 mt-1">for this time block</p>
              </div>
            ) : (
              report.onDuty.map(({ instructor, assignment }) => (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5 transition-colors hover:border-neutral-300 dark:border-white/[0.06] dark:bg-white/[0.025] dark:hover:border-white/[0.12]"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">{instructor.fullName}</span>
                      {instructor.phone && (
                        <a
                          href={`tel:${instructor.phone.replace(/\s+/g, '')}`}
                          className="btn btn-secondary btn-sm h-7"
                          title={`Call ${instructor.fullName} (${instructor.phone})`}
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                    <span className="font-mono text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      {assignment.startTime === '09:00' && assignment.endTime === '16:00'
                        ? '09:00 - 16:00 (Full Day)'
                        : `${assignment.startTime} - ${assignment.endTime}`}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center space-x-1.5 font-medium text-slate-800 dark:text-slate-200">
                      <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{assignment.moduleName ?? assignment.dutyType}</span>
                    </div>
                    {assignment.notes && <p className="italic text-slate-500">{assignment.notes}</p>}
                    <div className="flex items-center justify-between text-slate-500 pt-1">
                      {assignment.batchName && (
                        <span className="chip">
                          Batch: {assignment.batchName}
                        </span>
                      )}
                      {assignment.roomLab && (
                        <span className="flex items-center space-x-1 text-slate-500 text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{assignment.roomLab}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: FREE / STANDBY (The critical requirement for Dr. Thisara!) */}
        <div className="surface-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5 dark:border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <span className="size-2 rounded-full bg-amber-400"></span>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Available / Free Standby</h3>
            </div>
            <span className="chip font-mono tabular-nums">
              {report.freeStandby.length} Available
            </span>
          </div>

          <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[520px] stagger-children">
            {report.freeStandby.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-medium">All instructors are assigned or on leave</p>
              </div>
            ) : (
              report.freeStandby.map((instructor) => (
                <div
                  key={instructor.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 transition-colors hover:border-neutral-300 dark:border-white/[0.06] dark:bg-white/[0.025] dark:hover:border-white/[0.12]"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-semibold text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-200">
                      {instructor.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">{instructor.fullName}</h4>
                      <p className="text-xs text-neutral-500">
                        {instructor.phone || 'Available in staff room'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {instructor.phone && (
                      <a
                        href={`tel:${instructor.phone.replace(/\s+/g, '')}`}
                        className="btn btn-secondary btn-sm h-7"
                        title={`Call ${instructor.fullName} directly`}
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    )}
                    
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-neutral-100 px-4 py-3 text-center text-[11px] text-neutral-500 dark:border-white/[0.06]">
            Not in class right now: available for invigilation, student queries or emergency cover.
          </div>
        </div>

        {/* Column 3: ON LEAVE */}
        <div className="surface-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5 dark:border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <span className="size-2 rounded-full bg-rose-500"></span>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">On Leave (Approved)</h3>
            </div>
            <span className="chip font-mono tabular-nums">
              {report.onLeave.length} Away
            </span>
          </div>

          <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[520px] stagger-children">
            {report.onLeave.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                <p className="text-sm font-medium">Full attendance!</p>
                <p className="text-xs text-slate-400 mt-1">No instructors on leave today.</p>
              </div>
            ) : (
              report.onLeave.map(({ instructor, leave }) => (
                <div
                  key={leave.id}
                  className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-3.5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-200 text-sm">{instructor.fullName}</span>
                      {instructor.phone && (
                        <a
                          href={`tel:${instructor.phone.replace(/\s+/g, '')}`}
                          className="h-6 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-200 dark:bg-white/[0.06] hover:bg-slate-300 dark:hover:bg-white/10 px-2 rounded-md transition-colors"
                          title={`Call ${instructor.fullName}`}
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] font-bold bg-rose-500/25 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full uppercase">
                      Leave
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">&quot;{leave.reason}&quot;</p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-between">
                    <span>
                      Duration: {leave.startDate} to {leave.endDate}
                    </span>
                    {leave.reviewedByName && <span>Signed by: {leave.reviewedByName}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pending Leave Requests Sign-Off Section (Dual Authority for Dr. Thisara) */}
      {pendingLeaves.length > 0 && (
        <div className="surface-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Leave requests awaiting review ({pendingLeaves.length})
              </h3>
            </div>
            <span className="hidden text-xs text-neutral-500 sm:inline">Approve or reject here</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingLeaves.filter((leave) => leave.instructorId !== currentUser.id).map((leave) => (
              <div
                key={leave.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-white/[0.06] dark:bg-white/[0.025]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{leave.instructorName}</span>
                    <span className="chip border-amber-500/25 font-mono text-amber-700 dark:text-amber-300">
                      {leave.startDate} {leave.startDate !== leave.endDate && `→ ${leave.endDate}`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>Applied: <strong className="text-slate-700 dark:text-slate-300 font-medium">{formatApplicationDateTime(leave.appliedAt || leave.createdAt)}</strong></span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-white/[0.05] p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08]">
                    <strong>Reason:</strong> {leave.reason}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-150 dark:border-white/[0.08]">
                  <button
                    disabled={reviewingId === leave.id}
                    onClick={() => handleQuickReview(leave.id, 'REJECTED')}
                    className="btn btn-danger"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    disabled={reviewingId === leave.id}
                    onClick={() => handleQuickReview(leave.id, 'APPROVED')}
                    className="btn btn-primary"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}

      {/* Governance / Audit Trail Drawer */}
      {auditDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm print:hidden animate-fade-in">
          <button
            aria-label="Close governance log drawer"
            onClick={() => setAuditDrawerOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative bg-white dark:bg-[#111111] w-full max-w-lg h-full shadow-2xl border-l border-slate-200 dark:border-white/[0.08] flex flex-col animate-drawer-in transition-colors">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] text-slate-900 dark:text-white">
              <div>
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Compliance Console</span>
                </div>
                <h3 className="text-lg font-semibold">Governance Log</h3>
              </div>
              <button
                onClick={() => setAuditDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer p-1 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.05] space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-bold">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Logs</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Action type"
                  size="sm"
                  value={auditActionFilter}
                  onChange={setAuditActionFilter}
                  options={[
                    { value: 'ALL', label: 'All actions' },
                    ...Object.entries(AUDIT_ACTION_LABELS).map(([code, label]) => ({ value: code, label })),
                  ]}
                />

                <Select
                  label="Team member"
                  size="sm"
                  value={auditActorFilter}
                  onChange={setAuditActorFilter}
                  options={[
                    { value: 'ALL', label: 'Everyone' },
                    ...[...allInstructors, currentUser]
                      .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)
                      .map((u) => ({ value: u.id, label: u.fullName })),
                  ]}
                />

                <DatePicker label="From date" placeholder="From" size="sm" value={auditStartDate} onChange={setAuditStartDate} max={auditEndDate || undefined} />
                <DatePicker label="To date" placeholder="To" size="sm" value={auditEndDate} onChange={setAuditEndDate} min={auditStartDate || undefined} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.06]">
              {auditLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading logs...</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No governance events match the current filters.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          AUDIT_ACTION_STYLES[log.action] || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {AUDIT_ACTION_LABELS[log.action] || log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-300">{log.metadata}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      by <span className="font-semibold text-slate-600 dark:text-slate-400">{log.userName || 'System'}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Roster Co-Pilot Drawer */}
      {rosterWeek && (
        <AiCopilotDrawer
          isOpen={aiDrawerOpen}
          onClose={() => setAiDrawerOpen(false)}
          rosterWeek={rosterWeek}
          dutyAssignments={dutyAssignments || []}
          nightShifts={nightShifts || []}
          leaveRequests={leaveRequests || []}
          allInstructors={allInstructors}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
