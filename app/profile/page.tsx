'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Fingerprint,
  HardDrive,
  Network
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const email = localStorage.getItem('authenticated_user_email');
      if (!email) return;

      try {
        const res = await fetch(`/api/auth/me?email=${email}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        localStorage.setItem('user_first_name', user.firstName);
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-4xl mx-auto py-12 lg:py-20">
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center">
              <User className="text-trust-green w-6 h-6" />
            </div>
            <h1 className="font-display text-4xl font-bold text-zinc-900">User Profile</h1>
          </motion.div>
          <p className="font-sans text-zinc-500">Manage your network identity and security configurations.</p>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
            <div className="lg:col-span-2 h-[500px] bg-zinc-50 border border-zinc-100 rounded-[2.5rem]" />
            <div className="h-[300px] bg-zinc-50 border border-zinc-100 rounded-[2rem]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-2">
            <motion.form 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleUpdate}
              className="glass rounded-[2.5rem] p-8 md:p-10 border border-zinc-100 shadow-xl"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-display font-bold text-xs text-zinc-400 uppercase tracking-widest pl-1">First Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                      <input 
                        type="text" 
                        value={user?.firstName || ''}
                        onChange={(e) => setUser({...user, firstName: e.target.value})}
                        className="w-full h-12 pl-11 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-display font-bold text-xs text-zinc-400 uppercase tracking-widest pl-1">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                      <input 
                        type="text" 
                        value={user?.lastName || ''}
                        onChange={(e) => setUser({...user, lastName: e.target.value})}
                        className="w-full h-12 pl-11 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-display font-bold text-xs text-zinc-400 uppercase tracking-widest pl-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input 
                      type="email" 
                      value={user?.email || ''}
                      disabled
                      className="w-full h-12 pl-11 pr-4 bg-zinc-100 border border-zinc-100 rounded-xl font-sans text-sm text-zinc-400 cursor-not-allowed"
                    />
                  </div>
                  <p className="font-mono text-[9px] text-zinc-400 pl-1">Immutable network identifier</p>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="font-display font-bold text-xs text-zinc-400 uppercase tracking-widest pl-1">Account Entity</label>
                  <div className="flex gap-4">
                    {['individual', 'business'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setUser({...user, entityType: type})}
                        className={`flex-1 h-12 rounded-xl font-display font-bold text-xs uppercase tracking-widest border transition-all ${
                          user?.entityType === type 
                            ? 'bg-zinc-950 text-white border-zinc-900' 
                            : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {message && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`flex items-center gap-3 p-4 rounded-xl ${
                      message.type === 'success' ? 'bg-trust-green/10 text-trust-green border border-trust-green/20' : 'bg-red-50 text-red-500 border border-red-100'
                    }`}
                  >
                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <p className="font-sans text-xs font-bold">{message.text}</p>
                  </motion.div>
                )}

                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-14 bg-zinc-950 text-white rounded-2xl font-display font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 disabled:opacity-50"
                >
                  {isSaving ? 'Updating...' : 'Save Profile Changes'}
                  <Save className="w-5 h-5 text-trust-green" />
                </button>
              </div>
            </motion.form>
          </div>

          {/* Right Column: Security Stats */}
          <div className="space-y-8">
            <motion.section 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-[2rem] p-8 border border-zinc-100 shadow-sm"
            >
              <h3 className="font-display font-bold text-lg text-zinc-900 mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-trust-green" />
                Security Status
              </h3>
              <div className="space-y-6">
                {[
                  { label: "2FA Status", status: "Active", icon: Fingerprint },
                  { label: "Encryption", status: "AES-256", icon: HardDrive },
                  { label: "Trust Score", status: "High", icon: ShieldCheck },
                  { label: "Node Sync", status: "Synchronized", icon: Network }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-zinc-300" />
                      <span className="font-sans text-xs text-zinc-500">{item.label}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-zinc-900 uppercase">{item.status}</span>
                  </div>
                ))}
              </div>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-[2rem] p-8 border border-zinc-100 bg-zinc-950 text-white overflow-hidden relative"
            >
              <div className="relative z-10">
                <h3 className="font-display font-bold text-lg mb-2">Technical Core</h3>
                <p className="font-sans text-xs text-zinc-400 mb-6 leading-relaxed">Your account is connected to the primary verification relay.</p>
                
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Public Key Hash</p>
                  <p className="font-mono text-[10px] text-trust-green truncate">TC_X84_92K_L0P_0091_X902_V1</p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-trust-green/10 blur-3xl rounded-full" />
            </motion.section>
          </div>
        </div>
      )}
    </div>
  </main>
);
}
