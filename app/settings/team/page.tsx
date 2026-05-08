'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  MoreHorizontal, 
  Mail, 
  ShieldCheck, 
  AlertCircle,
  X,
  Plus,
  CheckCircle2,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { useNotification } from '@/hooks/use-notification';
import { SecurityService } from '@/lib/security-service';
import { useUser } from '@/hooks/use-user';
import { AccessDenied } from '@/components/access-denied';

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'member';
  permissions: string[];
  verificationStatus: string;
  createdAt: string;
}

const MODULES = [
  { id: 'dashboard', name: 'Global Dashboard', desc: 'Overview and system metrics' },
  { id: 'notarize', name: 'Index Protocol', desc: 'Document notarization and hashing' },
  { id: 'registry', name: 'Node Registry', desc: 'Official registry management' },
  { id: 'verify', name: 'Verify Protocol', desc: 'Document verification and scan' },
  { id: 'analytics', name: 'Core Analytics', desc: 'Data visualization and reports' },
  { id: 'settings', name: 'System Settings', desc: 'General configuration' },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const { notify } = useNotification();
  const { role, loading: userLoading } = useUser();

  const fetchMembers = useCallback(async () => {
    const adminEmail = localStorage.getItem('authenticated_user_email');
    try {
      const res = await fetch(`/api/team/members?adminEmail=${encodeURIComponent(adminEmail || '')}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        setMembers(data);
      } else {
        notify('Unauthorized access to Team Hub', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMembers]);

  const handleUpdateRole = async (targetEmail: string, newRole: 'admin' | 'member') => {
    const adminEmail = localStorage.getItem('authenticated_user_email');
    const updates = { 
      role: newRole,
      permissions: newRole === 'admin' ? MODULES.map(m => m.id) : ['dashboard'] 
    };

    try {
      const payload = SecurityService.prepareForTransit({ adminEmail, targetEmail, updates });
      const res = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        notify(`Updated ${targetEmail} to ${newRole}`, 'success');
        if (selectedMember && selectedMember.email === targetEmail) {
            setSelectedMember({ ...selectedMember, ...updates });
        }
        fetchMembers();
      }
    } catch (err) {
      notify('Update protocol failed', 'error');
    }
  };

  const handleTogglePermission = async (member: TeamMember, moduleId: string) => {
    if (member.role === 'admin' || moduleId === 'dashboard') return;

    const adminEmail = localStorage.getItem('authenticated_user_email');
    const newPermissions = member.permissions.includes(moduleId)
      ? member.permissions.filter(p => p !== moduleId)
      : [...member.permissions, moduleId];

    try {
      const payload = SecurityService.prepareForTransit({ 
        adminEmail, 
        targetEmail: member.email, 
        updates: { permissions: newPermissions } 
      });
      const res = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (selectedMember && selectedMember.email === member.email) {
            setSelectedMember({ ...selectedMember, permissions: newPermissions });
        }
        fetchMembers();
      }
    } catch (err) {
       notify('Permission update failed', 'error');
    }
  };

  const handleRevokeAccess = async (targetEmail: string) => {
    const adminEmail = localStorage.getItem('authenticated_user_email')?.trim().toLowerCase();
    const normalizedTarget = targetEmail.trim().toLowerCase();
    
    if (adminEmail === normalizedTarget) {
        notify('System Override: You cannot revoke your own primary access.', 'error');
        return;
    }

    const ok = await confirm({
      title: 'Revoke Member Access',
      message: `Are you sure you want to permanently revoke access for ${targetEmail}? This action is irreversible and will purge their credentials from the node ledger.`,
      confirmText: 'Revoke Access',
      cancelText: 'Cancel'
    });

    if (!ok) return;

    // Optimistic Update
    const previousMembers = [...members];
    setMembers(prev => prev.filter(m => m.email.toLowerCase() !== normalizedTarget));
    setSelectedMember(null);

    setRevokingEmail(normalizedTarget);
    try {
      const res = await fetch(`/api/team/members?adminEmail=${encodeURIComponent(adminEmail || '')}&targetEmail=${encodeURIComponent(normalizedTarget)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        notify('Member access revoked and purged from ledger.', 'success');
        setMembers(prev => prev.filter(m => m.email.toLowerCase() !== normalizedTarget));
        // Re-fetch handled by optimistic delete above, but we can do a hard sync if needed
      } else {
        const err = await res.json();
        notify(err.error || 'Revoke protocol failed', 'error');
        setMembers(previousMembers); // Rollback
      }
    } catch (err) {
      notify('Revoke protocol failed', 'error');
      setMembers(previousMembers); // Rollback
    } finally {
      setRevokingEmail(null);
    }
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-trust-green/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-trust-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <main className="relative min-h-screen w-full bg-white dark:bg-zinc-950 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6 transition-colors">
        <Sidebar />
        <div className="relative z-10 w-full max-w-7xl mx-auto py-8 sm:py-12 lg:py-20 flex items-center justify-center">
          <AccessDenied />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full bg-white dark:bg-zinc-950 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6 transition-colors duration-300">
      <Sidebar />
      <div className="relative z-10 w-full max-w-7xl mx-auto py-8 sm:py-12 lg:py-20">
        <div>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-trust-green" />
                <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest">Protocol Hub</span>
              </div>
              <h1 className="font-display text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">Team Management</h1>
              <p className="font-sans text-zinc-500 dark:text-zinc-400 mt-2">Scale your decentralized operation with controlled access.</p>
            </div>
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="h-12 px-6 bg-zinc-950 dark:bg-trust-green text-white dark:text-zinc-950 rounded-xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-trust-green/90 transition-all shadow-xl shadow-zinc-200 dark:shadow-none flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          </div>

          {/* Members List */}
          <div className="glass rounded-[2.5rem] border border-zinc-100 dark:border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-bottom border-zinc-100 dark:border-white/5">
                    <th className="p-6 font-mono text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest">Member Identity</th>
                    <th className="p-6 font-mono text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest md:table-cell hidden">Role Info</th>
                    <th className="p-6 font-mono text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest">Access Matrix</th>
                    <th className="p-6 font-mono text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-zinc-400 dark:text-zinc-600 font-sans italic">Loading team synchronization...</td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-zinc-400 dark:text-zinc-600 font-sans italic">No members found in the protocol network.</td>
                    </tr>
                  ) : members.map((member) => (
                    <tr key={member._id} className="group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-800 flex items-center justify-center text-trust-green font-display font-bold">
                            {member.firstName ? member.firstName.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm text-zinc-900 dark:text-white">{member.firstName || 'Unknown'} {member.lastName || 'Node'}</p>
                            <p className="font-sans text-[11px] text-zinc-400 dark:text-zinc-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 md:table-cell hidden">
                         <div className="flex items-center gap-2">
                           <span className={`px-2.5 py-1 rounded-full font-mono text-[8.5px] font-black uppercase tracking-widest ${
                             member.role === 'admin' ? 'bg-zinc-950 dark:bg-trust-green text-trust-green dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                           }`}>
                             {member.role === 'admin' ? 'SYS_ADMIN' : 'MEMBER_RELAY'}
                           </span>
                         </div>
                      </td>
                      <td className="p-6">
                         <div className="flex flex-wrap gap-1.5">
                            {member.role === 'admin' ? (
                              <span className="font-mono text-[9px] text-trust-green font-bold uppercase tracking-widest flex items-center gap-1.5 p-2 bg-trust-green/5 dark:bg-trust-green/10 rounded-lg border border-trust-green/10">
                                <ShieldCheck className="w-3 h-3" /> Universal Access
                              </span>
                            ) : MODULES.map(m => {
                              const hasAccess = member.permissions.includes(m.id);
                              const isMandatory = m.id === 'dashboard';
                              return (
                                <button
                                  key={m.id}
                                  disabled={isMandatory || member.role === 'admin'}
                                  onClick={() => handleTogglePermission(member, m.id)}
                                  className={`px-2 py-1 rounded-lg font-mono text-[8px] font-bold uppercase tracking-wider transition-all border ${
                                    hasAccess 
                                      ? 'bg-zinc-900 dark:bg-trust-green text-trust-green dark:text-zinc-950 border-zinc-800 dark:border-trust-green/20' 
                                      : 'bg-white dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700 border-zinc-100 dark:border-white/5 opacity-60'
                                  } ${isMandatory ? 'cursor-default' : 'hover:scale-105'}`}
                                  title={m.desc}
                                >
                                  {m.name}
                                </button>
                              );
                            })}
                         </div>
                      </td>
                      <td className="p-6 text-right">
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedMember(member)}
                              className="p-2 text-zinc-400 dark:text-zinc-600 hover:text-zinc-950 dark:hover:text-white transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Detail Slide-over / Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-zinc-950/20 dark:bg-zinc-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl p-8 lg:p-12 overflow-y-auto"
            >
               <button 
                 onClick={() => setSelectedMember(null)}
                 className="absolute top-8 right-8 p-2 text-zinc-300 dark:text-zinc-600 hover:text-zinc-950 dark:hover:text-white transition-colors"
               >
                 <X className="w-6 h-6" />
               </button>

               <div className="mt-12">
                  <div className="w-20 h-20 rounded-3xl bg-zinc-950 dark:bg-zinc-800 flex items-center justify-center text-trust-green font-display font-black text-2xl mb-6">
                    {selectedMember.firstName ? selectedMember.firstName.charAt(0) : '?'}
                  </div>
                  <h2 className="font-display text-3xl font-bold text-zinc-900 dark:text-white">{selectedMember.firstName || 'Unknown'} {selectedMember.lastName || 'Member'}</h2>
                  <p className="font-sans text-zinc-400 dark:text-zinc-500 mt-1">{selectedMember.email}</p>
                  
                  <div className="mt-12 space-y-8">
                     <section>
                        <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest mb-4">Protocol Role</p>
                        <div className="grid grid-cols-2 gap-4">
                           <button 
                             onClick={() => handleUpdateRole(selectedMember.email, 'admin')}
                             className={`p-4 rounded-2xl border text-left transition-all ${
                               selectedMember.role === 'admin' ? 'border-trust-green bg-trust-green/[0.02] dark:bg-trust-green/5' : 'border-zinc-100 dark:border-white/5 hover:border-zinc-200 dark:hover:border-white/10'
                             }`}
                           >
                              <Shield className={`w-5 h-5 mb-2 ${selectedMember.role === 'admin' ? 'text-trust-green' : 'text-zinc-400 dark:text-zinc-600'}`} />
                              <p className="font-display font-bold text-sm text-zinc-900 dark:text-white">Admin</p>
                              <p className="font-sans text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Full terminal access</p>
                           </button>
                           <button 
                             onClick={() => handleUpdateRole(selectedMember.email, 'member')}
                             className={`p-4 rounded-2xl border text-left transition-all ${
                               selectedMember.role === 'member' ? 'border-trust-green bg-trust-green/[0.02] dark:bg-trust-green/5' : 'border-zinc-100 dark:border-white/5 hover:border-zinc-200 dark:hover:border-white/10'
                             }`}
                           >
                              <Users className={`w-5 h-5 mb-2 ${selectedMember.role === 'member' ? 'text-trust-green' : 'text-zinc-400 dark:text-zinc-600'}`} />
                              <p className="font-display font-bold text-sm text-zinc-900 dark:text-white">Member</p>
                              <p className="font-sans text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Limited module access</p>
                           </button>
                        </div>
                     </section>

                     <section>
                        <p className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest mb-4">Module Provisioning</p>
                        <div className="space-y-3">
                           {MODULES.map(module => {
                             const isActive = selectedMember.role === 'admin' || selectedMember.permissions.includes(module.id);
                             return (
                               <div key={module.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-white/5 transition-all">
                                  <div>
                                     <p className="font-display font-bold text-sm text-zinc-900 dark:text-white">{module.name}</p>
                                     <p className="font-sans text-[10px] text-zinc-400 dark:text-zinc-500">{module.desc}</p>
                                  </div>
                                  <button 
                                    disabled={selectedMember.role === 'admin' || module.id === 'dashboard'}
                                    onClick={() => handleTogglePermission(selectedMember, module.id)}
                                    className={`w-10 h-6 rounded-full transition-all relative ${
                                      isActive ? 'bg-trust-green' : 'bg-zinc-200 dark:bg-zinc-700'
                                    } ${selectedMember.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                                       isActive ? 'left-5' : 'left-1'
                                     }`} />
                                  </button>
                               </div>
                             );
                           })}
                        </div>
                     </section>
                  </div>

                  <div className="mt-12 pt-12 border-t border-zinc-100 dark:border-white/5">
                     <button 
                        onClick={() => handleRevokeAccess(selectedMember.email)}
                        disabled={revokingEmail === selectedMember.email.toLowerCase()}
                        className="w-full h-14 border border-red-500/20 text-red-500 rounded-2xl font-display font-bold text-xs uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                        {revokingEmail === selectedMember.email.toLowerCase() ? (
                          <div className="w-5 h-5 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        {revokingEmail === selectedMember.email.toLowerCase() ? 'Purging Identity...' : 'Revoke Access'}
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onSuccess={fetchMembers}
      />
    </main>
  );
}

function InviteModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['dashboard']);
  const { notify } = useNotification();
  const { user, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(false);

  const togglePermission = (id: string) => {
    if (role === 'admin' || id === 'dashboard') return;
    setSelectedPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = SecurityService.prepareForTransit({ 
        ...formData,
        role: role,
        permissions: role === 'admin' ? MODULES.map(m => m.id) : selectedPermissions,
        invitedBy: user?._id
      });
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        notify('Member invited to the network successfully', 'success');
        onSuccess();
        onClose();
        setFormData({ firstName: '', lastName: '', email: '', password: '' });
        setRole('member');
        setSelectedPermissions(['dashboard']);
      } else {
        const err = await res.json();
        notify(err.error || 'Invite protocol failed', 'error');
      }
    } catch (err) {
      notify('Critical invite error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl dark:shadow-none border dark:border-white/5"
          >
             <div className="p-8 lg:p-12 max-h-[90vh] overflow-y-auto scrollbar-none">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus className="w-4 h-4 text-trust-green" />
                        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest">Invite Member</span>
                      </div>
                      <h3 className="font-display text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Provision New Access</h3>
                   </div>
                   <button onClick={onClose} className="p-2 text-zinc-300 dark:text-zinc-600 hover:text-zinc-950 dark:hover:text-white transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>

                <form onSubmit={handleInvite} className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest ml-4">Given Name</label>
                         <input 
                           required
                           type="text"
                           value={formData.firstName}
                           onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                           className="w-full h-14 px-6 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-trust-green/20 outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700 font-display font-medium text-sm text-zinc-900 dark:text-white"
                           placeholder="Enter first name"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest ml-4">Surname</label>
                         <input 
                           required
                           type="text"
                           value={formData.lastName}
                           onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                           className="w-full h-14 px-6 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-trust-green/20 outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700 font-display font-medium text-sm text-zinc-900 dark:text-white"
                           placeholder="Enter last name"
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest ml-4">Digital Identity (Email)</label>
                      <input 
                        required
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-14 px-6 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-trust-green/20 outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700 font-display font-medium text-sm text-zinc-900 dark:text-white"
                        placeholder="identity@techcore.io"
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest ml-4">Temporary Keyphrase</label>
                      <input 
                        required
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full h-14 px-6 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-trust-green/20 outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700 font-mono text-sm text-zinc-900 dark:text-white"
                        placeholder="••••••••••••"
                      />
                   </div>

                   <div className="space-y-4">
                      <label className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest ml-4">Access Level</label>
                      <div className="grid grid-cols-2 gap-3">
                         <button 
                           type="button"
                           onClick={() => setRole('member')}
                           className={`p-3 rounded-xl border text-left transition-all ${role === 'member' ? 'border-trust-green bg-trust-green/5 dark:bg-trust-green/10' : 'border-zinc-100 dark:border-white/5'}`}
                         >
                            <p className="font-display font-bold text-xs text-zinc-900 dark:text-white">Standard Member</p>
                         </button>
                         <button 
                           type="button"
                           onClick={() => setRole('admin')}
                           className={`p-3 rounded-xl border text-left transition-all ${role === 'admin' ? 'border-trust-green bg-trust-green/5 dark:bg-trust-green/10' : 'border-zinc-100 dark:border-white/5'}`}
                         >
                            <p className="font-display font-bold text-xs text-zinc-900 dark:text-white">System Admin</p>
                         </button>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest ml-4">Module Provisioning</label>
                      <div className="grid grid-cols-2 gap-2">
                         {MODULES.map(module => {
                           const isActive = role === 'admin' || selectedPermissions.includes(module.id);
                           return (
                             <button
                               type="button"
                               key={module.id}
                               disabled={role === 'admin' || module.id === 'dashboard'}
                               onClick={() => togglePermission(module.id)}
                               className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                 isActive ? 'bg-zinc-900 dark:bg-trust-green border-zinc-800 dark:border-trust-green/20' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-white/5'
                               } ${role === 'admin' ? 'opacity-70 cursor-not-allowed' : ''}`}
                             >
                                <span className={`font-display font-bold text-[10px] ${isActive ? (role === 'admin' ? 'text-trust-green' : 'text-trust-green dark:text-zinc-950') : 'text-zinc-500'}`}>{module.name}</span>
                                {isActive && <CheckCircle2 className={`w-3 h-3 ${role === 'admin' ? 'text-trust-green' : 'text-trust-green dark:text-zinc-950'}`} />}
                             </button>
                           );
                         })}
                      </div>
                   </div>

                   <div className="pt-6">
                      <button 
                         disabled={loading}
                         className="w-full h-16 bg-zinc-950 dark:bg-trust-green text-white dark:text-zinc-950 rounded-2xl font-display font-bold text-sm uppercase tracking-[0.2em] hover:bg-zinc-800 dark:hover:bg-trust-green/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-zinc-200 dark:shadow-none"
                      >
                         {loading ? 'Initializing Protocol...' : 'Authorize Member Access'}
                         <ChevronRight className="w-5 h-5" />
                      </button>
                   </div>
                </form>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
