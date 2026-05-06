'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Upload, 
  Search, 
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight,
  FileText,
  Clock,
  User,
  Archive,
  Fingerprint,
  Building2,
  Quote
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useUser } from '@/hooks/use-user';

export default function VerifyPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState<'file' | 'id'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [registryId, setRegistryId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'authentic' | 'unindexed' | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentHash, setCurrentHash] = useState<string | null>(null);

  const calculateHash = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const handleVerify = async () => {
    if (!file) return;
    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const emailValue = localStorage.getItem('authenticated_user_email');
      
      // 1. Deduct verification credit ONLY if logged in
      if (emailValue) {
        const deductRes = await fetch('/api/payment/deduct-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailValue })
        });

        if (!deductRes.ok) {
          const errorData = await deductRes.json();
          if (deductRes.status === 402) {
            setError('Insufficient Energy Units. Please recharge your core to proceed with verification.');
            setIsVerifying(false); // Stop here
            return;
          }
          throw new Error(errorData.error || 'Deduction failed');
        }
      }

      const hash = await calculateHash(file);
      setCurrentHash(hash);
      
      const res = await fetch(`/api/hashes?hash=${hash}&fileName=${encodeURIComponent(file.name)}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const resultType = data.type || (data.registryId ? 'registry' : 'hash');
          setResult({...data, type: resultType});
          setVerificationStatus('authentic');
        } else {
          setResult('NOT_FOUND');
          setVerificationStatus('unindexed');
        }
      } else {
        throw new Error('Network error during verification');
      }
    } catch (err) {
      console.error(err);
      setError('System failure during verification protocol.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyId = async () => {
    if (!registryId) return;
    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const emailValue = localStorage.getItem('authenticated_user_email');

      // 1. Deduct verification credit ONLY if logged in
      if (emailValue) {
        const deductRes = await fetch('/api/payment/deduct-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailValue })
        });

        if (!deductRes.ok) {
          const errorData = await deductRes.json();
          if (deductRes.status === 402) {
            setError('Insufficient Energy Units. Core recharge required.');
            setIsVerifying(false);
            return;
          }
          throw new Error(errorData.error || 'Deduction failed');
        }
      }

      const res = await fetch(`/api/registry?registryId=${registryId}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        if (data && !data.error) {
          setResult({...data, type: 'registry'});
          setVerificationStatus('authentic');
        } else {
          setResult('NOT_FOUND');
          setVerificationStatus('unindexed');
        }
      } else {
        setResult('NOT_FOUND');
        setVerificationStatus('unindexed');
      }
    } catch (err) {
      console.error(err);
      setError('Registry lookup protocol failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const isGuest = !user?.email;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-trust-green/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-trust-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <main className={`relative min-h-screen w-full bg-white selection:bg-trust-green/20 ${!isGuest ? 'lg:pl-72' : ''} pt-16 lg:pt-0 pb-20 px-4 sm:px-6`}>
      <BackgroundAnimation />
      {!isGuest && <Sidebar />}

      <div className={`relative z-10 w-full max-w-4xl mx-auto ${!isGuest ? 'py-12 lg:py-20' : 'py-20 lg:py-32'}`}>
        {isGuest && (
          <div className="absolute top-8 right-8 z-50">
            <button 
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-zinc-950 text-white rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
            >
              Sign In to Node
            </button>
          </div>
        )}

        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-trust-green/10 rounded-3xl flex items-center justify-center text-trust-green mx-auto mb-8 shadow-inner"
          >
            <ShieldCheck className="w-10 h-10" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl font-extrabold text-zinc-900 mb-4 tracking-tight"
          >
            Public Verification Hub
          </motion.h1>
          <p className="font-sans text-zinc-500 text-lg max-w-2xl mx-auto">
            Authenticate digital assets and identity records against the immutable TechCore ledger.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8">
          <div className="flex justify-center mb-4">
            <div className="bg-zinc-100/80 backdrop-blur-sm p-1.5 rounded-[2rem] flex gap-1 border border-zinc-200/50">
              <button 
                onClick={() => { setActiveTab('file'); setResult(null); setVerificationStatus(null); }}
                className={`px-8 py-3 rounded-[1.5rem] font-display font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                  activeTab === 'file' ? 'bg-white text-zinc-950 shadow-xl shadow-zinc-200/50 scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                File Analysis
              </button>
              <button 
                onClick={() => { setActiveTab('id'); setResult(null); setVerificationStatus(null); }}
                className={`px-8 py-3 rounded-[1.5rem] font-display font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                  activeTab === 'id' ? 'bg-white text-zinc-950 shadow-xl shadow-zinc-200/50 scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Record Lookup
              </button>
            </div>
          </div>

          <section className="bg-white border border-zinc-100 rounded-[4rem] p-10 lg:p-16 shadow-2xl shadow-zinc-200/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-trust-green/20 via-trust-green to-trust-green/20" />
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-3"
              >
                <AlertTriangle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            {!result && !isVerifying ? (
              <div className="space-y-10">
                {activeTab === 'file' ? (
                  <div className="relative group">
                    <input 
                      type="file" 
                      onChange={onFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-zinc-100 group-hover:border-trust-green/50 rounded-[3.5rem] py-24 px-10 transition-all duration-500 bg-zinc-50/30 flex flex-col items-center justify-center group-hover:bg-trust-green/[0.02]">
                      <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-8 shadow-lg ring-8 ring-zinc-50 group-hover:scale-110 transition-transform duration-500">
                        <Upload className="w-8 h-8 text-zinc-300 group-hover:text-trust-green transition-colors" />
                      </div>
                      <p className="font-display font-bold text-2xl text-zinc-900 mb-3">
                        {file ? file.name : 'Upload Document'}
                      </p>
                      <p className="font-sans text-base text-zinc-400 max-w-xs text-center leading-relaxed">
                        {file ? `${(file.size / 1024).toFixed(1)} KB detected. Ready for analysis.` : 'Drag and drop any file to verify its cryptographic integrity.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-14 bg-zinc-50/50 rounded-[3.5rem] border border-zinc-100 flex flex-col items-center justify-center text-center">
                       <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-8 shadow-lg">
                          <Fingerprint className="w-10 h-10 text-trust-green" />
                       </div>
                       <h3 className="font-display font-bold text-2xl text-zinc-900 mb-6">Record Identity Search</h3>
                       <div className="w-full max-w-md relative group">
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-300 group-focus-within:text-trust-green transition-colors" />
                          <input 
                            type="text" 
                            placeholder="TC-NODE-0000-X"
                            value={registryId}
                            onChange={(e) => setRegistryId(e.target.value.toUpperCase())}
                            className="w-full h-16 pl-14 pr-6 bg-white border-2 border-zinc-100 rounded-2xl focus:outline-none focus:border-trust-green font-mono text-lg tracking-wider transition-all shadow-sm"
                          />
                       </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={activeTab === 'file' ? handleVerify : handleVerifyId}
                  disabled={activeTab === 'file' ? !file : !registryId}
                  className="w-full h-20 bg-zinc-950 text-white rounded-[2rem] font-display font-bold text-xl flex items-center justify-center gap-4 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all duration-300 shadow-2xl shadow-zinc-200"
                >
                  {activeTab === 'file' ? 'Authenticate Document' : 'Query Global Ledger'}
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            ) : isVerifying ? (
              <div className="py-24 text-center space-y-10">
                <div className="relative w-32 h-32 mx-auto">
                   <div className="absolute inset-0 border-4 border-trust-green/20 border-t-trust-green rounded-full animate-spin" />
                   <div className="absolute inset-6 border-4 border-zinc-100 border-b-zinc-400 rounded-full animate-spin-reverse" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <ShieldCheck className="w-10 h-10 text-trust-green opacity-40 animate-pulse" />
                   </div>
                </div>
                <div>
                  <h3 className="font-display font-bold text-3xl text-zinc-900 tracking-tight">Executing Verification Protocol</h3>
                  <p className="font-mono text-xs text-zinc-400 tracking-[0.3em] font-bold mt-4 uppercase animate-pulse">Scanning Decentalized Nodes</p>
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
              >
                {verificationStatus === 'unindexed' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-50 border border-zinc-200/50 rounded-[4rem] p-16 lg:p-24 text-center"
                  >
                    <div className="w-28 h-28 bg-white rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-xl ring-8 ring-zinc-50">
                      <Archive className="w-12 h-12 text-zinc-300" />
                    </div>
                    <h3 className="font-display font-bold text-4xl text-zinc-900 mb-4 tracking-tighter">Identity Void Detected</h3>
                    <p className="font-sans text-zinc-500 mb-12 max-w-md mx-auto leading-relaxed text-lg">
                      No matching cryptographic footprint could be validated. This document or record has not been indexed on the TechCore substrate.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      <button 
                        onClick={() => { setResult(null); setVerificationStatus(null); setFile(null); setRegistryId(''); setError(null); }}
                        className="h-16 px-12 bg-zinc-950 text-white rounded-2xl font-display font-bold text-sm uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20"
                      >
                        Reset Protocol
                      </button>
                      <button 
                        onClick={() => router.push('/login')}
                        className="h-16 px-12 bg-white text-zinc-900 border-2 border-zinc-200 rounded-2xl font-display font-bold text-sm uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all"
                      >
                        Node Access
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-trust-green/[0.02] border-2 border-trust-green/10 rounded-[4rem] p-10 lg:p-16 relative overflow-hidden"
                  >
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-trust-green/[0.03] blur-[120px] rounded-full -mr-[250px] -mt-[250px]" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-100 blur-[100px] rounded-full -ml-[200px] -mb-[200px]" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row gap-16 lg:items-start">
                      <div className="shrink-0 flex flex-col items-center lg:items-start">
                        <div className="w-40 h-40 bg-white rounded-[3.5rem] flex items-center justify-center shadow-[0_30px_70px_rgba(16,185,129,0.2)] ring-[16px] ring-trust-green/[0.03] mb-8 group overflow-hidden">
                          {result.type === 'registry' ? 
                            <Archive className="w-16 h-16 text-trust-green transition-transform duration-700 group-hover:scale-110" /> : 
                            <ShieldCheck className="w-16 h-16 text-trust-green transition-transform duration-700 group-hover:scale-110" />
                          }
                        </div>
                        <div className="px-6 py-2 bg-trust-green text-white rounded-2xl font-mono text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-lg shadow-trust-green/20">
                           <CheckCircle2 className="w-4 h-4" />
                           Authentic
                        </div>
                      </div>

                      <div className="flex-1 space-y-12">
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 bg-trust-green text-white rounded-lg">Verified Substrate</span>
                          </div>
                          <h3 className="font-display font-black text-5xl lg:text-6xl text-zinc-900 tracking-tighter leading-[0.9] mb-4">
                            {result.type === 'registry' ? 'Official Ledger Entry' : 'Cryptographic Match Verified'}
                          </h3>
                        </div>

                        {/* Registrar Section - Highlighted Company Data */}
                        <div className="p-8 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm relative group overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150" />
                           <div className="relative z-10">
                              <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-6 block">Identity Attestation</span>
                              
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center shrink-0">
                                  {result.registrar?.entityType === 'Company' ? <Building2 className="w-8 h-8 text-trust-green" /> : <User className="w-8 h-8 text-trust-green" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-display font-extrabold text-2xl text-zinc-900 truncate tracking-tight">
                                    {(result.registrar?.companyName || (result.registrar?.firstName || result.registrar?.lastName)) ? (
                                      result.registrar?.companyName || `${result.registrar?.firstName || ''} ${result.registrar?.lastName || ''}`.trim()
                                    ) : (
                                      result.userEmail?.split('@')[0] || 'Unknown Registrar'
                                    )}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="font-sans text-sm text-zinc-500 font-medium">
                                      {result.registrar?.entityType || 'Trust'} Node
                                    </p>
                                    <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                                    <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase truncate">
                                      {result.userEmail}
                                    </p>
                                  </div>
                                </div>
                                {result.registrar?.verificationStatus === 'verified' && (
                                  <div className="px-3 py-1 bg-trust-green/10 border border-trust-green/20 rounded-full flex items-center gap-1.5 shrink-0 hidden sm:flex">
                                    <ShieldCheck className="w-3.5 h-3.5 text-trust-green" />
                                    <span className="font-mono text-[9px] font-bold text-trust-green uppercase">L2 Verified</span>
                                  </div>
                                )}
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { 
                              label: 'Asset Recognition', 
                              value: result.docName || result.name || result.fileName || 'Untitled Index', 
                              icon: FileText,
                              type: 'text'
                            },
                            { 
                              label: result.type === 'registry' ? 'Substrate ID' : 'Protocol Status', 
                              value: result.type === 'registry' ? result.registryId : (result.expiryDate ? new Date(result.expiryDate).toLocaleDateString() : 'Infinite Persistence'), 
                              icon: result.type === 'registry' ? Fingerprint : Clock,
                              type: 'mono'
                            },
                            { 
                              label: 'Genesis Timestamp', 
                              value: new Date(result.createdAt).toLocaleString(), 
                              icon: Clock,
                              type: 'text'
                            }
                          ].map((card, i) => (
                            <div key={i} className="p-6 bg-white border border-zinc-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
                              <div className="flex items-center gap-2 mb-4 text-zinc-400 group-hover:text-trust-green transition-colors">
                                <card.icon className="w-4 h-4" />
                                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]">{card.label}</span>
                              </div>
                              <p className={`font-display font-bold ${card.type === 'mono' ? 'font-mono text-xs' : 'text-base'} text-zinc-900 truncate tracking-tight`}>
                                {card.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-6">
                           <div className="p-8 bg-zinc-950 rounded-[3rem] text-white overflow-hidden relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-trust-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                              
                              <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                  <Fingerprint className="w-5 h-5 text-trust-green" />
                                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Ledger_Signature_SHA256</span>
                                </div>
                                <span className="font-mono text-[10px] font-black text-trust-green py-1 px-3 border border-trust-green/30 rounded-lg uppercase bg-trust-green/5">Immune</span>
                              </div>
                              <p className="font-mono text-sm text-zinc-400 break-all leading-loose relative z-10 font-bold tracking-wider">
                                {result.type === 'registry' ? result.fileKey : result.hash}
                              </p>
                           </div>

                           {result.type === 'registry' && result.description && (
                             <div className="p-10 bg-white border border-zinc-100 rounded-[3rem] shadow-sm italic">
                                <div className="flex items-center gap-2 mb-3">
                                  <Quote className="w-4 h-4 text-zinc-200" />
                                  <span className="font-mono text-[9px] text-zinc-300 uppercase tracking-[0.2em] font-black">Registrar Statement</span>
                                </div>
                                <p className="font-sans text-lg text-zinc-600 leading-relaxed">&quot;{result.description}&quot;</p>
                             </div>
                           )}
                        </div>

                        <div className="flex items-center justify-between pt-8 border-t border-zinc-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-trust-green/10 rounded-full flex items-center justify-center">
                              <ShieldCheck className="w-5 h-5 text-trust-green" />
                            </div>
                            <p className="font-sans text-xs text-zinc-400 font-bold uppercase tracking-widest">
                              Protocol integrity confirmed at 100%
                            </p>
                          </div>
                          <button 
                            onClick={() => { setFile(null); setRegistryId(''); setResult(null); setVerificationStatus(null); setError(null); }}
                            className="h-12 px-8 bg-zinc-100 text-zinc-600 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 hover:text-zinc-900 transition-all flex items-center gap-2"
                          >
                             Terminate Audit <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

          </section>

          <section className="bg-zinc-50 p-12 rounded-[4rem] border border-zinc-100 flex flex-col md:flex-row items-center gap-12 group transition-all hover:bg-white hover:shadow-xl hover:shadow-zinc-200/50">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shrink-0 shadow-lg ring-[12px] ring-zinc-100 group-hover:scale-110 transition-transform duration-500">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
            </div>
            <div>
              <h4 className="font-display font-bold text-2xl text-zinc-900 mb-3 tracking-tight">Technical Assurance Layer</h4>
              <p className="font-sans text-lg text-zinc-500 leading-relaxed max-w-2xl font-medium">
                TechCore node verification implements strict binary consensus. Any modification to a digital asset, even by a single bit, will invalidate the cryptographic signature and result in a mismatch on the substrate.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
