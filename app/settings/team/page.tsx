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
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const { notify } = useNotification();

  const fetchMembers = useCallback(async () => {
    const adminEmail = localStorage.getItem('authenticated_user_email');
    try {
      const res = await fetch(`/api/team/members?adminEmail=${adminEmail}`);
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
      permissions: newRole === 'admin' ? MODULES.map(m => m.id) : [] 
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
        fetchMembers();
      }
    } catch (err) {
      notify('Update protocol failed', 'error');
    }
  };

  const handleTogglePermission = async (member: TeamMember, moduleId: string) => {
    if (member.role === 'admin') return;

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
        fetchMembers();
      }
    } catch (err) {
       notify('Permission update failed', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 lg:ml-72 p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-trust-green" />
                <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Protocol Hub</span>
              </div>
              <h1 className="font-display text-4xl font-bold text-zinc-900 tracking-tight">Team Management</h1>
              <p className="font-sans text-zinc-500 mt-2">Scale your decentralized operation with controlled access.</p>
            </div>
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="h-12 px-6 bg-zinc-950 text-white rounded-xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          </div>

          {/* Members List */}
          <div className="glass rounded-[2.5rem] border border-zinc-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-bottom border-zinc-100">
                    <th className="p-6 font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Member Identity</th>
                    <th className="p-6 font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest md:table-cell hidden">Role Info</th>
                    <th className="p-6 font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Access Matrix</th>
                    <th className="p-6 font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-zinc-400 font-sans italic">Loading team synchronization...</td>
                    </tr>
                  ) : members.map((member) => (
                    <tr key={member._id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-trust-green font-display font-bold">
                            {member.firstName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm text-zinc-900">{member.firstName} {member.lastName}</p>
                            <p className="font-sans text-[11px] text-zinc-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 md:table-cell hidden">
                         <div className="flex items-center gap-2">
                           <span className={`px-2.5 py-1 rounded-full font-mono text-[8.5px] font-black uppercase tracking-widest ${
                             member.role === 'admin' ? 'bg-zinc-950 text-trust-green' : 'bg-zinc-100 text-zinc-400'
                           }`}>
                             {member.role === 'admin' ? 'SYS_ADMIN' : 'MEMBER_RELAY'}
                           </span>
                         </div>
                      </td>
                      <td className="p-6">
                         <div className="flex flex-wrap gap-1.5">
                            {member.role === 'admin' ? (
                              <span className="font-mono text-[9px] text-trust-green font-bold uppercase tracking-widest flex items-center gap-1.5 p-2 bg-trust-green/5 rounded-lg border border-trust-green/10">
                                <ShieldCheck className="w-3 h-3" /> Universal Access
                              </span>
                            ) : MODULES.map(m => {
                              const hasAccess = member.permissions.includes(m.id);
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => handleTogglePermission(member, m.id)}
                                  className={`px-2 py-1 rounded-lg font-mono text-[8px] font-bold uppercase tracking-wider transition-all border ${
                                    hasAccess 
                                      ? 'bg-zinc-900 text-trust-green border-zinc-800' 
                                      : 'bg-white text-zinc-300 border-zinc-100 opacity-60'
                                  }`}
                                  title={m.desc}
                                >
                                  {m.name.split(' ')[0]}
                                </button>
                              );
                            })}
                         </div>
                      </td>
                      <td className="p-6 text-right">
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedMember(member)}
                              className="p-2 text-zinc-400 hover:text-zinc-950 transition-colors"
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
      </main>

      {/* Profile Detail Slide-over / Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl p-8 lg:p-12 overflow-y-auto"
            >
               <button 
                 onClick={() => setSelectedMember(null)}
                 className="absolute top-8 right-8 p-2 text-zinc-300 hover:text-zinc-950 transition-colors"
               >
                 <X className="w-6 h-6" />
               </button>

               <div className="mt-12">
                  <div className="w-20 h-20 rounded-3xl bg-zinc-950 flex items-center justify-center text-trust-green font-display font-black text-2xl mb-6">
                    {selectedMember.firstName.charAt(0)}
                  </div>
                  <h2 className="font-display text-3xl font-bold text-zinc-900">{selectedMember.firstName} {selectedMember.lastName}</h2>
                  <p className="font-sans text-zinc-400 mt-1">{selectedMember.email}</p>
                  
                  <div className="mt-12 space-y-8">
                     <section>
                        <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-4">Protocol Role</p>
                        <div className="grid grid-cols-2 gap-4">
                           <button 
                             onClick={() => handleUpdateRole(selectedMember.email, 'admin')}
                             className={`p-4 rounded-2xl border text-left transition-all ${
                               selectedMember.role === 'admin' ? 'border-trust-green bg-trust-green/[0.02]' : 'border-zinc-100 hover:border-zinc-200'
                             }`}
                           >
                              <Shield className={`w-5 h-5 mb-2 ${selectedMember.role === 'admin' ? 'text-trust-green' : 'text-zinc-400'}`} />
                              <p className="font-display font-bold text-sm text-zinc-900">Admin</p>
                              <p className="font-sans text-[10px] text-zinc-400 mt-1">Full terminal access</p>
                           </button>
                           <button 
                             onClick={() => handleUpdateRole(selectedMember.email, 'member')}
                             className={`p-4 rounded-2xl border text-left transition-all ${
                               selectedMember.role === 'member' ? 'border-trust-green bg-trust-green/[0.02]' : 'border-zinc-100 hover:border-zinc-200'
                             }`}
                           >
                              <Users className={`w-5 h-5 mb-2 ${selectedMember.role === 'member' ? 'text-trust-green' : 'text-zinc-400'}`} />
                              <p className="font-display font-bold text-sm text-zinc-900">Member</p>
                              <p className="font-sans text-[10px] text-zinc-400 mt-1">Limited module access</p>
                           </button>
                        </div>
                     </section>

                     <section>
                        <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-4">Module Provisioning</p>
                        <div className="space-y-3">
                           {MODULES.map(module => {
                             const isActive = selectedMember.role === 'admin' || selectedMember.permissions.includes(module.id);
                             return (
                               <div key={module.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                                  <div>
                                     <p className="font-display font-bold text-sm text-zinc-900">{module.name}</p>
                                     <p className="font-sans text-[10px] text-zinc-400">{module.desc}</p>
                                  </div>
                                  <button 
                                    disabled={selectedMember.role === 'admin'}
                                    onClick={() => handleTogglePermission(selectedMember, module.id)}
                                    className={`w-10 h-6 rounded-full transition-all relative ${
                                      isActive ? 'bg-trust-green' : 'bg-zinc-200'
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

                  <div className="mt-12 pt-12 border-t border-zinc-100">
                     <button className="w-full h-14 border border-red-100 text-red-500 rounded-2xl font-display font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Revoke Access
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
    </div>
  );
}

function InviteModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = SecurityService.prepareForTransit({ 
        ...formData,
        role: 'member',
        permissions: ['dashboard'] 
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
            className="relative w-full max-w-xl bg-white rounded-[3rem] overflow-hidden"
          >
             <div className="p-8 lg:p-12">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus className="w-4 h-4 text-trust-green" />
                        <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Onboard Member</span>
                      </div>
                      <h3 className="font-display text-3xl font-bold text-zinc-900 tracking-tight">Provision New Access</h3>
                   </div>
                   <button onClick={onClose} className="p-2 text-zinc-300 hover:text-zinc-950 transition-colors">
                      <X className="w-6 h-6" />
                   </button>
                </div>

                <form onSubmit={handleInvite} className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-4">Given Name</label>
                         <input 
                           required
                           type="text"
                           value={formData.firstName}
                           onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                           className="w-full h-14 p-6 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-trust-green/20 outline-none transition-all placeholder:text-zinc-300 font-display font-medium text-sm"
                           placeholder="Enter first name"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-4">Surname</label>
                         <input 
                           required
                           type="text"
                           value={formData.lastName}
                           onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                           className="w-full h-14 p-6 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-trust-green/20 outline-none transition-all placeholder:text-zinc-300 font-display font-medium text-sm"
                           placeholder="Enter last name"
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-4">Digital Identity (Email)</label>
                      <input 
                        required
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-14 p-6 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-trust-green/20 outline-none transition-all placeholder:text-zinc-300 font-display font-medium text-sm"
                        placeholder="identity@techcore.io"
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-4">Temporary Keyphrase</label>
                      <input 
                        required
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full h-14 p-6 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-trust-green/20 outline-none transition-all placeholder:text-zinc-300 font-mono text-sm"
                        placeholder="••••••••••••"
                      />
                   </div>

                   <div className="pt-6">
                      <button 
                        disabled={loading}
                        className="w-full h-16 bg-zinc-950 text-white rounded-2xl font-display font-bold text-sm uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
