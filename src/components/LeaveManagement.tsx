'use client';

import React, { useState } from 'react';
import { User, LeaveRequest } from '@/types';
import { CalendarDays, Check, ClipboardCheck, Clock, Inbox, Loader2, MessageSquare, Send, Undo2, X } from 'lucide-react';
import { reviewLeaveAction, submitLeaveAction, withdrawLeaveAction } from '@/lib/actions';
import { useDialog } from './DialogProvider';
import { DateRangePicker } from './ui/DatePicker';
import { todayYmd } from '@/lib/week-start';
import { formatApplicationDateTime } from '@/lib/roster-utils';
import { PageHeader, StatusPill } from './ui/PageHeader';
import { Segmented } from './ui/Segmented';

interface LeaveManagementProps {
  currentUser: User;
  leaveRequests: LeaveRequest[];
  onRefresh: () => void;
}

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const STATUS_TONE = { APPROVED: 'emerald', REJECTED: 'rose', PENDING: 'amber', CANCELLED: 'neutral' } as const;
const STATUS_LABEL = { APPROVED: 'Approved', REJECTED: 'Rejected', PENDING: 'Pending', CANCELLED: 'Cancelled' } as const;

export const LeaveManagement: React.FC<LeaveManagementProps> = ({ currentUser, leaveRequests, onRefresh }) => {
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [actionId, setActionId] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [processing, setProcessing] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const { confirm, notify } = useDialog();
  const today = todayYmd();
  // Notified Leave (Demonstrators tell the team instead of asking).
  const isDemonstrator = currentUser.role === 'DEMONSTRATOR';
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeDates, setNoticeDates] = useState({ from: '', to: '' });
  const [noticeReason, setNoticeReason] = useState('');
  const [noticeBusy, setNoticeBusy] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const canWithdraw = (l: LeaveRequest) =>
    l.instructorId === currentUser.id && (l.status === 'PENDING' || l.status === 'APPROVED') && l.endDate >= today;

  const handleNotice = async () => {
    if (!noticeDates.from || !noticeReason.trim()) {
      await notify({ title: 'Almost there', message: 'Pick your dates and add a short reason.' });
      return;
    }
    setNoticeBusy(true);
    try {
      const res = await submitLeaveAction(noticeDates.from, noticeDates.to || noticeDates.from, noticeReason.trim());
      setNoticeOpen(false);
      setNoticeDates({ from: '', to: '' });
      setNoticeReason('');
      onRefresh();
      await notify({
        title: 'Leave noted',
        message: `The other reviewers have been told.${res.warning ? `\n\n${res.warning}` : ''}`,
      });
    } finally {
      setNoticeBusy(false);
    }
  };

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

  const canApprove =
    currentUser.role === 'DEMONSTRATOR' || currentUser.role === 'EXECUTIVE' || currentUser.role === 'ADMIN';

  const count = (st: Filter) => leaveRequests.filter((l) => (st === 'ALL' ? true : l.status === st)).length;
  const filteredRequests = leaveRequests.filter((l) => filter === 'ALL' || l.status === filter);

  const handleReview = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessing(status);
    try {
      const res = await reviewLeaveAction(leaveId, status, comment.trim());
      setActionId(null);
      setComment('');
      onRefresh();
      if (!res.success) await notify({ title: 'Could not review', message: res.error, danger: true });
      else if (res.warning) await notify({ title: 'Leave approved', message: res.warning });
    } catch (err) {
      console.error('Error updating leave status:', err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<><ClipboardCheck className="size-3" /> Leave</>}
        title="Leave"
        description={
          canApprove
            ? 'Review Cadre leave. Approved leave blocks Duty and Night Duty on those dates.'
            : 'You can view leave, but your role cannot review it.'
        }
        actions={
          isDemonstrator && (
            <button type="button" onClick={() => setNoticeOpen((v) => !v)} className="btn btn-secondary">
              <Send className="text-neutral-400" />
              Notify my leave
            </button>
          )
        }
      />

      {isDemonstrator && (
        <div className="collapse-panel" data-open={noticeOpen || undefined} inert={!noticeOpen}>
          <div className="collapse-inner">
            <div className="surface-card space-y-3 p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Notify your leave</h3>
                <p className="mt-0.5 text-xs text-neutral-500">
                  As a Demonstrator your leave is approved straight away; the other reviewers are notified.
                </p>
              </div>
              <DateRangePicker
                label="Leave dates"
                placeholder="Tap a start day, then an end day"
                className="w-full"
                min={today}
                value={noticeDates}
                onChange={setNoticeDates}
              />
              <input
                type="text"
                value={noticeReason}
                onChange={(e) => setNoticeReason(e.target.value)}
                placeholder="Reason, e.g. medical appointment"
                className="field"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setNoticeOpen(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="button" onClick={handleNotice} disabled={noticeBusy} className="btn btn-primary">
                  {noticeBusy ? <Loader2 className="animate-spin" /> : <Send />}
                  Notify team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented<Filter>
          label="Filter by status"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setActionId(null);
          }}
          options={(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ALL'] as const).map((st) => ({
            value: st,
            label: (
              <>
                {st === 'ALL' ? 'All' : STATUS_LABEL[st]}
                <span className="font-mono text-[10px] tabular-nums text-neutral-400">{count(st)}</span>
              </>
            ),
          }))}
        />
        <span className="text-xs text-neutral-500">Newest first</span>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="surface-card flex flex-col items-center px-6 py-16 text-center">
          <div className="flex size-12 animate-pop-in items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-white/[0.05]">
            <Inbox className="size-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
            {filter === 'PENDING' ? 'All caught up' : 'Nothing here'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {filter === 'PENDING' ? 'There are no leave requests waiting for review.' : 'No leave requests match this filter.'}
          </p>
        </div>
      ) : (
        <ul key={filter} className="space-y-2.5 stagger-children">
          {filteredRequests.map((leave) => {
            const reviewing = actionId === leave.id;
            return (
              <li key={leave.id} className="surface-card p-4 sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-neutral-900 dark:text-white">{leave.instructorName}</span>
                      <StatusPill tone={STATUS_TONE[leave.status]} pulse={leave.status === 'PENDING'}>
                        {STATUS_LABEL[leave.status]}
                      </StatusPill>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                          {leave.startDate}
                          {leave.startDate !== leave.endDate && ` → ${leave.endDate}`}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Applied {formatApplicationDateTime(leave.appliedAt || leave.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{leave.reason}</p>
                    {leave.reviewedByName && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-neutral-500">
                        <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">{leave.reviewedByName}</span>
                          {leave.reviewComment ? <>: &ldquo;{leave.reviewComment}&rdquo;</> : ' reviewed this request'}
                        </span>
                      </p>
                    )}
                  </div>

                  {canWithdraw(leave) && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleWithdraw(leave)}
                        disabled={withdrawingId === leave.id}
                        className="btn btn-secondary"
                      >
                        {withdrawingId === leave.id ? <Loader2 className="animate-spin" /> : <Undo2 />}
                        Withdraw
                      </button>
                    </div>
                  )}

                  {leave.status === 'PENDING' && canApprove && leave.instructorId !== currentUser.id && !reviewing && (
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => setActionId(leave.id)} className="btn btn-secondary">
                        Review
                      </button>
                    </div>
                  )}
                </div>

                {leave.status === 'PENDING' && canApprove && leave.instructorId !== currentUser.id && (
                  <div className="collapse-panel" data-open={reviewing || undefined} inert={!reviewing}>
                    <div className="collapse-inner">
                      <div className="mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center dark:border-white/[0.06]">
                        <input
                          type="text"
                          placeholder="Add a note for the instructor (optional)"
                          value={reviewing ? comment : ''}
                          onChange={(e) => setComment(e.target.value)}
                          className="field h-9 flex-1 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setActionId(null);
                              setComment('');
                            }}
                            className="btn btn-ghost"
                          >
                            Cancel
                          </button>
                          <button disabled={!!processing} onClick={() => handleReview(leave.id, 'REJECTED')} className="btn btn-danger">
                            {processing === 'REJECTED' ? <Loader2 className="animate-spin" /> : <X />}
                            Reject
                          </button>
                          <button disabled={!!processing} onClick={() => handleReview(leave.id, 'APPROVED')} className="btn btn-primary">
                            {processing === 'APPROVED' ? <Loader2 className="animate-spin" /> : <Check />}
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
