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
  HardDrive,
  Zap,
  Lock,
  Star
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
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Where you are */}
                <div className="glass rounded-[2.5rem] p-8 border border-zinc-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${user?.entityType === 'business' ? 'bg-zinc-950 text-trust-green' : 'bg-zinc-100 text-zinc-400'}`}>
                        {user?.entityType === 'business' ? <Building className="w-7 h-7" /> : <User className="w-7 h-7" />}
                      </div>
                      <div className="px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-full font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Current Sector</div>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-zinc-900 mb-2 capitalize">{user?.entityType} Protocol</h3>
                    <p className="font-sans text-sm text-zinc-500 mb-8">
                      Your node is currently operating with <span className="font-bold text-zinc-900">{user?.isVerified ? 'Verified' : 'Limited'}</span> permissions.
                    </p>
                  </div>

                  <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                        <span className="text-zinc-400">Node ID:</span>
                        <span className="font-mono text-zinc-900">NODE-{user?.email.split('@')[0].toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                        <span className="text-zinc-400">Daily Sig Cap:</span>
                        <span className="font-mono text-zinc-900">{user?.entityType === 'business' ? 'UNLIMITED' : '100 UNITS'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                        <span className="text-zinc-400">Network Layer:</span>
                        <span className="font-mono text-zinc-900">{user?.isVerified ? 'TRUSTED-GATE' : 'PUBLIC-MESH'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Where you can go / Actions */}
                <div className="glass rounded-[2.5rem] p-8 border border-zinc-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 bg-trust-green/10 text-trust-green rounded-2xl flex items-center justify-center">
                        <Zap className="w-7 h-7" />
                      </div>
                      <div className="px-3 py-1 bg-trust-green/5 border border-trust-green/10 rounded-full font-mono text-[8px] font-bold text-trust-green uppercase tracking-widest">Available Upgrade</div>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-zinc-900 mb-2">Protocol Evolution</h3>
                    <p className="font-sans text-sm text-zinc-500 mb-8">
                      Advance your node to unlock premium cryptographic features and higher network priority.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Rule 1: Not verified -> can switch freely */}
                    {!user?.isVerified ? (
                      <div className="space-y-4">
                        <p className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-bold text-center">Switch Operational Mode</p>
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
                        <button 
                          onClick={() => setActiveTab('verify')}
                          className="w-full flex items-center justify-center gap-2 h-14 bg-zinc-950 text-white rounded-2xl font-display font-bold text-xs uppercase tracking-widest"
                        >
                          Complete Verification
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : user?.entityType === 'individual' ? (
                      <button 
                        onClick={handleUpgradeToBusiness}
                        className="w-full flex items-center justify-between p-6 bg-zinc-950 text-white rounded-[2rem] group transition-all shadow-xl shadow-zinc-900/20"
                      >
                        <div className="text-left">
                          <p className="font-mono text-[8px] text-trust-green font-black uppercase tracking-widest mb-1">Upgrade Available</p>
                          <h4 className="font-display font-bold text-lg">Switch to Business</h4>
                          <p className="font-sans text-[10px] text-zinc-400">Unlock Enterprise-grade ledger tools</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-trust-green group-hover:translate-x-1 transition-all" />
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 bg-trust-green/5 border border-trust-green/10 rounded-[2rem] text-center">
                        <Star className="w-8 h-8 text-trust-green mb-4 animate-pulse" />
                        <h4 className="font-display font-bold text-zinc-900">Maximum Protocol Level</h4>
                        <p className="font-sans text-[10px] text-zinc-500">Your node is fully optimized and verified.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trust Roadmap */}
              <TrustRoadmap currentTier={user?.entityType} isVerified={user?.isVerified} />

              {/* Requirement Feed */}
              <div className="glass rounded-[2.5rem] p-10 border border-zinc-100">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-display font-bold text-xl text-zinc-900">Required Documentation</h3>
                  <div className="px-4 py-1.5 bg-zinc-50 border border-zinc-100 rounded-full font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                    {user?.entityType?.toUpperCase()} TRACK
                  </div>
                </div>
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
    ? 'bg-trust-green text-white border-trust-green shadow-lg shadow-trust-green/20' 
    : 'bg-zinc-950 text-white border-zinc-800 shadow-lg shadow-zinc-950/20';

  const label = `${isVerified ? 'VERIFIED' : 'UNVERIFIED'} ${entityType.toUpperCase()}`;

  return (
    <div className={`px-4 py-1.5 rounded-full font-mono text-[10px] font-black uppercase tracking-[0.2em] border flex items-center gap-2.5 transition-all ${colors}`}>
      <div className="flex items-center gap-1.5 border-r border-white/20 pr-2.5 mr-0.5">
        <span className="text-[8px] opacity-70">STATUS:</span>
      </div>
      {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3 text-white/50" />}
      {label}
    </div>
  );
}

function TrustRoadmap({ currentTier, isVerified }: { currentTier?: string, isVerified?: boolean }) {
  const tiers = [
    {
      id: 'ghost',
      name: 'Ghost Node',
      icon: Lock,
      status: (currentTier === 'individual' && !isVerified) ? 'current' : (isVerified || currentTier === 'business') ? 'completed' : 'upcoming',
      label: 'Initial Access',
      perks: ['Base transactions', 'Limited storage', 'Standard support']
    },
    {
      id: 'citizen',
      name: 'Citizen Node',
      icon: User,
      status: (currentTier === 'individual' && isVerified) ? 'current' : (currentTier === 'business') ? 'completed' : (currentTier === 'individual' && !isVerified) ? 'upcoming' : 'locked',
      label: 'Verified Citizen',
      perks: ['Higher sig limits', 'Priority validation', 'Verified badge']
    },
    {
      id: 'enterprise',
      name: 'Enterprise Hub',
      icon: Building,
      status: (currentTier === 'business' && !isVerified) ? 'current' : (currentTier === 'business' && isVerified) ? 'completed' : (currentTier === 'individual' && isVerified) ? 'upcoming' : 'locked',
      label: 'Provisional Corp',
      perks: ['Unlimited sigs', 'Team sub-nodes', 'Enterprise API']
    },
    {
      id: 'sovereign',
      name: 'Sovereign Node',
      icon: Star,
      status: (currentTier === 'business' && isVerified) ? 'current' : 'upcoming',
      label: 'Full Autonomy',
      perks: ['Zero-trust priority', 'Network governance', 'Maximum security']
    }
  ];

  return (
    <div className="glass rounded-[2.5rem] p-10 border border-zinc-100 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <Zap className="w-64 h-64 rotate-12" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-trust-green/10 text-trust-green rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-zinc-900 tracking-tight">Trust Evolution Roadmap</h3>
            <p className="font-sans text-xs text-zinc-500">Track your node&apos;s journey through the trust layers.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-50 rounded-full border border-zinc-100">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-trust-green shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="font-mono text-[9px] font-bold text-zinc-600 uppercase">Current</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-4">
            <div className="w-2 h-2 rounded-full bg-zinc-200" />
            <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Locked</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
        {/* Connection Line */}
        <div className="hidden md:block absolute top-[2.25rem] left-[12.5%] right-[12.5%] h-px bg-zinc-100" />

        {tiers.map((tier, idx) => (
          <div key={idx} className="relative group">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 z-10 relative transition-all duration-500 
              ${tier.status === 'current' ? 'bg-zinc-950 text-trust-green scale-110 shadow-xl shadow-zinc-900/20' : 
                tier.status === 'completed' ? 'bg-trust-green text-white' : 'bg-zinc-50 text-zinc-300'}`}>
              
              {tier.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <tier.icon className="w-5 h-5" />}
              
              {tier.status === 'current' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-trust-green border-2 border-white rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className={`font-display font-bold text-sm ${['current', 'completed'].includes(tier.status) ? 'text-zinc-900' : 'text-zinc-400'}`}>
                  {tier.name}
                </h4>
              </div>
              <p className={`font-mono text-[9px] uppercase tracking-widest font-black ${tier.status === 'current' ? 'text-trust-green' : tier.status === 'completed' ? 'text-zinc-400' : 'text-zinc-300'}`}>
                {tier.status === 'current' ? 'OPERATIONAL' : tier.status.toUpperCase()}
              </p>
              
              <ul className="pt-4 space-y-2">
                {tier.perks.map((perk, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${['current', 'completed'].includes(tier.status) ? 'bg-trust-green/40' : 'bg-zinc-100'}`} />
                    <span className={`font-sans text-[10px] leading-tight ${tier.status === 'current' ? 'text-zinc-600 font-medium' : tier.status === 'completed' ? 'text-zinc-400' : 'text-zinc-300'}`}>
                      {perk}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Transition Arrow for MD screens */}
            {idx < tiers.length - 1 && (
              <div className="hidden md:flex absolute top-[1.5rem] -right-4 z-20 w-8 h-6 bg-white items-center justify-center">
                <ChevronRight className={`w-4 h-4 ${tier.status === 'completed' ? 'text-trust-green' : 'text-zinc-100'}`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Message */}
      <div className="mt-12 p-6 bg-zinc-50 rounded-[1.5rem] border border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Fingerprint className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-zinc-900">
              {isVerified 
                ? (currentTier === 'individual' ? 'Ready for Enterprise expansion?' : 'Ultimate node status achieved.')
                : 'Cryptographic credentials required.'}
            </p>
            <p className="font-sans text-[10px] text-zinc-500">
              {isVerified 
                ? (currentTier === 'individual' ? 'Upgrade to Business to unlock team hubs and unlimited signatures.' : 'Your node is operating at maximum protocol efficiency.')
                : 'Upload documentation to progress to the next trust tier and unlock more features.'}
            </p>
          </div>
        </div>
        
        {!isVerified && (
          <div className="px-5 py-2 bg-zinc-950 text-white rounded-xl font-display font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 group cursor-pointer hover:bg-zinc-800 transition-all">
            Start Verification
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </div>
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
