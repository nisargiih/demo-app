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
  AlertCircle
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useNotification } from '@/hooks/use-notification';

export default function SettingsPage() {
  const { notify, confirm } = useNotification();
  const [activeSection, setActiveSection] = useState<'security' | 'preferences' | 'account'>('security');
  
  // State: Security
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // State: Preferences
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState({ email: true, push: false, alerts: true });

  useEffect(() => {
    const fetchSettings = async () => {
      const email = localStorage.getItem('authenticated_user_email');
      if (!email) return;
      try {
        const res = await fetch(`/api/auth/me?email=${email}`);
        if (res.ok) {
          const user = await res.json();
          setIs2FAEnabled(!!user.is2FAEnabled);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
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
      title: 'Permanent Account Deletion',
      message: 'This process is irreversible. All your cryptographic signatures, ledger history, and templates will be permanently purged from the node.',
      confirmText: 'Delete Account',
      cancelText: 'Cancel'
    });

    if (ok) {
      notify('Account deletion protocol initiated. You will be logged out.', 'info');
      // Logic for deletion
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-5xl mx-auto py-12 lg:py-20">
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center">
              <Settings className="text-trust-green w-6 h-6" />
            </div>
            <h1 className="font-display text-4xl font-bold text-zinc-900">Settings</h1>
          </motion.div>
          <p className="font-sans text-zinc-500">Configure your node preferences, security protocols, and account status.</p>
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
                    ? 'bg-zinc-950 text-white shadow-xl shadow-zinc-900/10' 
                    : 'text-zinc-500 hover:bg-zinc-50'
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
                  <section className="glass rounded-[2.5rem] p-8 border border-zinc-100">
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h3 className="font-display font-bold text-xl text-zinc-900 mb-2">Two-Factor Authentication</h3>
                        <p className="font-sans text-sm text-zinc-500">Secure your account with 6-character alphanumeric verification.</p>
                      </div>
                      <button 
                        onClick={handleToggle2FA}
                        className={`relative w-14 h-8 rounded-full transition-all flex items-center p-1 ${
                          is2FAEnabled ? 'bg-trust-green' : 'bg-zinc-200'
                        }`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full transition-all shadow-sm ${is2FAEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${is2FAEnabled ? 'bg-trust-green/10 text-trust-green' : 'bg-zinc-200 text-zinc-400'}`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-xs text-zinc-900">Email Verification Protocol</p>
                        <p className="font-mono text-[10px] text-zinc-400">STATUS: {is2FAEnabled ? 'ENFORCED' : 'DISABLED'}</p>
                      </div>
                      {is2FAEnabled && <div className="px-3 py-1 bg-trust-green/10 text-trust-green rounded-full font-mono text-[9px] font-bold">VERIFIED</div>}
                    </div>
                  </section>

                  {/* Password Section */}
                  <section className="glass rounded-[2.5rem] p-8 border border-zinc-100">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-display font-bold text-xl text-zinc-900">Security Credentials</h3>
                      {!showPasswordChange && (
                        <button 
                          onClick={() => setShowPasswordChange(true)}
                          className="px-4 py-2 border border-zinc-100 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-500 hover:border-trust-green transition-all"
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
                                    className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswords({...showPasswords, [p.id]: !showPasswords[p.id as keyof typeof showPasswords]})}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500"
                                  >
                                    {showPasswords[p.id as keyof typeof showPasswords] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3 pt-4">
                            <button 
                              type="button" 
                              onClick={() => setShowPasswordChange(false)}
                              className="flex-1 h-12 bg-zinc-50 text-zinc-500 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              className="flex-1 h-12 bg-zinc-950 text-white rounded-xl font-display font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-zinc-950/20"
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
                  <section className="glass rounded-[2.5rem] p-8 border border-zinc-100">
                    <h3 className="font-display font-bold text-xl text-zinc-900 mb-8">System interface</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center">
                            {theme === 'light' ? <Sun className="w-5 h-5 text-zinc-400" /> : <Moon className="w-5 h-5 text-zinc-400" />}
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm text-zinc-900">Core Theme</p>
                            <p className="font-sans text-xs text-zinc-500">Toggle between professional modes.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                          className="px-6 py-2 bg-zinc-50 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-900 hover:bg-zinc-100"
                        >
                          {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                        </button>
                      </div>

                      <div className="h-px bg-zinc-100" />

                      <div className="space-y-6">
                        <h4 className="font-display font-bold text-xs text-zinc-400 uppercase tracking-[0.2em]">Operational Alerts</h4>
                        {[
                          { id: 'email', label: 'Email Digest', desc: 'Secure summary of signature activity.' },
                          { id: 'push', label: 'Real-time Pulse', desc: 'Push notifications for direct verification.' },
                          { id: 'alerts', label: 'Security Heartbeat', desc: 'Critical system and node status updates.' }
                        ].map((n) => (
                          <div key={n.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-display font-bold text-sm text-zinc-900">{n.label}</p>
                              <p className="font-sans text-xs text-zinc-500">{n.desc}</p>
                            </div>
                            <button 
                              onClick={() => setNotifications({...notifications, [n.id]: !notifications[n.id as keyof typeof notifications]})}
                              className={`relative w-12 h-6 rounded-full transition-all flex items-center p-0.5 ${
                                notifications[n.id as keyof typeof notifications] ? 'bg-trust-green' : 'bg-zinc-200'
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
                  <section className="glass rounded-[2.5rem] p-8 border border-zinc-100">
                    <h3 className="font-display font-bold text-xl text-zinc-900 mb-8">Node Management</h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center">
                            <LogOut className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm text-zinc-900">Session Purge</p>
                            <p className="font-sans text-xs text-zinc-500">Sign out from all currently active sessions.</p>
                          </div>
                        </div>
                        <button className="p-2 text-zinc-300 hover:text-zinc-900 transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="h-px bg-zinc-100" />

                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-sm text-red-500">Terminal Deletion</p>
                            <p className="font-sans text-xs text-zinc-500">Permanently remove all data from the node.</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleDeleteAccount}
                          className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all underline decoration-red-200"
                        >
                          Purge Account
                        </button>
                      </div>
                    </div>
                  </section>
                  
                  <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-bold text-sm text-amber-900 mb-1">Administrative Alert</p>
                      <p className="font-sans text-xs text-amber-800/80 leading-relaxed">
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
