'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  User, 
  Building, 
  FileText, 
  Globe, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Plus,
  ArrowRight,
  Fingerprint,
  HardDrive
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useNotification } from '@/hooks/use-notification';

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  entityType?: 'individual' | 'business';
  isVerified?: boolean;
}

export default function VerificationPage() {
  const { notify, confirm } = useNotification();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'verify'>('status');

  // Verification Track State
  const [verificationType, setVerificationType] = useState<'aadhaar' | 'pan' | 'gst' | 'domain' | 'kyc' | null>(null);

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

  const handleUpgradeToBusiness = async () => {
    const ok = await confirm({
      title: 'Upgrade to Business Protocol',
      message: 'This will upgrade your entity type to Business. This opens up advanced verification requirements like GST and Domain authentication.',
      confirmText: 'Upgrade Protocol',
      cancelText: 'Stay Individual'
    });

    if (ok && user) {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, entityType: 'business' }),
        });

        if (res.ok) {
          setUser({ ...user, entityType: 'business' });
          notify('Entity upgraded to Business level.', 'success');
        }
      } catch (err) {
        notify('Upgrade protocol failed.', 'error');
      }
    }
  };

  const handleUpdateEntityType = async (type: 'individual' | 'business') => {
    if (!user || user.entityType === type) return;
    
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, entityType: type }),
      });

      if (res.ok) {
        setUser({ ...user, entityType: type });
        notify(`Operational mode switched to ${type.toUpperCase()}.`, 'info');
      }
    } catch (err) {
      notify('Failed to switch protocol mode.', 'error');
    }
  };

  const submitVerification = async (type: string) => {
    notify(`Verification request for ${type.toUpperCase()} submitted for manual review.`, 'info');
    setVerificationType(null);
  };

  if (isLoading) return null;

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-5xl mx-auto py-12 lg:py-20">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TierBadge entityType={user?.entityType} isVerified={user?.isVerified} />
            </div>
            <h1 className="font-display text-4xl font-bold text-zinc-900 mb-2">Verification Center</h1>
            <p className="font-sans text-zinc-500">Secure your node presence and unlock higher ledger permissions.</p>
          </div>

          <div className="flex bg-zinc-50 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('status')}
              className={`px-6 py-2 rounded-lg font-display font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'status' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Node Status
            </button>
            <button 
              onClick={() => setActiveTab('verify')}
              className={`px-6 py-2 rounded-lg font-display font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'verify' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Certifications
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'status' ? (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Entity Overview */}
              <div className="glass rounded-[2.5rem] p-8 border border-zinc-100 flex flex-col justify-between">
                <div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${user?.entityType === 'business' ? 'bg-zinc-950 text-trust-green' : 'bg-zinc-100 text-zinc-400'}`}>
                    {user?.entityType === 'business' ? <Building className="w-7 h-7" /> : <User className="w-7 h-7" />}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-zinc-900 mb-2 capitalize">{user?.entityType} Protocol</h3>
                  <p className="font-sans text-sm text-zinc-500 mb-8">
                    Your account is currently operating under the {user?.entityType} node configuration.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Rule 1: Not verified -> can switch freely */}
                  {!user?.isVerified && (
                    <div className="flex gap-2 p-1 bg-zinc-50 rounded-xl">
                      <button 
                        onClick={() => handleUpdateEntityType('individual')}
                        className={`flex-1 py-3 rounded-lg font-display font-bold text-[10px] uppercase tracking-widest transition-all ${user?.entityType === 'individual' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
                      >
                        Individual
                      </button>
                      <button 
                        onClick={() => handleUpdateEntityType('business')}
                        className={`flex-1 py-3 rounded-lg font-display font-bold text-[10px] uppercase tracking-widest transition-all ${user?.entityType === 'business' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
                      >
                        Business
                      </button>
                    </div>
                  )}

                  {/* Rule 2: Verified as individual -> can upgrade to business */}
                  {user?.isVerified && user?.entityType === 'individual' && (
                    <button 
                      onClick={handleUpgradeToBusiness}
                      className="w-full flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 hover:border-trust-green group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Plus className="w-4 h-4 text-zinc-300 group-hover:text-trust-green" />
                        <span className="font-display font-bold text-xs uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900">Upgrade to Business</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-trust-green group-hover:translate-x-1 transition-all" />
                    </button>
                  )}

                  {/* Rule 3: Verified as business -> no downgrade (just show status) */}
                  {user?.isVerified && user?.entityType === 'business' && (
                    <div className="flex items-center gap-3 p-4 bg-trust-green/5 rounded-2xl border border-trust-green/10">
                      <ShieldCheck className="w-4 h-4 text-trust-green" />
                      <span className="font-display font-bold text-[10px] uppercase tracking-widest text-trust-green">Entity Locked: Business Class</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust Score / Verification Status */}
              <div className="glass rounded-[2.5rem] p-8 border border-zinc-100">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-14 h-14 bg-trust-green/10 text-trust-green rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  {user?.isVerified ? (
                    <div className="px-4 py-1.5 bg-trust-green/10 text-trust-green border border-trust-green/20 rounded-full font-mono text-[9px] font-black uppercase tracking-wider">Verified Resident</div>
                  ) : (
                    <div className="px-4 py-1.5 bg-zinc-100 text-zinc-400 rounded-full font-mono text-[9px] font-black uppercase tracking-wider">Pending Trust</div>
                  )}
                </div>
                <h3 className="font-display text-2xl font-bold text-zinc-900 mb-4">Node Autonomy</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                    <span className="text-zinc-500 text-xs font-medium">Daily Limit</span>
                    <span className="font-mono font-bold text-xs text-zinc-900">{user?.entityType === 'business' ? '∞' : '100'} Sigs</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                    <span className="text-zinc-500 text-xs font-medium">Network Access</span>
                    <span className="font-mono font-bold text-xs text-zinc-900">GHOST-NET</span>
                  </div>
                </div>
              </div>

              {/* Requirement Feed */}
              <div className="md:col-span-2 glass rounded-[2.5rem] p-10 border border-zinc-100">
                <h3 className="font-display font-bold text-xl text-zinc-900 mb-8">Required Documentation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {user?.entityType === 'individual' ? (
                    <>
                      <VerificationCard 
                        title="Aadhaar Signature"
                        desc="Unique 12-digit identity verification."
                        onClick={() => setVerificationType('aadhaar')}
                      />
                      <VerificationCard 
                        title="PAN Ledger"
                        desc="Permanent Account Number for tax audit."
                        onClick={() => setVerificationType('pan')}
                      />
                    </>
                  ) : (
                    <>
                      <VerificationCard 
                        title="Corporate PAN"
                        desc="Business entity financial ID."
                        onClick={() => setVerificationType('pan')}
                        icon={FileText}
                      />
                      <VerificationCard 
                        title="GST Protocol"
                        desc="Goods and Services Tax registration."
                        onClick={() => setVerificationType('gst')}
                        icon={HardDrive}
                      />
                      <VerificationCard 
                        title="Domain Auth"
                        desc="Proof of digital property ownership."
                        onClick={() => setVerificationType('domain')}
                        icon={Globe}
                      />
                      <VerificationCard 
                        title="Manual KYC"
                        desc="High-level identity resolution."
                        onClick={() => setVerificationType('kyc')}
                        icon={Fingerprint}
                      />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20 bg-zinc-50 border border-zinc-100 border-dashed rounded-[3rem]"
            >
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl shadow-zinc-200/50 mb-6">
                <FileText className="w-8 h-8 text-zinc-200" />
              </div>
              <h2 className="font-display text-2xl font-bold text-zinc-900 mb-2">Seal of Trust</h2>
              <p className="font-sans text-zinc-400 text-center max-w-sm">
                No active certifications found. Complete documentation requirements to earn the verified node badge.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Verification Modal Placeholder */}
      <AnimatePresence>
        {verificationType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
            >
               <button 
                 onClick={() => setVerificationType(null)}
                 className="absolute top-8 right-8 text-zinc-300 hover:text-zinc-900"
               >
                 <CheckCircle2 className="w-6 h-6 rotate-45" />
               </button>
               
               <div className="mb-8">
                 <h3 className="font-display text-2xl font-bold text-zinc-900 mb-2 uppercase tracking-tight">Verify {verificationType}</h3>
                 <p className="font-sans text-sm text-zinc-500">Provide the following cryptographic proofs to continue.</p>
               </div>

               <div className="space-y-6">
                 <div className="space-y-2">
                   <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Document Number</label>
                   <input 
                     type="text" 
                     placeholder={`Enter ${verificationType.toUpperCase()} reference`}
                     className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm"
                   />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Proof Upload (PDF/IMG)</label>
                   <div className="border-2 border-dashed border-zinc-100 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-trust-green/40 hover:bg-zinc-50/50 transition-all">
                      <Upload className="w-6 h-6 text-zinc-300 mb-3" />
                      <p className="font-sans text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Select Node Asset</p>
                   </div>
                 </div>

                 <button 
                   onClick={() => submitVerification(verificationType)}
                   className="w-full h-14 bg-zinc-950 text-white rounded-2xl font-display font-bold text-xs uppercase tracking-widest shadow-xl shadow-zinc-950/20 hover:bg-zinc-800 transition-all"
                 >
                   Confirm Submission
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function TierBadge({ entityType, isVerified }: { entityType?: string, isVerified?: boolean }) {
  if (!entityType) return (
    <div className="px-3 py-1 bg-zinc-100 text-zinc-400 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest border border-zinc-200 flex items-center gap-2">
      <AlertCircle className="w-3 h-3" />
      Uninitialized Node
    </div>
  );

  const colors = isVerified 
    ? 'bg-trust-green/10 text-trust-green border-trust-green/20' 
    : 'bg-zinc-50 text-zinc-400 border-zinc-100';

  const label = `${entityType} ${isVerified ? 'verified' : 'unverified'}`;

  return (
    <div className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 transition-all ${colors}`}>
      {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3 text-zinc-300" />}
      {label}
    </div>
  );
}

function VerificationCard({ title, desc, onClick, icon: Icon = FileText }: any) {
  return (
    <button 
      onClick={onClick}
      className="group p-6 bg-white border border-zinc-100 rounded-3xl text-left hover:border-trust-green transition-all hover:shadow-xl hover:shadow-zinc-200/30"
    >
      <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-trust-green/10 transition-colors">
        <Icon className="w-5 h-5 text-zinc-300 group-hover:text-trust-green transition-colors" />
      </div>
      <h4 className="font-display font-bold text-zinc-900 text-sm mb-1">{title}</h4>
      <p className="font-sans text-[10px] text-zinc-500 leading-relaxed">{desc}</p>
    </button>
  );
}
