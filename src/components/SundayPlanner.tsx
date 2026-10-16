'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  RosterWeek,
  DutyAssignment,
  NightShift,
  LeaveRequest,
  AcademicCatalog,
} from '@/types';
import {
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Send,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
  Clock,
  Phone,
  MessageCircle,
  ClipboardCopy,
  X,
  CopyPlus,
  LibraryBig,
  Pencil,
  Check,
  FileText,
} from 'lucide-react';
import {
  addDutyAction,
  deleteDutyAction,
  setNightShiftAction,
  removeNightShiftAction,
  publishRosterAction,
  cloneWeekAction,
  addBatchAction,
  removeBatchAction,
  updateBatchAction,
  addRoomAction,
  removeRoomAction,
  updateRoomAction,
  addModuleAction,
  removeModuleAction,
  updateModuleAction,
  addDutyTypeAction,
  removeDutyTypeAction,
  updateDutyTypeAction,
} from '@/lib/actions';
import { getMatchingOppositeSlotDuty, mergeDutyAssignments } from '@/lib/roster-utils';
import { useDialog } from './DialogProvider';
import { AiCopilotDrawer } from './AiCopilotDrawer';
import { PageHeader, StatusPill } from './ui/PageHeader';

interface SundayPlannerProps {
  rosterWeek: RosterWeek;
  dutyAssignments: DutyAssignment[];
  nightShifts: NightShift[];
  leaveRequests: LeaveRequest[];
  allInstructors: User[];
  catalog: AcademicCatalog;
  onRefresh: () => void;
  onWeekChange?: (newStartDate: string) => void;
}

