'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Shield, 
  Lock, 
  Bell, 
  Moon, 
  Sun, 
  Trash2, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  User,
  Briefcase,
  Network
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { FormError } from '@/components/form-error';
import { BackgroundAnimation } from '@/components/background-animation';
import { useNotification } from '@/hooks/use-notification';
import { SecurityService } from '@/lib/security-service';
import { useTheme } from '@/components/theme-provider';

export default function SettingsPage() {
  const { notify, confirm } = useNotification();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<'security' | 'preferences' | 'account'>('security');
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);
  
  // State: Security
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // State: Preferences
  const [notifications, setNotifications] = useState({ email: true, push: false, alerts: true });

  const fetchSessions = async () => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) return;
    setIsFetchingSessions(true);
    try {
      const res = await fetch(`/api/auth/sessions?email=${email}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingSessions(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const email = localStorage.getItem('authenticated_user_email');
      if (!email) return;
      try {
        const res = await fetch(`/api/auth/me?email=${email}`);
        if (res.ok) {
          const body = await res.json();
          const data = SecurityService.processFromTransit(body);
          setUser(data);
          setIs2FAEnabled(!!data.is2FAEnabled);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
    fetchSessions();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      notify('New passwords do not match', 'error');
      return;
    }
    
    if (passwords.new.length < 8) {
      notify('Password must be at least 8 characters', 'error');
      return;
    }

    const email = localStorage.getItem('authenticated_user_email');
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwords.new }),
      });

      if (res.ok) {
        notify('Credentials updated across network nodes.', 'success');
        setShowPasswordChange(false);
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        notify('Failed to update credentials.', 'error');
      }
    } catch (err) {
      notify('Protocol error during update.', 'error');
    }
  };

  const handleToggle2FA = async () => {
    const nextState = !is2FAEnabled;
    const ok = await confirm({
      title: nextState ? 'Enable Two-Factor Authentication' : 'Disable Two-Factor Authentication',
      message: nextState 
        ? 'Enabling 2FA adds an extra layer of security. You will need to verify your identity with a 6-character alphanumeric code during sensitive operations.'
        : 'Disabling 2FA reduces your account security. Are you sure you want to proceed?',
      confirmText: nextState ? 'Enable 2FA' : 'Disable 2FA',
      cancelText: 'Cancel'
    });

    if (ok) {
      const email = localStorage.getItem('authenticated_user_email');
      try {
        const res = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, is2FAEnabled: nextState }),
        });

        if (res.ok) {
          setIs2FAEnabled(nextState);
          notify(`2FA protocol successfully ${nextState ? 'enforced' : 'decommissioned'}.`, 'success');
        }
      } catch (err) {
        notify('Failed to synchronize 2FA status.', 'error');
      }
    }
  };

  const handleDeleteAccount = async () => {
    const ok = await confirm({
      title: 'Deep Purge Protocol',
      message: 'This will permanently destroy your node instance and all associated cryptographic records. This process is irreversible.',
      confirmText: 'Execute Purge',
      cancelText: 'Abort'
    });

    if (ok) {
      try {
        const email = localStorage.getItem('authenticated_user_email');
        const res = await fetch(`/api/auth/delete?email=${encodeURIComponent(email || '')}`, {
          method: 'DELETE'
        });
        
        if (res.ok) {
          notify('Purge sequence complete. Identity destroyed.', 'success');
          localStorage.clear();
          router.push('/login');
        } else {
          notify('Purge protocol failed. System lockdown active.', 'error');
        }
      } catch (err) {
        notify('System failure during purge.', 'error');
      }
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-white dark:bg-zinc-950 selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6 transition-colors duration-300">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-5xl mx-auto py-12 lg:py-20">
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-white/10">
              <Settings className="text-trust-green w-6 h-6" />
            </div>
            <h1 className="font-display text-4xl font-bold text-zinc-900 dark:text-white">Settings</h1>
          </motion.div>
          <p className="font-sans text-zinc-500 dark:text-zinc-400">Configure your node preferences, security protocols, and account status.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Nav */}
          <div className="lg:col-span-1 space-y-2">
            {[
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'preferences', label: 'Preferences', icon: Bell },
              { id: 'account', label: 'Account', icon: Lock }
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${
                  activeSection === section.id 
                    ? 'bg-trust-green text-zinc-950 shadow-xl shadow-trust-green/10' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
              >
                <section.icon className="w-4 h-4" />
                <span className="font-display font-bold text-xs uppercase tracking-widest">{section.label}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {activeSection === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* 2FA Section */}
                  <section className="glass rounded-[2.5rem] p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h3 className="font-display font-bold text-xl text-zinc-900 dark:text-white mb-2">Two-Factor Authentication</h3>
                        <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400">Secure your account with 6-character alphanumeric verification.</p>
                      </div>
                      <button 
                        onClick={handleToggle2FA}
                        className={`relative w-14 h-8 rounded-full transition-all flex items-center p-1 ${
                          is2FAEnabled ? 'bg-trust-green' : 'bg-zinc-200 dark:bg-zinc-800'
                        }`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full transition-all shadow-sm ${is2FAEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-white/5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${is2FAEnabled ? 'bg-trust-green/10 text-trust-green' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-xs text-zinc-900 dark:text-white">Email Verification Protocol</p>
                        <p className="font-mono text-[10px] text-zinc-400">STATUS: {is2FAEnabled ? 'ENFORCED' : 'DISABLED'}</p>
                      </div>
                      {is2FAEnabled && <div className="px-3 py-1 bg-trust-green/10 text-trust-green rounded-full font-mono text-[9px] font-bold">VERIFIED</div>}
                    </div>
                  </section>

                  {/* Password Section */}
                  <section className="glass rounded-[2.5rem] p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-display font-bold text-xl text-zinc-900 dark:text-white">Security Credentials</h3>
                      {!showPasswordChange && (
                        <button 
                          onClick={() => setShowPasswordChange(true)}
                          className="px-4 py-2 border border-zinc-100 dark:border-white/10 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-500 hover:border-trust-green transition-all"
                        >
                          Change Password
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {showPasswordChange ? (
                        <motion.form 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          onSubmit={handlePasswordChange}
                          className="space-y-4"
                        >
                          <div className="space-y-4 pt-4">
                            {[
                              { id: 'current', label: 'Current Password', placeholder: '••••••••' },
                              { id: 'new', label: 'New Password', placeholder: 'Min. 8 characters' },
                              { id: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' }
                            ].map((p) => (
                              <div key={p.id} className="space-y-2">
                                <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">{p.label}</label>
                                <div className="relative">
                                  <input 
                                    type={showPasswords[p.id as keyof typeof showPasswords] ? 'text' : 'password'}
                                    placeholder={p.placeholder}
                                    value={passwords[p.id as keyof typeof passwords]}
                                    onChange={(e) => setPasswords({...passwords, [p.id]: e.target.value})}
                                    className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm dark:text-white dark:placeholder:text-zinc-700 transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswords({...showPasswords, [p.id]: !showPasswords[p.id as keyof typeof showPasswords]})}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                                  >
                                    {showPasswords[p.id as keyof typeof showPasswords] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                                {p.id === 'new' && passwords.new && passwords.new.length < 8 && (
                                  <FormError message="Password must be at least 8 characters" />
                                )}
                                {p.id === 'confirm' && passwords.confirm && passwords.new !== passwords.confirm && (
                                  <FormError message="Passwords do not match" />
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3 pt-4">
                            <button 
                              type="button" 
                              onClick={() => setShowPasswordChange(false)}
                              className="flex-1 h-12 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              className="flex-1 h-12 bg-trust-green text-zinc-950 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-trust-green/20"
                            >
                              Update Credentials
                            </button>
                          </div>
                        </motion.form>
                      ) : (
                        <div className="flex items-center gap-3 text-zinc-400">
                          <CheckCircle2 className="w-4 h-4 text-trust-green" />
                          <span className="font-sans text-sm">Last changed 42 days ago</span>
                        </div>
                      )}
                    </AnimatePresence>
                  </section>
                </motion.div>
              )}

              {activeSection === 'preferences' && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <section className="glass rounded-[2.5rem] p-8">
                    <h3 className="font-display font-bold text-xl text-zinc-900 dark:text-white mb-8">System interface</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-100 dark:border-white/5">
                            {theme === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-400" />}
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm text-zinc-900 dark:text-white">Core Theme</p>
                            <p className="font-sans text-xs text-zinc-500 dark:text-zinc-400">Toggle between professional modes.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                          className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                        >
                          <div className={`px-4 py-2 rounded-lg font-display font-bold text-[10px] uppercase tracking-widest transition-all ${theme === 'light' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500'}`}>
                            Light
                          </div>
                          <div className={`px-4 py-2 rounded-lg font-display font-bold text-[10px] uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-zinc-950 dark:bg-trust-green text-white dark:text-zinc-950 shadow-sm' : 'text-zinc-500'}`}>
                            Dark
                          </div>
                        </button>
                      </div>

                      <div className="h-px bg-zinc-100 dark:bg-white/5" />

                      <div className="space-y-6">
                        <h4 className="font-display font-bold text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em]">Operational Alerts</h4>
                        {[
                          { id: 'email', label: 'Email Digest', desc: 'Secure summary of signature activity.' },
                          { id: 'push', label: 'Real-time Pulse', desc: 'Push notifications for direct verification.' },
                          { id: 'alerts', label: 'Security Heartbeat', desc: 'Critical system and node status updates.' }
                        ].map((n) => (
                          <div key={n.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-display font-bold text-sm text-zinc-900 dark:text-white">{n.label}</p>
                              <p className="font-sans text-xs text-zinc-500 dark:text-zinc-400">{n.desc}</p>
                            </div>
                            <button 
                              onClick={() => setNotifications({...notifications, [n.id]: !notifications[n.id as keyof typeof notifications]})}
                              className={`relative w-12 h-6 rounded-full transition-all flex items-center p-0.5 ${
                                notifications[n.id as keyof typeof notifications] ? 'bg-trust-green' : 'bg-zinc-200 dark:bg-zinc-800'
                              }`}
                            >
                              <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm ${notifications[n.id as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}

              {activeSection === 'account' && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <section className="glass rounded-[2.5rem] p-8 border border-zinc-100 dark:border-white/5">
                    <h3 className="font-display font-bold text-xl text-zinc-900 dark:text-white mb-8">Login Activity & Sessions</h3>
                    
                    <div className="space-y-6">
                      <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 rounded-3xl">
                        <div className="flex items-center justify-between mb-6">
                            <label className="font-display font-bold text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-widest pl-1 block">Active Device Nodes</label>
                            <span className="px-3 py-1 bg-trust-green/10 text-trust-green text-[9px] font-mono font-black rounded-lg">{sessions.length} ACTIVE {sessions.length === 1 ? 'SESSION' : 'SESSIONS'}</span>
                        </div>
                        
                        <div className="space-y-4">
                          {sessions.map((session) => {
                            const currentId = typeof window !== 'undefined' ? localStorage.getItem('current_session_id') : null;
                            const isCurrent = session.sessionId === currentId;
                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(session.userAgent);
                            
                            return (
                              <div key={session.sessionId} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isCurrent ? 'bg-white dark:bg-zinc-800 border-trust-green/30' : 'bg-white/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-white/5'}`}>
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCurrent ? 'bg-trust-green text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                      {isMobile ? <Smartphone className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                                  </div>
                                  <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                          <p className="font-display font-bold text-xs text-zinc-900 dark:text-white">
                                            {isMobile ? 'Mobile Auth Node' : 'Web Desktop App'}
                                          </p>
                                          {isCurrent && <span className="w-1.5 h-1.5 bg-trust-green rounded-full animate-pulse" />}
                                      </div>
                                      <p className="font-mono text-[9px] text-zinc-400 uppercase tracking-tight truncate max-w-[200px]">
                                        {session.userAgent.split(')')[0].split('(')[1] || session.userAgent.split(' ')[0]} • Genesis: {new Date(session.createdAt).toLocaleDateString()}
                                      </p>
                                  </div>
                                  <div className="text-right">
                                      <p className={`font-display font-bold text-[9px] uppercase ${isCurrent ? 'text-trust-green' : 'text-zinc-400'}`}>
                                        {isCurrent ? 'Active Now' : `Last Seen ${new Date(session.lastActive).toLocaleDateString()}`}
                                      </p>
                                      {!isCurrent && (
                                          <button 
                                              onClick={async () => {
                                                const ok = await confirm({
                                                  title: 'Revoke Node Session',
                                                  message: 'This will instantly disconnect this device from the network. Re-authentication will be required.',
                                                  confirmText: 'Revoke Access',
                                                  cancelText: 'Abort'
                                                });
                                                if (ok) {
                                                  const email = localStorage.getItem('authenticated_user_email');
                                                  await fetch(`/api/auth/sessions?email=${email}&sessionId=${session.sessionId}`, { method: 'DELETE' });
                                                  notify(`Session revoked successfully.`, 'success');
                                                  fetchSessions();
                                                }
                                              }}
                                              className="font-mono text-[8px] font-black text-red-500 hover:underline uppercase mt-1"
                                          >
                                              Revoke
                                          </button>
                                      )}
                                  </div>
                              </div>
                            );
                          })}

                          {sessions.length === 0 && !isFetchingSessions && (
                            <div className="text-center py-8">
                              <p className="text-zinc-500 text-sm italic">No active sessions found. Please login again.</p>
                            </div>
                          )}
                        </div>
                        
                        <button 
                          onClick={async () => {
                            const ok = await confirm({
                                title: 'Global Session Purge',
                                message: 'This will invalidate all auth tokens across all nodes except your current device. You will need to re-authenticate on all other systems.',
                                confirmText: 'Execute Global Log Out',
                                cancelText: 'Abort'
                            });
                            if (ok) {
                                const email = localStorage.getItem('authenticated_user_email');
                                const currentId = localStorage.getItem('current_session_id');
                                await fetch(`/api/auth/sessions?email=${email}&all=true&currentSessionId=${currentId}`, { method: 'DELETE' });
                                notify('Global session purge executed. Peripheral nodes disconnected.', 'success');
                                fetchSessions();
                            }
                          }}
                          className="w-full mt-6 h-12 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all border border-zinc-100 dark:border-white/5"
                        >
                          Sign out from all other systems
                        </button>
                      </div>

                      <div className="h-px bg-zinc-100 dark:bg-white/5" />

                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center border border-red-100 dark:border-red-500/20">
                            <Trash2 className="w-5 h-5 text-red-400 dark:text-red-500" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm text-red-500">Terminal Deletion</p>
                            <p className="font-sans text-xs text-zinc-500 dark:text-zinc-400">Permanently remove all data from the node.</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleDeleteAccount}
                          className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all underline decoration-red-200 dark:decoration-red-900"
                        >
                          Purge Account
                        </button>
                      </div>
                    </div>
                  </section>
                  
                  <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-[2rem] flex gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-bold text-sm text-amber-900 dark:text-amber-500 mb-1">Administrative Alert</p>
                      <p className="font-sans text-xs text-amber-800/80 dark:text-amber-500/60 leading-relaxed">
                        Account deletion involves purging your cryptographic keys. Any files authenticated with these keys will no longer be verifiable through your legacy hash signatures.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}
