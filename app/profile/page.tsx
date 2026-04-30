'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Network,
  Briefcase,
  Phone,
  MapPin,
  FileText,
  Clock,
  Building2,
  ChevronRight
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { AnimatePresence } from 'motion/react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'personal' | 'professional' | 'identity'>('personal');

  useEffect(() => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) {
      router.push('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const body = await res.json();
          const data = SecurityService.processFromTransit(body);
          setUser(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        setIsAuthLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-trust-green/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-trust-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const payload = SecurityService.prepareForTransit(user);
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
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

  const isVerified = user?.verificationStatus === 'verified';
  const isPending = user?.verificationStatus === 'pending';

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6">
      <BackgroundAnimation />
      <Sidebar />
 
      <div className="relative z-10 w-full max-w-4xl mx-auto py-8 sm:py-12 lg:py-20">
        <header className="mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-950 rounded-xl sm:rounded-2xl flex items-center justify-center">
              <User className="text-trust-green w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 flex items-center gap-2">
              {user?.firstName || 'User Account'}
              {isVerified && <ShieldCheck className="w-6 h-6 text-trust-green fill-trust-green/10" />}
              {isPending && <Clock className="w-6 h-6 text-zinc-400" />}
              {user?.entityType && (
                <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                  {user.entityType}
                </span>
              )}
            </h1>
          </motion.div>
          <p className="font-sans text-sm text-zinc-500">Manage your network identity and security configurations.</p>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
            <div className="lg:col-span-1 h-[200px] bg-zinc-50 rounded-2xl" />
            <div className="lg:col-span-3 h-[500px] bg-zinc-50 border border-zinc-100 rounded-[2.5rem]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Nav */}
            <div className="lg:col-span-1 space-y-2">
              {[
                { id: 'personal', label: 'Personal', icon: User, desc: 'Basic info' },
                { id: 'professional', label: 'Professional', icon: Briefcase, desc: 'Work & Contact' },
                { id: 'identity', label: 'Identity', icon: ShieldCheck, desc: 'Verification' }
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`w-full p-4 rounded-2xl flex flex-col items-start gap-1 transition-all text-left ${
                    activeSection === section.id 
                      ? 'bg-zinc-950 text-white shadow-xl shadow-zinc-900/10' 
                      : 'text-zinc-500 hover:bg-zinc-50 border border-transparent hover:border-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <section.icon className={`w-4 h-4 ${activeSection === section.id ? 'text-trust-green' : 'text-zinc-400'}`} />
                    <span className="font-display font-bold text-[10px] uppercase tracking-widest">{section.label}</span>
                  </div>
                  <p className={`font-sans text-[9px] ${activeSection === section.id ? 'text-zinc-400' : 'text-zinc-400'}`}>{section.desc}</p>
                </button>
              ))}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <motion.form 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleUpdate}
                className="space-y-8"
              >
                <AnimatePresence mode="wait">
                  {activeSection === 'personal' && (
                    <motion.div
                      key="personal"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-6"
                    >
                      <section className="glass rounded-[2.5rem] p-8 border border-zinc-100 shadow-xl shadow-zinc-900/[0.02]">
                        <h3 className="font-display font-bold text-xl text-zinc-900 mb-8 flex items-center gap-2">
                          <User className="w-5 h-5 text-trust-green" />
                          Personal Profile
                        </h3>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">First Name</label>
                              <input 
                                type="text" 
                                value={user?.firstName || ''}
                                onChange={(e) => setUser({...user, firstName: e.target.value})}
                                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Last Name</label>
                              <input 
                                type="text" 
                                value={user?.lastName || ''}
                                onChange={(e) => setUser({...user, lastName: e.target.value})}
                                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Public ID / Email</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                              <input 
                                type="email" 
                                value={user?.email || ''}
                                disabled
                                className="w-full h-12 pl-11 pr-4 bg-zinc-100 border border-zinc-100 rounded-xl font-sans text-sm text-zinc-400 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Mission Statement</label>
                            <textarea 
                              rows={4}
                              placeholder="Tell us about your core mission..."
                              value={user?.bio || ''}
                              onChange={(e) => setUser({...user, bio: e.target.value})}
                              className="w-full px-4 py-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all resize-none"
                            />
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeSection === 'professional' && (
                    <motion.div
                      key="professional"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-6"
                    >
                      <section className="glass rounded-[2.5rem] p-8 border border-zinc-100 shadow-xl shadow-zinc-900/[0.02]">
                        <h3 className="font-display font-bold text-xl text-zinc-900 mb-8 flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-trust-green" />
                          Professional Status
                        </h3>

                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Professional Title</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Protocol Engineer"
                                value={user?.jobTitle || ''}
                                onChange={(e) => setUser({...user, jobTitle: e.target.value})}
                                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Phone Protocol</label>
                              <input 
                                type="tel" 
                                placeholder="+1 (555) 000-0000"
                                value={user?.phone || ''}
                                onChange={(e) => setUser({...user, phone: e.target.value})}
                                className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                              />
                            </div>
                          </div>

                          {user?.entityType !== 'Individual' && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="space-y-6 pt-2"
                            >
                              <div className="h-px bg-zinc-50" />
                              <div className="space-y-2">
                                <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Company / Organization Name</label>
                                <div className="relative">
                                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                  <input 
                                    type="text" 
                                    placeholder="e.g. TechCore Labs Inc."
                                    value={user?.companyName || ''}
                                    onChange={(e) => setUser({...user, companyName: e.target.value})}
                                    className="w-full h-12 pl-11 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Registration / Tax ID</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. TIN-90210-X"
                                    value={user?.companyRegistration || ''}
                                    onChange={(e) => setUser({...user, companyRegistration: e.target.value})}
                                    className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Corporate Website</label>
                                  <input 
                                    type="url" 
                                    placeholder="https://techcore.io"
                                    value={user?.companyWebsite || ''}
                                    onChange={(e) => setUser({...user, companyWebsite: e.target.value})}
                                    className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}

                          <div className="space-y-2 pt-2">
                            <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Node Location</label>
                            <div className="relative">
                              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                              <input 
                                type="text" 
                                placeholder="Global / City, Country"
                                value={user?.location || ''}
                                onChange={(e) => setUser({...user, location: e.target.value})}
                                className="w-full h-12 pl-11 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeSection === 'identity' && (
                    <motion.div
                      key="identity"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-6"
                    >
                      <section className="glass rounded-[2.5rem] p-8 border border-zinc-100 shadow-xl shadow-zinc-900/[0.02]">
                        <h3 className="font-display font-bold text-xl text-zinc-900 mb-8 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-trust-green" />
                          Network Identity Status
                        </h3>

                        <div className="space-y-8">
                          <div className="flex flex-col items-center text-center p-10 bg-zinc-50 border border-zinc-100 rounded-3xl">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 relative ${
                              isVerified ? 'bg-trust-green/10' : isPending ? 'bg-amber-50' : 'bg-red-50'
                            }`}>
                              {isVerified ? (
                                <CheckCircle2 className="w-10 h-10 text-trust-green" />
                              ) : isPending ? (
                                <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
                              ) : (
                                <AlertCircle className="w-10 h-10 text-red-400" />
                              )}
                              {isVerified && (
                                <div className="absolute inset-0 bg-trust-green/20 rounded-full animate-ping opacity-20" />
                              )}
                            </div>
                            
                            <h4 className="font-display text-2xl font-bold text-zinc-900 mb-2">
                              {isVerified ? 'Cryptographically Verified' : isPending ? 'Identity Under Review' : 'Identity Unverified'}
                            </h4>
                            <p className="font-sans text-sm text-zinc-500 max-w-xs leading-relaxed">
                              {isVerified 
                                ? 'Your identifiers have been notarized on the TechCore ledger. You have full access to L2 operations.' 
                                : isPending 
                                  ? 'Our technical compliance team is manually validating your provided identifiers. This typically resolves in 2-3 days.'
                                  : 'To unlock advanced notarization features, please complete the identity synchronization protocol.'}
                            </p>

                            {!isVerified && !isPending && (
                              <button 
                                type="button"
                                onClick={() => router.push('/verification')}
                                className="mt-8 px-8 h-12 bg-zinc-900 text-white rounded-xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg"
                              >
                                Begin Verification
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                              { label: 'KYC Phase', status: isVerified ? 'Complete' : isPending ? 'In Progress' : 'Pending', val: isVerified ? 100 : isPending ? 60 : 0 },
                              { label: 'AML Check', status: isVerified ? 'Passed' : isPending ? 'Pending' : 'Required', val: isVerified ? 100 : isPending ? 30 : 0 },
                              { label: 'Ledger Sync', status: isVerified ? 'Synced' : 'Waiting', val: isVerified ? 100 : 0 }
                            ].map((item, i) => (
                              <div key={i} className="p-4 bg-white border border-zinc-100 rounded-2xl">
                                <p className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest mb-2">{item.label}</p>
                                <div className="flex items-end justify-between">
                                  <span className="font-sans text-xs font-bold text-zinc-900">{item.status}</span>
                                  <span className="font-mono text-[9px] text-zinc-400">{item.val}%</span>
                                </div>
                                <div className="mt-2 h-1 bg-zinc-50 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.val}%` }}
                                    className={`h-full ${item.val === 100 ? 'bg-trust-green' : 'bg-amber-400'}`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>

                {message && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`flex items-center gap-3 p-4 rounded-2xl ${
                      message.type === 'success' ? 'bg-trust-green/10 text-trust-green border border-trust-green/20' : 'bg-red-50 text-red-500 border border-red-100'
                    }`}
                  >
                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <p className="font-sans text-xs font-bold">{message.text}</p>
                  </motion.div>
                )}

                <div className="flex justify-end pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="h-14 px-12 bg-zinc-950 text-white rounded-2xl font-display font-bold flex items-center justify-center gap-3 hover:bg-zinc-900 transition-all shadow-2xl shadow-zinc-950/20 disabled:opacity-50"
                  >
                    {isSaving ? 'Syncing...' : 'Sync Profile Changes'}
                    <Save className="w-5 h-5 text-trust-green" />
                  </button>
                </div>
              </motion.form>

              {/* Stats & Metadata Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 pb-12">
                <section className="glass rounded-3xl p-6 border border-zinc-100">
                   <h4 className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest mb-4">Security Baseline</h4>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isVerified ? 'bg-trust-green/10 text-trust-green' : 'bg-amber-100 text-amber-600'}`}>
                            <ShieldCheck className="w-4 h-4" />
                         </div>
                         <p className="font-display font-bold text-xs text-zinc-900">{isVerified ? 'Verified Account' : isPending ? 'Review Pending' : 'Unverified'}</p>
                      </div>
                      <span className="font-mono text-[9px] font-bold text-zinc-400">SCORE: {isVerified ? '98' : '40'}</span>
                   </div>
                </section>
                <section className="glass rounded-3xl p-6 border border-zinc-100">
                   <h4 className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest mb-4">Protocol Metadata</h4>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-400">
                            <Fingerprint className="w-4 h-4" />
                         </div>
                         <p className="font-display font-bold text-xs text-zinc-900">TC-HASH-NODE</p>
                      </div>
                      <span className="font-mono text-[9px] font-bold text-trust-green">ALPHA_REV_2</span>
                   </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