export const SundayPlanner: React.FC<SundayPlannerProps> = ({
  rosterWeek,
  dutyAssignments,
  nightShifts,
  leaveRequests,
  allInstructors,
  catalog,
  onRefresh,
  onWeekChange,
}) => {
  const { confirm, notify } = useDialog();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    date: string;
    slotLabel: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  // Form state
  const [instructorId, setInstructorId] = useState<string>('');
  const [dutyType, setDutyType] = useState<string>('');
  const [batchName, setBatchName] = useState<string>('');
  const [moduleName, setModuleName] = useState<string>('');
  const [roomLab, setRoomLab] = useState<string>('Lab 01');
  const [dutyNotes, setDutyNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneMessage, setCloneMessage] = useState<string | null>(null);

  // Dynamic Week Starting Date State (User can plan starting from ANY date!)
  const [planningStartDate, setPlanningStartDate] = useState<string>(rosterWeek.startDate);
  const [prevRosterStartDate, setPrevRosterStartDate] = useState<string>(rosterWeek.startDate);

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

  // Generate the 7 days of the week starting from ANY chosen start date
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(planningStartDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      dateStr,
      dayName,
      formattedDate,
      isSunday: d.getDay() === 0, // dynamically detect Sunday for CCS evening slot
    };
  });

  // Calculate workload per instructor this week
  const workloadMap: Record<string, { sessions: number; nightShifts: number }> = {};
  allInstructors.forEach((inst) => {
    workloadMap[inst.id] = { sessions: 0, nightShifts: 0 };
  });

  dutyAssignments.forEach((a) => {
    if (workloadMap[a.instructorId]) {
      workloadMap[a.instructorId].sessions += 1;
    }
  });

  nightShifts.forEach((s) => {
    if (workloadMap[s.instructorId]) {
      workloadMap[s.instructorId].nightShifts += 1;
    }
  });

  const [repeatForOtherSlot, setRepeatForOtherSlot] = useState(false);

  // Open modal for a specific day and slot
  const handleOpenAddModal = (dateStr: string, slotLabel: string, startTime: string, endTime: string) => {
    setModalData({ date: dateStr, slotLabel, startTime, endTime });
    setInstructorId('');
    setDutyType('');
    setBatchName('');
    setModuleName('');
    setDutyNotes('');
    setRepeatForOtherSlot(false);
    setFormError(null);
    setModalOpen(true);
  };

  // 1-Click Copy a session to the opposite slot (e.g. Morning -> Afternoon)
  const handleCopyDutyToSlot = async (
    assignment: DutyAssignment,
    targetStartTime: string,
    targetEndTime: string,
    targetSlotLabel: string
  ) => {
    setIsSubmitting(true);
    const res = await addDutyAction({
      rosterWeekId: rosterWeek.id,
      instructorId: assignment.instructorId,
      dutyDate: assignment.dutyDate,
      slotLabel: targetSlotLabel,
      startTime: targetStartTime,
      endTime: targetEndTime,
      dutyType: assignment.dutyType,
      batchName: assignment.batchName,
      moduleName: assignment.moduleName,
      roomLab: assignment.roomLab,
      notes: assignment.notes,
    });
    setIsSubmitting(false);

    if (!res.success) {
      await notify(res.error || 'Failed to copy session');
    } else {
      onRefresh();
    }
  };

  // Submit slot assignment
  const handleSaveDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalData) return;
    if (!instructorId) {
      setFormError('Please select an instructor');
      return;
    }
    const trimmedDuty = dutyType.trim();
    if (!trimmedDuty) {
      setFormError('Please enter a duty type');
      return;
    }
    const isTeaching = trimmedDuty.toLowerCase() === 'teaching duty';
    if (isTeaching && !batchName.trim()) {
      setFormError('Please enter a batch name');
      return;
    }
    if (isTeaching && !moduleName.trim()) {
      setFormError('Please enter a module name');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const dutyFields = isTeaching
      ? { batchName: batchName.trim(), moduleName: moduleName.trim(), notes: undefined }
      : { batchName: undefined, moduleName: undefined, notes: dutyNotes.trim() || undefined };

    const effectiveDutyType = isTeaching ? 'Teaching Duty' : trimmedDuty;

    const res = await addDutyAction({
      rosterWeekId: rosterWeek.id,
      instructorId,
      dutyDate: modalData.date,
      slotLabel: modalData.slotLabel,
      startTime: modalData.startTime,
      endTime: modalData.endTime,
      dutyType: effectiveDutyType,
      roomLab: roomLab.trim(),
      ...dutyFields,
    });

    if (!res.success) {
      setIsSubmitting(false);
      setFormError(res.error || 'Failed to assign duty');
      return;
    }

    // If "Also assign to other slot" is checked (Full Day session)
    if (repeatForOtherSlot) {
      const isMorning = modalData.startTime === '09:00';
      const otherStartTime = isMorning ? '13:00' : '09:00';
      const otherEndTime = isMorning ? '16:00' : '12:00';
      const otherSlotLabel = isMorning ? 'Afternoon (13:00 - 16:00)' : 'Morning (09:00 - 12:00)';

      await addDutyAction({
        rosterWeekId: rosterWeek.id,
        instructorId,
        dutyDate: modalData.date,
        slotLabel: otherSlotLabel,
        startTime: otherStartTime,
        endTime: otherEndTime,
        dutyType: effectiveDutyType,
        roomLab: roomLab.trim(),
        ...dutyFields,
      });
    }

    setIsSubmitting(false);
    setModalOpen(false);
    onRefresh();
  };

  // Remove duty slot
  const handleDeleteDuty = async (id: string) => {
    if (await confirm({ message: 'Remove this duty allocation?', confirmLabel: 'Remove', danger: true })) {
      await deleteDutyAction(id);
      onRefresh();
    }
  };

  // Set (or clear) night shift instructor
  const handleSetNightShift = async (shiftDate: string, newInstructorId: string) => {
    if (!newInstructorId) {
      if (await confirm({ message: 'Remove night duty for this date?', confirmLabel: 'Remove', danger: true })) {
        await removeNightShiftAction(shiftDate);
        onRefresh();
      }
      return;
    }
    const res = await setNightShiftAction(rosterWeek.id, shiftDate, newInstructorId);
    if (!res.success) {
      await notify(res.error || 'Failed to set night duty.');
    } else {
      onRefresh();
    }
  };

  // Publish roster
  const handlePublish = async () => {
    const proceed = await confirm({
      title: 'Publish roster',
      message: 'Publish this weekly roster? All instructors and Dr. Thisara will see the finalized schedule.',
      confirmLabel: 'Publish',
    });
    if (proceed) {
      await publishRosterAction(rosterWeek.id);
      setPublishMessage('Roster published successfully!');
      setTimeout(() => setPublishMessage(null), 4000);
      onRefresh();
    }
  };

  // Clone the preceding 7 days' assignments and night shifts into this week's draft
  const handleCloneWeek = async () => {
    const proceed = await confirm({
      title: 'Clone previous week',
      message: `Clone last week's duties and night shifts into the week starting ${planningStartDate}? Collisions and approved-leave conflicts will be skipped automatically.`,
      confirmLabel: 'Clone',
    });
    if (!proceed) {
      return;
    }
    setIsCloning(true);
    setCloneMessage(null);
    try {
      const result = await cloneWeekAction(planningStartDate);
      const skippedCount = result.skippedDuties.length + result.skippedNightShifts.length;
      setCloneMessage(
        `Cloned ${result.clonedDuties} duty session${result.clonedDuties === 1 ? '' : 's'} and ${result.clonedNightShifts} night shift${
          result.clonedNightShifts === 1 ? '' : 's'
        } from the previous week.${skippedCount > 0 ? ` ${skippedCount} skipped due to conflicts.` : ''}`
      );
      setTimeout(() => setCloneMessage(null), 8000);
      onRefresh();
    } finally {
      setIsCloning(false);
    }
  };

  // Helper to check if instructor is on approved leave on given date
  const isInstructorOnLeave = (instId: string, dateStr: string) => {
    return leaveRequests.some(
      (l) => l.instructorId === instId && l.status === 'APPROVED' && dateStr >= l.startDate && dateStr <= l.endDate
    );
  };

  // ---- Academic Catalog Manager (dynamic batches & rooms/labs) ----
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  const [newDutyTypeName, setNewDutyTypeName] = useState('');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogBusy, setCatalogBusy] = useState(false);

  useEffect(() => {
    if (!catalogModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCatalogModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [catalogModalOpen]);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogBusy(true);
    setCatalogError(null);
    const res = await addBatchAction(newBatchName);
    setCatalogBusy(false);
    if (!res.success) {
      setCatalogError(res.error || 'Failed to add batch');
      return;
    }
    setNewBatchName('');
    onRefresh();
  };

  const handleRemoveBatch = async (name: string) => {
    setCatalogBusy(true);
    setCatalogError(null);
    const res = await removeBatchAction(name);
    setCatalogBusy(false);
    if (!res.success) {
      setCatalogError(res.error || 'Failed to remove batch');
      return;
    }
    onRefresh();
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogBusy(true);
    setCatalogError(null);
    const res = await addRoomAction(newRoomName);
    setCatalogBusy(false);
    if (!res.success) {
      setCatalogError(res.error || 'Failed to add room/lab');
      return;
    }
    setNewRoomName('');
    onRefresh();
  };

  const handleRemoveRoom = async (name: string) => {
    setCatalogBusy(true);
    setCatalogError(null);
    const res = await removeRoomAction(name);
    setCatalogBusy(false);
    if (!res.success) {
      setCatalogError(res.error || 'Failed to remove room/lab');
      return;
    }
    onRefresh();
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogBusy(true);
    setCatalogError(null);
    const res = await addModuleAction(newModuleName);
    setCatalogBusy(false);
    if (!res.success) {
      setCatalogError(res.error || 'Failed to add module');
      return;
    }
    setNewModuleName('');
    onRefresh();
  };

  const handleRemoveModule = async (name: string) => {
    setCatalogBusy(true);
    setCatalogError(null);
    const res = await removeModuleAction(name);
    setCatalogBusy(false);
    if (!res.success) {
      setCatalogError(res.error || 'Failed to remove module');
      return;
    }
    onRefresh();
  };

  const handleAddDutyType = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogBusy(true);
    setCatalogError(null);
    const res = await addDutyTypeAction(newDutyTypeName);
    setCatalogBusy(false);
    if (!res.success) {
      setCatalogError(res.error || 'Failed to add duty type');
      return;
    }
    setNewDutyTypeName('');
    onRefresh();
  };

  const handleRemoveDutyType = async (name: string) => {
    setCatalogBusy(true);
    setCatalogError(null);
    const res = await removeDutyTypeAction(name);
    setCatalogBusy(false);
    if (!res.success) {
      setCatalogError(res.error || 'Failed to remove duty type');
      return;
    }
    onRefresh();
  };

  // Inline "save to list" from the Assign Teaching Duty form itself -- lets
  // a demonstrator type a one-off module/room and permanently add it to the
  // catalog without leaving the form to open the separate manager.
  const handleSaveBatchInline = async () => {
    setCatalogBusy(true);
    const res = await addBatchAction(batchName);
    setCatalogBusy(false);
    if (res.success) onRefresh();
    else await notify(res.error || 'Failed to save batch to the catalog.');
  };

  const handleSaveModuleInline = async () => {
    setCatalogBusy(true);
    const res = await addModuleAction(moduleName);
    setCatalogBusy(false);
    if (res.success) onRefresh();
    else await notify(res.error || 'Failed to save module to the catalog.');
  };

  const handleSaveRoomInline = async () => {
    setCatalogBusy(true);
    const res = await addRoomAction(roomLab);
    setCatalogBusy(false);
    if (res.success) onRefresh();
    else await notify(res.error || 'Failed to save room/lab to the catalog.');
  };

  const handleSaveDutyTypeInline = async () => {
    const trimmed = dutyType.trim();
    if (!trimmed) return;
    setCatalogBusy(true);
    const res = await addDutyTypeAction(trimmed);
    setCatalogBusy(false);
    if (res.success) onRefresh();
    else await notify(res.error || 'Failed to save duty type to the catalog.');
  };

  // Inline rename for an existing catalog entry (batch/room/module) --
  // one shared bit of state since it's the same edit-in-place flow for all
  // three lists, just dispatched to a different action per kind.
  const [editingCatalogItem, setEditingCatalogItem] = useState<{
    kind: 'batch' | 'room' | 'module' | 'dutyType';
    original: string;
  } | null>(null);
  const [editCatalogValue, setEditCatalogValue] = useState('');

  const handleStartEditCatalogItem = (kind: 'batch' | 'room' | 'module' | 'dutyType', name: string) => {
    setEditingCatalogItem({ kind, original: name });
    setEditCatalogValue(name);
    setCatalogError(null);
  };

  const handleCancelEditCatalogItem = () => {
    setEditingCatalogItem(null);
    setEditCatalogValue('');
  };

  const handleSaveEditCatalogItem = async () => {
    if (!editingCatalogItem) return;
    const { kind, original } = editingCatalogItem;
    setCatalogBusy(true);
    setCatalogError(null);
    const res =
      kind === 'batch'
        ? await updateBatchAction(original, editCatalogValue)
        : kind === 'room'
          ? await updateRoomAction(original, editCatalogValue)
          : kind === 'module'
            ? await updateModuleAction(original, editCatalogValue)
            : await updateDutyTypeAction(original, editCatalogValue);
    setCatalogBusy(false);
    if (!res.success) {
      setCatalogError(res.error || 'Failed to update entry.');
      return;
    }
    setEditingCatalogItem(null);
    setEditCatalogValue('');
    onRefresh();
  };

  // ---- WhatsApp Cadre Dispatcher ----
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [groupCopied, setGroupCopied] = useState(false);

  useEffect(() => {
    if (!dispatchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDispatchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatchOpen]);

  // Converts a local Sri Lankan number ("071 257 0137") into WhatsApp's
  // country-code-prefixed digit format ("94712570137").
  const normalizePhoneForWhatsApp = (phone: string): string | null => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('94')) return digits;
    if (digits.startsWith('0')) return `94${digits.slice(1)}`;
    return digits;
  };

  // Collects one instructor's duties/night-shifts for the visible week, grouped by day.
  const getInstructorWeekEntries = (instId: string) => {
    return weekDays
      .map((day) => {
        const dayDuties = dutyAssignments.filter(
          (a) => a.instructorId === instId && a.dutyDate === day.dateStr
        );
        const mergedDayDuties = mergeDutyAssignments(dayDuties);
        const items: string[] = mergedDayDuties
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((a) => {
            const label = a.batchName || a.moduleName ? `${a.batchName || ''} — ${a.moduleName || ''}` : a.dutyType;
            const details = a.notes ? ` [${a.notes}]` : '';
            return `${a.startTime}-${a.endTime} ${label}${a.roomLab ? ` (${a.roomLab})` : ''}${details}`;
          });

        if (nightShifts.some((s) => s.instructorId === instId && s.shiftDate === day.dateStr)) {
          items.push('🌙 Night Duty');
        }
        return { ...day, items };
      })
      .filter((d) => d.items.length > 0);
  };

  const buildIndividualMessage = (inst: User): string => {
    const entries = getInstructorWeekEntries(inst.id);
    const bodyLines =
      entries.length === 0
        ? ['No teaching duties or night shifts assigned this week.']
        : entries.flatMap((d) => [`*${d.dayName}, ${d.formattedDate}*`, ...d.items.map((i) => `  • ${i}`)]);

    return [
      '📋 *NIBM Weekly Duty Roster*',
      `Week: ${planningStartDate} → ${weekDays[6]?.dateStr}`,
      '',
      `Hi ${inst.fullName.split(' ')[0]}, here's your schedule for this week:`,
      '',
      ...bodyLines,
      '',
      '— NIBM School of Computing Roster System',
    ].join('\n');
  };

  const buildGroupSummary = (): string => {
    const lines: string[] = [
      '📋 *NIBM FACULTY WEEKLY ROSTER*',
      `Week: ${planningStartDate} → ${weekDays[6]?.dateStr}`,
      `Status: ${rosterWeek.status}`,
      '',
    ];
    allInstructors.forEach((inst) => {
      const entries = getInstructorWeekEntries(inst.id);
      lines.push(`*${inst.fullName}*`);
      if (entries.length === 0) {
        lines.push('  Free / Standby all week');
      } else {
        entries.forEach((d) => {
          d.items.forEach((item) => lines.push(`  ${d.dayName} ${item}`));
        });
      }
      lines.push('');
    });
    lines.push('Generated via NIBM Instructor Roster System');
    return lines.join('\n');
  };

  const getWhatsAppLink = (inst: User): string | null => {
    if (!inst.phone) return null;
    const digits = normalizePhoneForWhatsApp(inst.phone);
    if (!digits) return null;
    return `https://wa.me/${digits}?text=${encodeURIComponent(buildIndividualMessage(inst))}`;
  };

  const handleCopyGroupSummary = async () => {
    try {
      await navigator.clipboard.writeText(buildGroupSummary());
      setGroupCopied(true);
      setTimeout(() => setGroupCopied(false), 2500);
    } catch {
      await notify('Could not copy to clipboard. Please copy the summary manually.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <PageHeader
          eyebrow={<><Sparkles className="size-3" /> Planning Studio</>}
          title="Weekly duty planner"
          description="Assign sessions and night duty, check balance, then publish the week to the cadre."
          status={
            rosterWeek.status === 'PUBLISHED' ? (
              <StatusPill tone="emerald">Published</StatusPill>
            ) : (
              <StatusPill tone="amber" pulse>Draft</StatusPill>
            )
          }
          actions={
            <>
              <button
                onClick={() => setAiDrawerOpen(true)}
                className="btn btn-secondary"
                title="AI Roster Co-Pilot (Ctrl+K / ⌘K)"
              >
                <Sparkles className="text-indigo-400" />
                AI Co-Pilot
                <kbd className="ml-0.5 hidden rounded border border-neutral-200 px-1 font-mono text-[10px] text-neutral-500 sm:inline dark:border-white/10">⌘K</kbd>
              </button>
              <button onClick={() => setCatalogModalOpen(true)} className="btn btn-secondary">
                <LibraryBig className="text-neutral-400" />
                Catalog
              </button>
              <button onClick={() => setDispatchOpen(true)} className="btn btn-secondary">
                <MessageCircle className="text-[#25D366]" />
                WhatsApp
              </button>
              <button
                onClick={handlePublish}
                disabled={rosterWeek.status === 'PUBLISHED'}
                className="btn btn-primary"
              >
                {rosterWeek.status === 'PUBLISHED' ? <CheckCircle2 /> : <Send />}
                {rosterWeek.status === 'PUBLISHED' ? 'Published' : 'Publish week'}
              </button>
            </>
          }
        />

        {publishMessage && (
          <div className="animate-fade-in p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{publishMessage}</span>
          </div>
        )}
      </div>

      {/* Week selector */}
      <div className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-neutral-300">
            <Calendar className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="eyebrow">Week starting</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={planningStartDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="field h-8 w-auto px-2 text-xs font-semibold [color-scheme:light] dark:[color-scheme:dark]"
              />
              <span className="text-xs text-neutral-500">
                to {weekDays[6]?.formattedDate}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-neutral-200 p-0.5 dark:border-white/[0.08]">
            <button type="button" onClick={() => handleShiftDate(-7)} className="btn btn-ghost btn-sm" title="Previous week">
              <ChevronLeft /> Prev
            </button>
            <button
              type="button"
              onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
              className="btn btn-ghost btn-sm"
            >
              Today
            </button>
            <button type="button" onClick={handleJumpToSunday} className="btn btn-ghost btn-sm" title="Start the window on this Sunday">
              Sunday
            </button>
            <button type="button" onClick={() => handleShiftDate(7)} className="btn btn-ghost btn-sm" title="Next week">
              Next <ChevronRight />
            </button>
          </div>
          <button
            type="button"
            onClick={handleCloneWeek}
            disabled={isCloning}
            className="btn btn-secondary btn-sm"
            title="Copy every assignment from the previous week into this draft"
          >
            <CopyPlus />
            {isCloning ? 'Cloning…' : 'Clone last week'}
          </button>
        </div>
      </div>

      {cloneMessage && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs flex items-center space-x-2">
          <CopyPlus className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{cloneMessage}</span>
        </div>
      )}

      {/* Workload balance */}
      <section className="surface-card overflow-hidden p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              <Layers className="size-4 text-neutral-400" /> Workload balance
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">Sessions and night duties per instructor this week.</p>
          </div>
          <div className="hidden items-center gap-3 text-[11px] text-neutral-500 sm:flex">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-neutral-900 dark:bg-white" /> Sessions</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> Night</span>
          </div>
        </div>

        {(() => {
          const maxLoad = Math.max(
            1,
            ...allInstructors.map((i) => (workloadMap[i.id]?.sessions ?? 0) + (workloadMap[i.id]?.nightShifts ?? 0)),
          );
          return (
            <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 md:grid-cols-5 lg:grid-cols-9 stagger-children">
              {allInstructors.map((inst) => {
                const data = workloadMap[inst.id] || { sessions: 0, nightShifts: 0 };
                const total = data.sessions + data.nightShifts;
                return (
                  <div
                    key={inst.id}
                    className="flex w-32 shrink-0 snap-start flex-col rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 sm:w-auto dark:border-white/[0.06] dark:bg-white/[0.025]"
                  >
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="truncate text-xs font-semibold text-neutral-900 dark:text-white" title={inst.fullName}>
                        {inst.fullName.split(' ')[0]}
                      </span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">{total}</span>
                    </div>
                    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-white/[0.06]" aria-hidden>
                      <span
                        className="h-full bg-neutral-900 transition-[width] duration-500 ease-[var(--ease-soft)] dark:bg-white"
                        style={{ width: `${(data.sessions / maxLoad) * 100}%` }}
                      />
                      <span
                        className="h-full bg-amber-400 transition-[width] duration-500 ease-[var(--ease-soft)]"
                        style={{ width: `${(data.nightShifts / maxLoad) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-[10px] text-neutral-500">
                      {data.sessions} sess · {data.nightShifts} night
                    </div>
                    {inst.phone && (
                      <a
                        href={`tel:${inst.phone.replace(/\s+/g, '')}`}
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
                        title={`Call ${inst.fullName}`}
                      >
                        <Phone className="size-2.5" />
                        {inst.phone}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* The 7-Day Planning Matrix (overflow-clip, not hidden, so day headers can stick) */}
      <div className="surface-card overflow-clip">
        <div className="flex flex-col gap-2 border-b border-neutral-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.06]">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              <Calendar className="size-4 text-neutral-400" /> Week matrix
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">Tap + in a slot to assign. Morning and afternoon for the same class merge into a full day.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-[3px] rounded-full bg-emerald-500" /> Morning 9–12</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-[3px] rounded-full bg-blue-500" /> Afternoon 1–4</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-[3px] rounded-full bg-indigo-500" /> Sunday CCS 4:30–5:30</span>
          </div>
        </div>

        {/* Matrix Grid Columns */}
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-white/[0.06]">
          {weekDays.map((day) => {
            const dayAssignments = dutyAssignments.filter((a) => a.dutyDate === day.dateStr);
            const nightShift = nightShifts.find((s) => s.shiftDate === day.dateStr);

            return (
              <div
                key={day.dateStr}
                className={`flex flex-col md:min-h-[560px] ${
                  day.isSunday ? 'bg-indigo-50/30 dark:bg-indigo-500/[0.03]' : ''
                }`}
              >
                {/* Day Header */}
                <div
                  className={`sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 flex items-baseline justify-between gap-2 border-b px-3 py-2.5 backdrop-blur-xl md:static md:block md:text-center ${
                    day.isSunday
                      ? 'border-indigo-500/20 bg-indigo-50/90 text-indigo-900 md:bg-indigo-50/60 dark:bg-indigo-950/80 dark:text-indigo-200 dark:md:bg-indigo-500/[0.08]'
                      : 'border-neutral-100 bg-white/90 text-neutral-900 md:bg-neutral-50 dark:border-white/[0.06] dark:bg-[#111111]/90 dark:text-white dark:md:bg-white/[0.02]'
                  }`}
                >
                  <div className="text-sm font-semibold">{day.dayName}</div>
                  <div className="text-xs font-normal text-neutral-500">{day.formattedDate}</div>
                </div>

                {/* Slot 1: Morning (09:00 - 12:00) */}
                <div className="p-2 border-b border-slate-200 dark:border-white/[0.08] flex-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-emerald-600 dark:text-emerald-400">09:00 - 12:00</span>
                    <button
                      onClick={() =>
                        handleOpenAddModal(
                          day.dateStr,
                          'Morning (09:00 - 12:00)',
                          '09:00',
                          '12:00'
                        )
                      }
                      className="p-1 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded transition-colors active:scale-95 cursor-pointer"
                      title="Assign morning slot"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Assignments in Morning */}
                  <div className="space-y-1.5">
                    {dayAssignments
                      .filter((a) => a.startTime === '09:00')
                      .map((assignment) => {
                        const matchingAfternoon = getMatchingOppositeSlotDuty(assignment, dayAssignments);
                        const hasAfternoon =
                          Boolean(matchingAfternoon) ||
                          dayAssignments.some(
                            (other) => other.instructorId === assignment.instructorId && other.startTime === '13:00'
                          );

                        return (
                          <div
                            key={assignment.id}
                            className="relative group flex flex-col justify-between overflow-hidden rounded-lg border border-neutral-200 bg-white p-2.5 pl-3 text-xs shadow-2xs transition-[border-color,background-color] duration-200 hover:border-neutral-300 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05] animate-rise-in before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-emerald-500"
                          >
                            <div className="absolute top-1.5 right-1.5 flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                              {!hasAfternoon && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyDutyToSlot(
                                      assignment,
                                      '13:00',
                                      '16:00',
                                      'Afternoon (13:00 - 16:00)'
                                    )
                                  }
                                  className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 bg-emerald-500/15 hover:bg-emerald-500/25 rounded transition-colors cursor-pointer"
                                  title="Copy session to Afternoon (13:00 - 16:00)"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteDuty(assignment.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 bg-white/80 dark:bg-slate-900/80 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                title="Remove assignment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            <div>
                              <div className="font-semibold text-neutral-900 dark:text-white truncate pr-12">
                                {assignment.instructorName}
                              </div>
                              {assignment.batchName && (
                                <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 truncate">
                                  {assignment.batchName}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                                {assignment.moduleName ?? assignment.dutyType}
                              </div>
                              {assignment.notes && (
                                <div
                                  className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700/60 max-w-full cursor-help"
                                  title={`Notes: ${assignment.notes}`}
                                >
                                  <FileText className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="truncate max-w-[120px]">{assignment.notes}</span>
                                </div>
                              )}
                              {assignment.roomLab && (
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  📍 {assignment.roomLab}
                                </div>
                              )}
                            </div>

                            {matchingAfternoon ? (
                              <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded shadow-2xs">
                                <Clock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>09:00 - 16:00 (Full Day)</span>
                              </div>
                            ) : hasAfternoon ? (
                              <div className="mt-1.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400/80 flex items-center space-x-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Also in Afternoon</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Slot 2: Afternoon (13:00 - 16:00) */}
                <div className="p-2 border-b border-slate-200 dark:border-white/[0.08] flex-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-blue-600 dark:text-blue-400">13:00 - 16:00</span>
                    <button
                      onClick={() =>
                        handleOpenAddModal(
                          day.dateStr,
                          'Afternoon (13:00 - 16:00)',
                          '13:00',
                          '16:00'
                        )
                      }
                      className="p-1 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded transition-colors active:scale-95 cursor-pointer"
                      title="Assign afternoon slot"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Assignments in Afternoon */}
                  <div className="space-y-1.5">
                    {dayAssignments
                      .filter((a) => a.startTime === '13:00')
                      .map((assignment) => {
                        const matchingMorning = getMatchingOppositeSlotDuty(assignment, dayAssignments);
                        const hasMorning =
                          Boolean(matchingMorning) ||
                          dayAssignments.some(
                            (other) => other.instructorId === assignment.instructorId && other.startTime === '09:00'
                          );

                        return (
                          <div
                            key={assignment.id}
                            className="relative group flex flex-col justify-between overflow-hidden rounded-lg border border-neutral-200 bg-white p-2.5 pl-3 text-xs shadow-2xs transition-[border-color,background-color] duration-200 hover:border-neutral-300 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05] animate-rise-in before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-blue-500"
                          >
                            <div className="absolute top-1.5 right-1.5 flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                              {!hasMorning && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyDutyToSlot(
                                      assignment,
                                      '09:00',
                                      '12:00',
                                      'Morning (09:00 - 12:00)'
                                    )
                                  }
                                  className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 bg-blue-500/15 hover:bg-blue-500/25 rounded transition-colors cursor-pointer"
                                  title="Copy session to Morning (09:00 - 12:00)"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteDuty(assignment.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 bg-white/80 dark:bg-slate-900/80 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                title="Remove assignment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            <div>
                              <div className="font-semibold text-neutral-900 dark:text-white truncate pr-12">
                                {assignment.instructorName}
                              </div>
                              {assignment.batchName && (
                                <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 truncate">
                                  {assignment.batchName}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                                {assignment.moduleName ?? assignment.dutyType}
                              </div>
                              {assignment.notes && (
                                <div
                                  className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700/60 max-w-full cursor-help"
                                  title={`Notes: ${assignment.notes}`}
                                >
                                  <FileText className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                  <span className="truncate max-w-[120px]">{assignment.notes}</span>
                                </div>
                              )}
                              {assignment.roomLab && (
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  📍 {assignment.roomLab}
                                </div>
                              )}
                            </div>

                            {matchingMorning ? (
                              <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5 rounded shadow-2xs">
                                <Clock className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>09:00 - 16:00 (Full Day)</span>
                              </div>
                            ) : hasMorning ? (
                              <div className="mt-1.5 text-[9px] font-semibold text-blue-700 dark:text-blue-400/80 flex items-center space-x-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Also in Morning</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Special Sunday Evening Slot (16:30 - 17:30 CCS Batch) */}
                {day.isSunday && (
                  <div className="p-2 border-b border-purple-200 dark:border-purple-500/20 bg-purple-500/10">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-400 mb-1">
                      <span>CCS (16:30 - 17:30)</span>
                      <button
                        onClick={() =>
                          handleOpenAddModal(
                            day.dateStr,
                            'Sunday CCS (16:30 - 17:30)',
                            '16:30',
                            '17:30'
                          )
                        }
                        className="p-1 hover:bg-purple-500/25 text-purple-700 dark:text-purple-400 rounded transition-colors active:scale-95 cursor-pointer"
                        title="Assign Sunday CCS slot"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {dayAssignments
                        .filter((a) => a.startTime === '16:30')
                        .map((assignment) => (
                          <div
                            key={assignment.id}
                            className="relative group flex flex-col justify-between overflow-hidden rounded-lg border border-neutral-200 bg-white p-2.5 pl-3 text-xs shadow-2xs transition-[border-color,background-color] duration-200 hover:border-neutral-300 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05] animate-rise-in before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-indigo-500"
                          >
                            <button
                              onClick={() => handleDeleteDuty(assignment.id)}
                              className="absolute top-1 right-1 p-1 text-slate-400 hover:text-rose-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity cursor-pointer"
                              title="Remove assignment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <div className="font-semibold text-neutral-900 dark:text-white truncate pr-3">
                              {assignment.instructorName}
                            </div>
                            {assignment.batchName && (
                              <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 truncate">
                                {assignment.batchName}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                              {assignment.moduleName ?? assignment.dutyType}
                            </div>
                            {assignment.notes && (
                              <div
                                className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700/60 max-w-full cursor-help"
                                title={`Notes: ${assignment.notes}`}
                              >
                                <FileText className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                <span className="truncate max-w-[120px]">{assignment.notes}</span>
                              </div>
                            )}
                            {assignment.roomLab && (
                              <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                                📍 {assignment.roomLab}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 7-Day Night Duty Row */}
                <div className="p-2.5 bg-slate-50 dark:bg-[#141414] text-slate-800 dark:text-white rounded-b-md mt-auto border-t border-slate-200 dark:border-white/[0.08]">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-300 mb-1.5 uppercase tracking-wider">
                    <span className="flex items-center space-x-1">
                      <Moon className="w-3 h-3" />
                      <span>Night Duty</span>
                    </span>
                  </div>

                  <select
                    value={nightShift?.instructorId || ''}
                    onChange={(e) => handleSetNightShift(day.dateStr, e.target.value)}
                    className="field w-full text-xs cursor-pointer"
                  >
                    <option value="">{nightShift ? 'Remove night duty...' : 'Select Instructor...'}</option>
                    {allInstructors.map((inst) => {
                      const onLeave = isInstructorOnLeave(inst.id, day.dateStr);
                      return (
                        <option
                          key={inst.id}
                          value={inst.id}
                          disabled={onLeave}
                          className="bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                        >
                          {inst.fullName} {onLeave ? '(On Leave)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Add Duty Assignment */}
      {modalOpen && modalData && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-neutral-200 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl animate-sheet-up sm:rounded-2xl sm:p-6 sm:animate-pop-in dark:border-white/[0.08] dark:bg-[#141414]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Assign {dutyType || 'Duty'}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {modalData.date} • {modalData.slotLabel}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDuty} className="mt-4 space-y-4">
              {/* Select Instructor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Instructor (Cadre of {allInstructors.length})
                </label>
                <select
                  value={instructorId}
                  onChange={(e) => setInstructorId(e.target.value)}
                  className="field w-full text-sm cursor-pointer"
                  required
                >
                  <option value="">Select Instructor...</option>
                  {allInstructors.map((inst) => {
                    const onLeave = isInstructorOnLeave(inst.id, modalData.date);
                    return (
                      <option key={inst.id} value={inst.id} disabled={onLeave}>
                        {inst.fullName} {onLeave ? '⛔ (On Approved Leave)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Duty Type: pick from catalog, type custom, or save new */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Duty Type
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    list="duty-type-catalog-options"
                    placeholder="e.g. Teaching Duty or CGU Call Handling"
                    value={dutyType}
                    onChange={(e) => setDutyType(e.target.value)}
                    className="field flex-1 min-w-0 text-sm"
                    required
                  />
                  {dutyType.trim() &&
                    !catalog.dutyTypes.some((dt) => dt.toLowerCase() === dutyType.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={handleSaveDutyTypeInline}
                        disabled={catalogBusy}
                        title="Save this duty type to the catalog permanently"
                        className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-slate-100 dark:bg-white/[0.06] hover:bg-emerald-600 disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:text-white px-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    )}
                </div>
                <datalist id="duty-type-catalog-options">
                  {catalog.dutyTypes.map((dt) => (
                    <option key={dt} value={dt} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {catalog.dutyTypes.map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setDutyType(dt)}
                      className={`text-[11px] px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                        dutyType.trim().toLowerCase() === dt.toLowerCase()
                          ? 'bg-emerald-600 text-white font-medium'
                          : 'bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dt}
                    </button>
                  ))}
                </div>
              </div>

              {dutyType.trim() === '' || dutyType.trim().toLowerCase() === 'teaching duty' ? (
                <>
                  {/* Free-form Batch Name + Quick Suggestion Tags */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Batch Code / Group
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        list="batch-catalog-options"
                        placeholder="e.g. DSE 24.1F or CCS Batch"
                        value={batchName}
                        onChange={(e) => setBatchName(e.target.value)}
                        className="field flex-1 min-w-0 text-sm"
                        required
                      />
                      {batchName.trim() &&
                        !catalog.batches.some((b) => b.toLowerCase() === batchName.trim().toLowerCase()) && (
                          <button
                            type="button"
                            onClick={handleSaveBatchInline}
                            disabled={catalogBusy}
                            title="Save this batch to the catalog permanently"
                            className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-slate-100 dark:bg-white/[0.06] hover:bg-emerald-600 disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:text-white px-2.5 rounded-xl transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        )}
                    </div>
                    <datalist id="batch-catalog-options">
                      {catalog.batches.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {catalog.batches.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBatchName(b)}
                          className="text-[11px] bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Module: pick from the catalog, type a custom one, or save a new one */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Module / Subject
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        list="module-catalog-options"
                        placeholder="e.g. Database Management Systems"
                        value={moduleName}
                        onChange={(e) => setModuleName(e.target.value)}
                        className="field flex-1 min-w-0 text-sm"
                        required
                      />
                      {moduleName.trim() &&
                        !catalog.modules.some((m) => m.toLowerCase() === moduleName.trim().toLowerCase()) && (
                          <button
                            type="button"
                            onClick={handleSaveModuleInline}
                            disabled={catalogBusy}
                            title="Save this module to the catalog permanently"
                            className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-slate-100 dark:bg-white/[0.06] hover:bg-emerald-600 disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:text-white px-2.5 rounded-xl transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        )}
                    </div>
                    <datalist id="module-catalog-options">
                      {catalog.modules.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {catalog.modules.slice(0, 4).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModuleName(m)}
                          className="text-[11px] bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md transition-colors truncate max-w-[200px] cursor-pointer"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Details
                  </label>
                  <textarea
                    value={dutyNotes}
                    onChange={(e) => setDutyNotes(e.target.value)}
                    placeholder={`e.g. ${dutyType === 'Lab Inspection' ? 'Quarterly check, Lab 03' : 'Fielding calls 9-12'}`}
                    rows={3}
                    className="field h-auto py-2.5 w-full text-sm resize-none"
                  />
                </div>
              )}

              {/* Room/Lab: pick from the catalog, type a custom one, or save a new one */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Room / Lab Venue
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    list="room-catalog-options"
                    placeholder="e.g. Lab 01"
                    value={roomLab}
                    onChange={(e) => setRoomLab(e.target.value)}
                    className="field flex-1 min-w-0 text-sm"
                  />
                  {roomLab.trim() &&
                    !catalog.rooms.some((r) => r.toLowerCase() === roomLab.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={handleSaveRoomInline}
                        disabled={catalogBusy}
                        title="Save this room/lab to the catalog permanently"
                        className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-slate-100 dark:bg-white/[0.06] hover:bg-emerald-600 disabled:opacity-50 text-slate-700 dark:text-slate-300 hover:text-white px-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    )}
                </div>
                <datalist id="room-catalog-options">
                  {catalog.rooms.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {catalog.rooms.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoomLab(r)}
                      className="text-[11px] bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Day / Duplicate Session Checkbox */}
              {modalData.startTime === '09:00' && (
                <label className="flex items-start space-x-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeatForOtherSlot}
                    onChange={(e) => setRepeatForOtherSlot(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 block">
                      Also duplicate this session to Afternoon (13:00 - 16:00)
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] block mt-0.5">
                      Automatically books a full-day workshop/lab session with the same instructor, batch, module, and lab.
                    </span>
                  </div>
                </label>
              )}

              {modalData.startTime === '13:00' && (
                <label className="flex items-start space-x-2.5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeatForOtherSlot}
                    onChange={(e) => setRepeatForOtherSlot(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-blue-700 dark:text-blue-300 block">
                      Also duplicate this session to Morning (09:00 - 12:00)
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 text-[11px] block mt-0.5">
                      Automatically books a full-day workshop/lab session with the same instructor, batch, module, and lab.
                    </span>
                  </div>
                </label>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08] px-4 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Validating...' : 'Assign Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Cadre Dispatcher Drawer */}
      {dispatchOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <button
            aria-label="Close dispatch drawer"
            onClick={() => setDispatchOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative bg-white dark:bg-[#111111] w-full max-w-md h-full shadow-2xl border-l border-slate-200 dark:border-white/[0.08] flex flex-col animate-drawer-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/[0.08] bg-[#075E54] text-white">
              <div>
                <div className="flex items-center space-x-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Cadre Dispatcher</span>
                </div>
                <h3 className="text-lg font-bold">Dispatch via WhatsApp</h3>
              </div>
              <button
                onClick={() => setDispatchOpen(false)}
                className="text-emerald-100 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#141414]/60">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Copy a single formatted summary of the entire week&apos;s roster for posting to the NIBM Faculty WhatsApp group.
              </p>
              <button
                onClick={handleCopyGroupSummary}
                className={`w-full flex items-center justify-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer active:scale-95 ${
                  groupCopied
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
                }`}
              >
                <ClipboardCopy className="w-3.5 h-3.5" />
                <span>{groupCopied ? 'Copied to Clipboard!' : 'Copy Group Summary'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-white/[0.06]">
              {allInstructors.map((inst) => {
                const link = getWhatsAppLink(inst);
                const entries = getInstructorWeekEntries(inst.id);
                const dutyCount = entries.reduce((sum, d) => sum + d.items.length, 0);
                return (
                  <div key={inst.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{inst.fullName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {dutyCount > 0 ? `${dutyCount} dut${dutyCount === 1 ? 'y' : 'ies'} this week` : 'Free / Standby this week'}
                      </div>
                      {inst.phone && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{inst.phone}</div>
                      )}
                    </div>
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center space-x-1.5 text-[11px] font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 py-2 rounded-lg transition-colors cursor-pointer active:scale-95 shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </a>
                    ) : (
                      <span className="shrink-0 text-[11px] text-slate-400 italic">No phone on file</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Academic Catalog Manager Modal */}
      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <button
            aria-label="Close catalog manager"
            onClick={() => setCatalogModalOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="surface-card relative max-w-6xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl animate-pop-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08]">
              <div>
                <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <LibraryBig className="w-3.5 h-3.5" />
                  <span>Demonstrator Console</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Academic Catalog Manager</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage the student batches, modules, lecture rooms/labs, and duty types offered as presets when assigning duties.
                </p>
              </div>
              <button
                onClick={() => setCatalogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {catalogError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{catalogError}</span>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Batches Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Student Batches ({catalog.batches.length})
                </h4>
                <form onSubmit={handleAddBatch} className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    placeholder="e.g. DSE 24.2F"
                    className="field flex-1 min-w-0 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={catalogBusy || !newBatchName.trim()}
                    className="btn btn-primary btn-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {catalog.batches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No batches yet. Add one above.</p>
                  ) : (
                    catalog.batches.map((b) =>
                      editingCatalogItem?.kind === 'batch' && editingCatalogItem.original === b ? (
                        <div
                          key={b}
                          className="flex items-center justify-between gap-1.5 bg-slate-100 dark:bg-white/[0.05] border border-emerald-500/60 rounded-lg px-2.5 py-1.5"
                        >
                          <input
                            type="text"
                            value={editCatalogValue}
                            onChange={(e) => setEditCatalogValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditCatalogItem();
                              if (e.key === 'Escape') handleCancelEditCatalogItem();
                            }}
                            autoFocus
                            className="field flex-1 min-w-0 text-xs"
                          />
                          <button
                            onClick={handleSaveEditCatalogItem}
                            disabled={catalogBusy}
                            className="shrink-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 disabled:opacity-50 cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEditCatalogItem}
                            disabled={catalogBusy}
                            className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          key={b}
                          className="flex items-center justify-between bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5"
                        >
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{b}</span>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <button
                              onClick={() => handleStartEditCatalogItem('batch', b)}
                              disabled={catalogBusy}
                              className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50 cursor-pointer transition-colors"
                              title={`Edit ${b}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveBatch(b)}
                              disabled={catalogBusy}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-50 cursor-pointer transition-colors"
                              title={`Remove ${b}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>

              {/* Rooms/Labs Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Lecture Rooms / Labs ({catalog.rooms.length})
                </h4>
                <form onSubmit={handleAddRoom} className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Lab 05"
                    className="field flex-1 min-w-0 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={catalogBusy || !newRoomName.trim()}
                    className="btn btn-primary btn-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {catalog.rooms.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No rooms/labs yet. Add one above.</p>
                  ) : (
                    catalog.rooms.map((r) =>
                      editingCatalogItem?.kind === 'room' && editingCatalogItem.original === r ? (
                        <div
                          key={r}
                          className="flex items-center justify-between gap-1.5 bg-slate-100 dark:bg-white/[0.05] border border-emerald-500/60 rounded-lg px-2.5 py-1.5"
                        >
                          <input
                            type="text"
                            value={editCatalogValue}
                            onChange={(e) => setEditCatalogValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditCatalogItem();
                              if (e.key === 'Escape') handleCancelEditCatalogItem();
                            }}
                            autoFocus
                            className="field flex-1 min-w-0 text-xs"
                          />
                          <button
                            onClick={handleSaveEditCatalogItem}
                            disabled={catalogBusy}
                            className="shrink-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 disabled:opacity-50 cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEditCatalogItem}
                            disabled={catalogBusy}
                            className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          key={r}
                          className="flex items-center justify-between bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5"
                        >
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{r}</span>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <button
                              onClick={() => handleStartEditCatalogItem('room', r)}
                              disabled={catalogBusy}
                              className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50 cursor-pointer transition-colors"
                              title={`Edit ${r}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveRoom(r)}
                              disabled={catalogBusy}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-50 cursor-pointer transition-colors"
                              title={`Remove ${r}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>

              {/* Modules/Subjects Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Modules / Subjects ({catalog.modules.length})
                </h4>
                <form onSubmit={handleAddModule} className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    placeholder="e.g. Cloud Computing Essentials"
                    className="field flex-1 min-w-0 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={catalogBusy || !newModuleName.trim()}
                    className="btn btn-primary btn-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {catalog.modules.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No modules yet. Add one above.</p>
                  ) : (
                    catalog.modules.map((m) =>
                      editingCatalogItem?.kind === 'module' && editingCatalogItem.original === m ? (
                        <div
                          key={m}
                          className="flex items-center justify-between gap-1.5 bg-slate-100 dark:bg-white/[0.05] border border-emerald-500/60 rounded-lg px-2.5 py-1.5"
                        >
                          <input
                            type="text"
                            value={editCatalogValue}
                            onChange={(e) => setEditCatalogValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditCatalogItem();
                              if (e.key === 'Escape') handleCancelEditCatalogItem();
                            }}
                            autoFocus
                            className="field flex-1 min-w-0 text-xs"
                          />
                          <button
                            onClick={handleSaveEditCatalogItem}
                            disabled={catalogBusy}
                            className="shrink-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 disabled:opacity-50 cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEditCatalogItem}
                            disabled={catalogBusy}
                            className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          key={m}
                          className="flex items-center justify-between bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5"
                        >
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{m}</span>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <button
                              onClick={() => handleStartEditCatalogItem('module', m)}
                              disabled={catalogBusy}
                              className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50 cursor-pointer transition-colors"
                              title={`Edit ${m}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveModule(m)}
                              disabled={catalogBusy}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-50 cursor-pointer transition-colors"
                              title={`Remove ${m}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>

              {/* Duty Types Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Duty Types ({catalog.dutyTypes.length})
                </h4>
                <form onSubmit={handleAddDutyType} className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    value={newDutyTypeName}
                    onChange={(e) => setNewDutyTypeName(e.target.value)}
                    placeholder="e.g. Exam Invigilation"
                    className="field flex-1 min-w-0 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={catalogBusy || !newDutyTypeName.trim()}
                    className="btn btn-primary btn-sm shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {catalog.dutyTypes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No duty types yet. Add one above.</p>
                  ) : (
                    catalog.dutyTypes.map((dt) =>
                      editingCatalogItem?.kind === 'dutyType' && editingCatalogItem.original === dt ? (
                        <div
                          key={dt}
                          className="flex items-center justify-between gap-1.5 bg-slate-100 dark:bg-white/[0.05] border border-emerald-500/60 rounded-lg px-2.5 py-1.5"
                        >
                          <input
                            type="text"
                            value={editCatalogValue}
                            onChange={(e) => setEditCatalogValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditCatalogItem();
                              if (e.key === 'Escape') handleCancelEditCatalogItem();
                            }}
                            autoFocus
                            className="field flex-1 min-w-0 text-xs"
                          />
                          <button
                            onClick={handleSaveEditCatalogItem}
                            disabled={catalogBusy}
                            className="shrink-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 disabled:opacity-50 cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEditCatalogItem}
                            disabled={catalogBusy}
                            className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          key={dt}
                          className="flex items-center justify-between bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5"
                        >
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{dt}</span>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <button
                              onClick={() => handleStartEditCatalogItem('dutyType', dt)}
                              disabled={catalogBusy}
                              className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50 cursor-pointer transition-colors"
                              title={`Edit ${dt}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveDutyType(dt)}
                              disabled={catalogBusy}
                              className="shrink-0 text-slate-400 hover:text-rose-600 disabled:opacity-50 cursor-pointer transition-colors"
                              title={`Remove ${dt}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Roster Co-Pilot Drawer */}
      <AiCopilotDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        rosterWeek={rosterWeek}
        dutyAssignments={dutyAssignments}
        nightShifts={nightShifts}
        leaveRequests={leaveRequests}
        allInstructors={allInstructors}
        onRefresh={onRefresh}
      />
    </div>
  );
};
