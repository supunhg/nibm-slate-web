'use client';

import React, { useState } from 'react';
import { User, LeaveRequest } from '@/types';
import { Clock } from 'lucide-react';
import { reviewLeaveAction } from '@/lib/actions';
import { formatApplicationDateTime } from '@/lib/roster-utils';

interface LeaveManagementProps {
  currentUser: User;
  leaveRequests: LeaveRequest[];
  onRefresh: () => void;
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({
  currentUser,
  leaveRequests,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [actionId, setActionId] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const canApprove =
    currentUser.role === 'DEMONSTRATOR' || currentUser.role === 'EXECUTIVE' || currentUser.role === 'ADMIN';

  const filteredRequests = leaveRequests.filter((l) => {
    if (filter === 'ALL') return true;
    return l.status === filter;
  });

  const handleReview = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    try {
      await reviewLeaveAction(leaveId, status, comment.trim());
      setActionId(null);
      setComment('');
      onRefresh();
    } catch (err) {
      console.error('Error updating leave status:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#0d1424] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 text-sm font-semibold mb-1">
              <Clock className="w-4 h-4" />
              <span>Leave & Absence Authority</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Leave Management & Review
            </h2>
          </div>

          {/* Current Reviewer Identity Badge */}
          <div className="bg-slate-50 dark:bg-[#11192d] p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 text-right">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
              Reviewing Authority
            </span>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
              {currentUser.fullName} ({currentUser.role})
            </span>
            {!canApprove && (
              <span className="text-[10px] text-rose-500 dark:text-rose-400 block mt-0.5">
                (View-only: your role cannot approve or reject leave requests)
              </span>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium mr-2">Filter by Status:</span>
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer active:scale-95 ${
                filter === st
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {st} ({leaveRequests.filter((l) => (st === 'ALL' ? true : l.status === st)).length})
            </button>
          ))}
        </div>
      </div>

      {/* Leave Requests Table / Cards */}
      <div className="bg-white dark:bg-[#0d1424] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11192d]/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
            Applications Record ({filteredRequests.length})
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Sorted by submission date</span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
            No leave requests found for the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredRequests.map((leave) => (
              <div key={leave.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-base">{leave.instructorName}</span>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                          leave.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : leave.status === 'REJECTED'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                        }`}
                      >
                        {leave.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>
                        Dates:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {leave.startDate} {leave.startDate !== leave.endDate && `to ${leave.endDate}`}
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Applied: <strong>{formatApplicationDateTime(leave.appliedAt || leave.createdAt)}</strong></span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 bg-slate-100 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/60 inline-block max-w-xl">
                      <strong>Reason:</strong> {leave.reason}
                    </p>

                    {leave.reviewedByName && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                        Reviewed by <strong className="text-slate-700 dark:text-slate-300">{leave.reviewedByName}</strong>:{' '}
                        <span className="italic">&ldquo;{leave.reviewComment}&rdquo;</span>
                      </div>
                    )}
                  </div>

                  {/* Actions if Pending and user is Authorized */}
                  {leave.status === 'PENDING' && canApprove && (
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      {actionId === leave.id ? (
                        <div className="flex flex-col gap-2 bg-slate-50 dark:bg-[#11192d] p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <input
                            type="text"
                            placeholder="Optional feedback notes..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="text-xs bg-white dark:bg-[#080b12] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setActionId(null)}
                              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 cursor-pointer active:scale-95"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() => handleReview(leave.id, 'REJECTED')}
                              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-all cursor-pointer active:scale-95"
                            >
                              Decline
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() => handleReview(leave.id, 'APPROVED')}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActionId(leave.id)}
                          className="text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                        >
                          Review Application
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
