import React, { useState, useEffect } from 'react';
import { useApp } from '../../../core/context/AppContext';
import type { Staff } from '../../../core/types';
import {
  Users,
  Shield,
  UserCheck,
  PlusCircle,
  Trash2,
  X,
  Mail,
  User,
  KeyRound
} from 'lucide-react';
import { Badge } from '@/components/reui/badge';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const StaffAccounts: React.FC = () => {
  const {
    staff,
    inviteStaff,
    updateStaffStatus,
    resetStaffPassword,
    deleteStaff,
    showToast
  } = useApp();

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Escape key down to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInviteModalOpen(false);
      }
    };
    if (inviteModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inviteModalOpen]);

  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<Staff['role']>('Support');

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim() || !invEmail.trim()) {
      showToast('Please check required inputs.');
      return;
    }

    inviteStaff(invName.trim(), invEmail.trim().toLowerCase(), invRole);

    // Reset Form
    setInvName('');
    setInvEmail('');
    setInvRole('Support');
    setInviteModalOpen(false);
  };

  // Helper mapping roles to modules permissions
  const getRolePermissions = (role: Staff['role']) => {
    switch (role) {
      case 'Super Admin':
        return { read: true, create: true, edit: true, delete: true, export: true };
      case 'Admin':
        return { read: true, create: true, edit: true, delete: false, export: true };
      case 'Manager':
        return { read: true, create: true, edit: true, delete: false, export: false };
      case 'Sales':
        return { read: true, create: false, edit: true, delete: false, export: false };
      case 'Support':
        return { read: true, create: false, edit: false, delete: false, export: false };
      default:
        return { read: true, create: false, edit: false, delete: false, export: false };
    }
  };

  const getRoleBadgeColor = (role: Staff['role']) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Admin':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Manager':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Sales':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Support':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Access Control</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {staff.length} Members
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Staff &amp; Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage administrative personnel, assign role-based access permissions, and revoke active credentials.
          </p>
        </div>

        <button
          onClick={() => setInviteModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-xs font-bold shadow-xs cursor-pointer min-h-[40px]"
        >
          <PlusCircle size={15} /> <span>Invite New Member</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Users size={18} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Team Personnel</span>
            <span className="text-2xl font-black text-slate-900 font-display font-mono">{staff.length}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Shield size={18} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Admins &amp; Super Admins</span>
            <span className="text-2xl font-black text-slate-900 font-display font-mono">
              {staff.filter((s) => s.role === 'Super Admin' || s.role === 'Admin').length}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <UserCheck size={18} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Active Accounts</span>
            <span className="text-2xl font-black text-emerald-600 font-display font-mono">
              {staff.filter((s) => s.status === 'Active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Staff accounts table grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Team Member</TableHead>
                <TableHead className="w-[220px]">Email Address</TableHead>
                <TableHead className="text-center w-[130px]">Assigned Role</TableHead>
                <TableHead className="w-[200px]">System Permissions</TableHead>
                <TableHead className="text-center w-[110px]">Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right w-[110px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => {
                const initials = s.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .substring(0, 2);

                const pms = getRolePermissions(s.role);
                const roleBadgeClass = getRoleBadgeColor(s.role);

                return (
                  <TableRow key={s.id}>
                    {/* Member */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 text-sm">{s.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">ID: {s.id}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-slate-600 font-mono text-xs">
                      {s.email}
                    </TableCell>

                    {/* Role */}
                    <TableCell className="text-center">
                      <Badge variant="outline" size="sm" className={roleBadgeClass}>
                        {s.role}
                      </Badge>
                    </TableCell>

                    {/* Module Permissions */}
                    <TableCell className="select-none">
                      <div className="flex flex-wrap gap-1 text-[10px] font-semibold uppercase tracking-wider">
                        {pms.read && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">Read</span>}
                        {pms.create && <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">Create</span>}
                        {pms.edit && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">Edit</span>}
                        {pms.delete && <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">Delete</span>}
                        {pms.export && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">Export</span>}
                      </div>
                    </TableCell>

                    {/* Status Toggle */}
                    <TableCell className="text-center">
                      <button
                        onClick={() => updateStaffStatus(s.id, s.status === 'Active' ? 'Inactive' : 'Active')}
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full cursor-pointer transition-colors border ${
                          s.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                        title="Click to toggle account access"
                      >
                        {s.status}
                      </button>
                    </TableCell>

                    {/* Last login */}
                    <TableCell className="text-slate-500 font-mono text-xs whitespace-nowrap">
                      {s.lastLogin}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => resetStaffPassword(s.id)}
                          className="p-1.5 border border-slate-200 hover:border-slate-400 text-slate-600 hover:text-slate-900 rounded-md bg-white cursor-pointer transition-colors min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                          title="Generate Password Reset Link"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${s.name} from the staff accounts registry?`)) {
                              deleteStaff(s.id);
                            }
                          }}
                          className="p-1.5 border border-slate-200 hover:border-rose-500 text-slate-600 hover:text-rose-600 rounded-md bg-white cursor-pointer transition-colors min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                          title="Revoke and Delete Account"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Invite Staff Dialog Modal */}
      {inviteModalOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInviteModalOpen(false);
          }}
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-[460px] p-6 relative my-auto animate-slideUp">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Invite Team Member
            </h3>
            <p className="text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
              Configure their role privileges and send an onboarding invitation.
            </p>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maya Roy"
                    className="w-full border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 rounded-lg pl-9 pr-3 py-2 text-xs outline-none bg-white text-slate-800 transition-all min-h-[42px]"
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Corporate Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. maya@ecommerce.com"
                    className="w-full border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 rounded-lg pl-9 pr-3 py-2 text-xs font-mono outline-none bg-white text-slate-800 transition-all min-h-[42px]"
                    value={invEmail}
                    onChange={(e) => setInvEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Administrative Role *</label>
                <select
                  className="w-full border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 rounded-lg px-3 py-2 text-xs outline-none bg-white text-slate-800 cursor-pointer min-h-[42px]"
                  value={invRole}
                  onChange={(e) => setInvRole(e.target.value as any)}
                >
                  <option value="Super Admin">Super Admin (Full Root Permissions)</option>
                  <option value="Admin">Admin (Full Edit / No Delete)</option>
                  <option value="Manager">Manager (Edit Catalog & Stock / No Export)</option>
                  <option value="Sales">Sales (CRM Leads & Touchpoints only)</option>
                  <option value="Support">Support (View Dashboard & Reply to Reviews)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer transition-colors shadow-xs min-h-[40px]"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAccounts;
