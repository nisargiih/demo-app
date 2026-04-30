'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  User, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Fingerprint,
  HardDrive,
  FileText,
  Clock,
  Briefcase,
  Network
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useNotification } from '@/hooks/use-notification';

export default function VerificationPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updatedUser = { ...user, verificationStatus: 'pending' };
      const payload = SecurityService.prepareForTransit(updatedUser);
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setUser(updatedUser);
        notify('Verification details submitted for review.', 'success');
        setStep(3); // Completion step
      } else {
        notify('Verification protocol failed. Please check inputs.', 'error');
      }
    } catch (err) {
      notify('Network error during verification.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isVerified = user?.verificationStatus === 'verified';
  const isPending = user?.verificationStatus === 'pending';
  const isComplete = isVerified || isPending || (!!(user?.pan && user?.aadhaar));

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6">
      <BackgroundAnimation />
      <Sidebar />
 
      <div className="relative z-10 w-full max-w-4xl mx-auto py-8 sm:py-12 lg:py-20">
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-trust-green/10 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="text-trust-green w-6 h-6" />
            </div>
            <h1 className="font-display text-4xl font-bold text-zinc-900">Identity Verification</h1>
          </motion.div>
          <p className="font-sans text-sm text-zinc-500">Secure your account by linking your official identifiers to the cryptographic core.</p>
        </header>

        {isLoading ? (
          <div className="h-[400px] bg-zinc-50 rounded-[2.5rem] border border-zinc-100 animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              {step === 1 && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="glass rounded-[2.5rem] p-8 border border-zinc-100">
                    <h2 className="font-display text-xl font-bold text-zinc-900 mb-4">Verification Status</h2>
                    {isVerified ? (
                      <div className="flex items-center gap-4 p-6 bg-trust-green/5 border border-trust-green/20 rounded-2xl">
                        <CheckCircle2 className="w-8 h-8 text-trust-green" />
                        <div>
                          <p className="font-display font-bold text-zinc-900">Full Verification Active</p>
                          <p className="font-sans text-xs text-zinc-500 tracking-tight">Your identity is cryptographically linked to the network.</p>
                        </div>
                      </div>
                    ) : isPending ? (
                      <div className="flex items-center gap-4 p-6 bg-zinc-50 border border-zinc-200 rounded-2xl">
                        <Clock className="w-8 h-8 text-zinc-400" />
                        <div>
                          <p className="font-display font-bold text-zinc-900">Under Review</p>
                          <p className="font-sans text-xs text-zinc-500 tracking-tight">System is validating your identifiers. This typically takes 2-3 days.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                        <div>
                          <p className="font-display font-bold text-zinc-900">Pending Identity Nodes</p>
                          <p className="font-sans text-xs text-zinc-500 tracking-tight">Add your PAN and Aadhaar details to reach full integrity.</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 space-y-6">
                      <div className="space-y-3">
                        <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Configuration Node Type</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { id: 'Individual', label: 'Personal', icon: User },
                            { id: 'Company', label: 'Corporate', icon: Briefcase },
                            { id: 'Enterprise', label: 'Enterprise', icon: Network }
                          ].map((type) => {
                            const isVerified = !!(user?.pan && user?.aadhaar);
                            const isBusiness = type.id === 'Company' || type.id === 'Enterprise';
                            const isDisabled = isVerified && user?.entityType === 'Individual' && isBusiness;
                            
                            return (
                              <button
                                key={type.id}
                                disabled={isDisabled}
                                onClick={() => setUser({...user, entityType: type.id})}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                  user?.entityType === type.id 
                                    ? 'bg-zinc-950 border-zinc-950 text-white shadow-xl' 
                                    : isDisabled
                                      ? 'bg-zinc-50 border-zinc-100 text-zinc-200 cursor-not-allowed opacity-50'
                                      : 'bg-white border-zinc-100 text-zinc-900 hover:border-zinc-200'
                                }`}
                              >
                                <type.icon className={`w-4 h-4 mb-2 ${user?.entityType === type.id ? 'text-trust-green' : 'text-zinc-300'}`} />
                                <p className="font-display font-bold text-[10px] uppercase tracking-wider">{type.label}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4 border-t border-zinc-50 pt-6">
                        <div className="flex items-center justify-between py-1">
                          <span className="font-sans text-sm text-zinc-500">PAN Verification</span>
                          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${user?.pan ? 'text-trust-green' : 'text-zinc-300'}`}>
                            {user?.pan ? 'Synchronized' : 'Missing'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="font-sans text-sm text-zinc-500">Aadhaar Link</span>
                          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${user?.aadhaar ? 'text-trust-green' : 'text-zinc-300'}`}>
                            {user?.aadhaar ? 'Synchronized' : 'Missing'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setStep(2)}
                      className="w-full mt-10 h-14 bg-zinc-950 text-white rounded-2xl font-display font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all"
                    >
                      {isComplete ? 'Update Identity Data' : 'Begin Verification'}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.form 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onSubmit={handleVerify}
                  className="space-y-6"
                >
                  <div className="glass rounded-[2.5rem] p-10 border border-zinc-100 shadow-xl">
                    <h2 className="font-display text-2xl font-bold text-zinc-800 mb-8">Identity Protocol</h2>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="font-display font-bold text-xs text-zinc-400 uppercase tracking-widest pl-1">PAN Card Number</label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                          <input 
                            type="text" 
                            placeholder="ABCDE1234F"
                            value={user?.pan || ''}
                            onChange={(e) => setUser({...user, pan: e.target.value.toUpperCase()})}
                            className="w-full h-12 pl-11 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all uppercase"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="font-display font-bold text-xs text-zinc-400 uppercase tracking-widest pl-1">Aadhaar Number</label>
                        <div className="relative">
                          <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                          <input 
                            type="text" 
                            placeholder="1234 5678 9012"
                            value={user?.aadhaar || ''}
                            onChange={(e) => setUser({...user, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12)})}
                            className="w-full h-12 pl-11 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-[10px] font-sans text-zinc-500 leading-relaxed italic">
                        By submitting this data, you agree to store your identification numbers in the encrypted TechCore vault. We do not store physical images of your documents, only the alphanumeric identifiers for verification purposes.
                      </div>

                      <div className="flex gap-4">
                        <button 
                          type="button"
                          onClick={() => setStep(1)}
                          className="flex-1 h-14 border border-zinc-200 text-zinc-400 rounded-2xl font-display font-bold hover:bg-zinc-50 transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={isSaving}
                          className="flex-[2] h-14 bg-trust-green text-white rounded-2xl font-display font-bold flex items-center justify-center gap-3 hover:bg-trust-green/90 transition-all disabled:opacity-50"
                        >
                          {isSaving ? 'Synchronizing...' : 'Submit to Ledger'}
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.form>
              )}

              {step === 3 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass rounded-[3rem] p-16 text-center border border-zinc-100 shadow-2xl shadow-trust-green/5"
                >
                  <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                    <div className="absolute inset-0 bg-zinc-200 rounded-full animate-ping opacity-20" />
                    <Clock className="w-12 h-12 text-zinc-400" />
                  </div>
                  <h2 className="font-display text-3xl font-bold text-zinc-950 mb-4">Under Review</h2>
                  <p className="font-sans text-zinc-500 mb-10 max-w-sm mx-auto leading-relaxed">
                    Your verification data has been submitted. It will take <span className="font-bold text-zinc-900">2-3 days</span> for our technical team to verify your identity details.
                  </p>
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="h-14 px-10 bg-zinc-950 text-white rounded-2xl font-display font-bold hover:bg-zinc-800 transition-all"
                  >
                    Return to Terminal
                  </button>
                </motion.div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-8">
              <section className="p-8 bg-zinc-950 rounded-[2rem] text-white">
                <h3 className="font-display font-bold text-lg mb-4">Integrity Disclaimer</h3>
                <p className="font-sans text-xs text-zinc-400 leading-relaxed">
                  Verification data is used solely for document notarization and network trust scoring. TechCore employs zero-knowledge proof principles where possible to protect your sensitive identifiers.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
