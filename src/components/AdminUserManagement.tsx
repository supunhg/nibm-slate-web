'use client';
import { Select } from './ui/Select';

import { PageHeader } from './ui/PageHeader';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Copy,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Power,
  Trash2,
  X,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { User, Role } from '@/types';
import {
  listAllUsersAction,
  createUserAction,
  setUserActiveAction,
  deleteUserAction,
  adminResetPasswordAction,
} from '@/lib/actions';
import { useDialog } from './DialogProvider';

interface AdminUserManagementProps {
  currentUser: User;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  DEMONSTRATOR: 'Demonstrator',
  EXECUTIVE: 'Executive',
  INSTRUCTOR: 'Instructor',
  GUEST: 'Guest',
};

// The only INSTRUCTOR-role job title distinction that exists -- plain
// instructors carry no jobTitle at all and just display as "Instructor"
// (see ROLE_LABELS). A Technical Assistant has identical permissions; this
// only changes how they're labelled.
const TECHNICAL_ASSISTANT_TITLE = 'Technical Assistant';

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ currentUser }) => {
  const { confirm, notify } = useDialog();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('INSTRUCTOR');
  const [isTechnicalAssistant, setIsTechnicalAssistant] = useState(false);
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ user: User; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Password Reset state
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [resetMode, setResetMode] = useState<'default' | 'custom'>('default');
  const [customResetPassword, setCustomResetPassword] = useState('');
  const [showCustomPassword, setShowCustomPassword] = useState(false);
  const [mustChangeOnLogin, setMustChangeOnLogin] = useState(true);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ user: User; newPassword: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

  const handleOpenResetPassword = (user: User) => {
    setResetModalUser(user);
    setResetMode('default');
    setCustomResetPassword('');
    setShowCustomPassword(false);
    setMustChangeOnLogin(user.role !== 'ADMIN');
    setResetSubmitting(false);
    setResetError(null);
    setResetResult(null);
    setResetCopied(false);
  };

  const handleCloseResetModal = () => {
    setResetModalUser(null);
    setResetResult(null);
    setResetError(null);
    setResetCopied(false);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setResetError(null);

    let passwordToSend: string | undefined = undefined;
    if (resetMode === 'custom') {
      if (!customResetPassword || customResetPassword.length < 6) {
        setResetError('Custom password must be at least 6 characters.');
        return;
      }
      passwordToSend = customResetPassword;
    }

    setResetSubmitting(true);
    try {
      const res = await adminResetPasswordAction(
        resetModalUser.id,
        passwordToSend,
        mustChangeOnLogin
      );
      if (!res.success) {
        setResetError(res.error);
        setResetSubmitting(false);
        return;
      }
      setResetResult({ user: res.user, newPassword: res.newPassword });
      fetchUsers();
    } catch (err) {
      console.error('Failed to reset password:', err);
      setResetError('An error occurred while resetting the password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleCopyResetPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.newPassword);
      setResetCopied(true);
      setTimeout(() => setResetCopied(false), 2500);
    } catch {
      await notify('Could not copy. Please copy the password manually.');
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listAllUsersAction();
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const closePanel = () => {
    setPanelOpen(false);
    setFullName('');
    setUsername('');
    setEmail('');
    setRole('INSTRUCTOR');
    setIsTechnicalAssistant(false);
    setPhone('');
    setFormError(null);
    setCreatedResult(null);
    setCopied(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    let res;
    try {
      res = await createUserAction({
        fullName,
        username,
        email: email || undefined,
        role,
        jobTitle: role === 'INSTRUCTOR' && isTechnicalAssistant ? TECHNICAL_ASSISTANT_TITLE : undefined,
        phone: phone || undefined,
      });
    } catch (err) {
      console.error('Error creating user:', err);
      setSubmitting(false);
      setFormError('Something went wrong creating this account. Please try again.');
      return;
    }
    setSubmitting(false);

    if (!res.success) {
      setFormError(res.error);
      return;
    }
    setCreatedResult({ user: res.user, tempPassword: res.tempPassword });
    fetchUsers();
  };

  const handleCopyTempPassword = async () => {
    if (!createdResult) return;
    try {
      await navigator.clipboard.writeText(createdResult.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      await notify('Could not copy. Please copy the password manually before closing this panel.');
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser.id) {
      await notify('You cannot deactivate your own account.');
      return;
    }
    const proceed = await confirm({
      title: user.isActive ? 'Deactivate account' : 'Reactivate account',
      message: `${user.isActive ? 'Deactivate' : 'Reactivate'} ${user.fullName}?`,
      confirmLabel: user.isActive ? 'Deactivate' : 'Reactivate',
      danger: user.isActive,
    });
    if (!proceed) return;
    await setUserActiveAction(user.id, !user.isActive);
    fetchUsers();
  };

  const handleDelete = async (user: User) => {
    const proceed = await confirm({
      title: 'Permanently delete account',
      message: `Permanently delete ${user.fullName} (@${user.username})? This cannot be undone. Only accounts with no schedule or audit history can be deleted -- if this one has any, it will be refused.`,
      confirmLabel: 'Delete Permanently',
      danger: true,
    });
    if (!proceed) return;

    const res = await deleteUserAction(user.id);
    if (!res.success) {
      await notify({ title: 'Could not delete', message: res.error, danger: true });
      return;
    }
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<><ShieldCheck className="size-3" /> Admin</>}
        title="Staff & access"
        description={
          <>
            Add accounts and assign roles. New accounts get a temporary password (
            <code className="font-mono text-neutral-700 dark:text-neutral-300">FirstName@123</code>) and must set their own on first sign-in.
          </>
        }
        actions={
          <>
            <button onClick={() => handleOpenResetPassword(currentUser)} className="btn btn-secondary">
              <KeyRound className="text-neutral-400" />
              Admin password
            </button>
            {!panelOpen && (
              <button onClick={() => setPanelOpen(true)} className="btn btn-primary">
                <UserPlus />
                Add staff
              </button>
            )}
          </>
        }
      />

      {/* Add Staff Member: inline panel, not a popup -- stays on the page like the rest of the console */}
      {panelOpen && (
        <div className="surface-card overflow-hidden animate-pop-in">
          <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#141414]/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {createdResult ? 'Account Created' : 'Add Staff Member'}
            </h3>
            <button onClick={closePanel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5">
            {createdResult ? (
              <div className="space-y-4 max-w-md">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {createdResult.user.fullName}&apos;s account was created as{' '}
                    {createdResult.user.jobTitle || ROLE_LABELS[createdResult.user.role]} with username{' '}
                    <strong>{createdResult.user.username}</strong>.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    One-time temporary password -- share this with them directly. It won&apos;t be shown again.
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 font-mono tracking-wider">
                      {createdResult.tempPassword}
                    </code>
                    <button
                      onClick={handleCopyTempPassword}
                      className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all cursor-pointer active:scale-95 ${
                        copied ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={closePanel}
                  className="h-9 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4 max-w-md">
                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="field w-full text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Username</label>
                    <input
                      type="text"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. jane.instructor"
                      className="field w-full text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Email (optional)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="field w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Role</label>
                    <Select<Role>
                      label="Role"
                      value={role}
                      onChange={setRole}
                      options={[
                        { value: 'INSTRUCTOR', label: 'Instructor' },
                        { value: 'DEMONSTRATOR', label: 'Demonstrator' },
                        { value: 'EXECUTIVE', label: 'Executive' },
                        { value: 'ADMIN', label: 'Admin' },
                      ]}
                    />
                  </div>
                  {role === 'INSTRUCTOR' && (
                    <div className="flex items-end pb-2.5">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isTechnicalAssistant}
                          onChange={(e) => setIsTechnicalAssistant(e.target.checked)}
                          className="rounded border-slate-300 dark:border-white/10 bg-white dark:bg-black cursor-pointer text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Technical Assistant (instead of Instructor)</span>
                      </label>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Phone (optional)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="071 234 5678"
                      className="field w-full text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting ? 'Creating...' : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="h-9 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#141414]/50 flex items-center space-x-2">
          <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">All Accounts ({users.length})</h3>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm">Loading...</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/[0.06]">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-full">{u.fullName}</span>
                    <span className="text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-full uppercase shrink-0">
                      {u.jobTitle || ROLE_LABELS[u.role]}
                    </span>
                    {!u.isActive && (
                      <span className="text-[10px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase shrink-0">
                        Deactivated
                      </span>
                    )}
                    {u.mustChangePassword && (
                      <span className="text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase shrink-0">
                        Pending First Login
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    @{u.username}
                    {u.email ? ` • ${u.email}` : ''}
                    {u.phone ? ` • ${u.phone}` : ''}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenResetPassword(u)}
                    title={`Reset password for ${u.fullName}`}
                    className="h-8 flex items-center space-x-1.5 text-[11px] font-medium px-3 rounded-lg transition-all cursor-pointer bg-slate-100 hover:bg-indigo-50 dark:bg-white/[0.06] dark:hover:bg-indigo-600/25 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700/60 active:scale-95"
                  >
                    <KeyRound className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Reset Password</span>
                  </button>
                  <button
                    onClick={() => handleToggleActive(u)}
                    disabled={u.id === currentUser.id}
                    title={u.isActive ? 'Deactivate account' : 'Reactivate account'}
                    className={`h-8 flex items-center space-x-1.5 text-[11px] font-medium px-3 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${
                      u.isActive
                        ? 'bg-slate-100 hover:bg-rose-50 dark:bg-white/[0.06] dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/60'
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{u.isActive ? 'Deactivate' : 'Reactivate'}</span>
                  </button>
                  {!u.isActive && (
                    <button
                      onClick={() => handleDelete(u)}
                      title="Permanently delete account"
                      className="h-8 flex items-center space-x-1.5 text-[11px] font-medium px-3 rounded-lg transition-all cursor-pointer bg-slate-100 hover:bg-rose-50 dark:bg-white/[0.06] dark:hover:bg-rose-950/60 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/60 active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="surface-card w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#141414]/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reset Account Password</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {resetModalUser.fullName} (@{resetModalUser.username})
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseResetModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {resetResult ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Password successfully updated for <strong>{resetResult.user.fullName}</strong>.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      New password to relay to the user:
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 font-mono tracking-wider select-all">
                        {resetResult.newPassword}
                      </code>
                      <button
                        onClick={handleCopyResetPassword}
                        className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all cursor-pointer active:scale-95 ${
                          resetCopied ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                        title="Copy password to clipboard"
                      >
                        {resetCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Share this password with them directly. They can now log in immediately.
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={handleCloseResetModal}
                      className="w-full h-10 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                  {resetError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Choose Reset Option</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setResetMode('default')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          resetMode === 'default'
                            ? 'bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-white'
                            : 'bg-slate-50 dark:bg-black border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/15'
                        }`}
                      >
                        <div className="text-xs font-semibold">Standard Temp</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">FirstName@123 formula</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setResetMode('custom')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          resetMode === 'custom'
                            ? 'bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-white'
                            : 'bg-slate-50 dark:bg-black border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/15'
                        }`}
                      >
                        <div className="text-xs font-semibold">Custom Password</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Set specific password</div>
                      </button>
                    </div>
                  </div>

                  {resetMode === 'custom' && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">New Password</label>
                      <div className="relative">
                        <input
                          type={showCustomPassword ? 'text' : 'password'}
                          value={customResetPassword}
                          onChange={(e) => setCustomResetPassword(e.target.value)}
                          placeholder="Enter at least 6 characters"
                          className="field w-full text-sm pr-9"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCustomPassword((v) => !v)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        >
                          {showCustomPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mustChangeOnLogin}
                        onChange={(e) => setMustChangeOnLogin(e.target.checked)}
                        className="rounded border-slate-300 dark:border-white/10 bg-white dark:bg-black cursor-pointer text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Require password change on next sign-in</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseResetModal}
                      className="h-9 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetSubmitting}
                      className="btn btn-primary"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{resetSubmitting ? 'Resetting...' : 'Confirm Reset'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
