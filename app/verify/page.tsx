'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Quote,
  Globe
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useUser } from '@/hooks/use-user';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nodeParam = searchParams.get('node');
  
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState<'file' | 'id'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [registryId, setRegistryId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'authentic' | 'unindexed' | 'mismatch' | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [nodeInfo, setNodeInfo] = useState<any | null>(null);

  useEffect(() => {
    if (nodeParam) {
      fetch(`/api/node?email=${nodeParam}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setNodeInfo(data);
        })
        .catch(err => console.error('Failed to fetch node info:', err));
    }
  }, [nodeParam]);

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
          // If we are on a specific company/node page, only allow verified if it matches that node
          if (nodeParam && data.userEmail?.toLowerCase() !== nodeParam.toLowerCase()) {
            setError(`Security Conflict: This document belongs to a different node (${data.registrar?.companyName || data.userEmail}) and cannot be authenticated here.`);
            setVerificationStatus('mismatch');
            setIsVerifying(false);
            return;
          }

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
          // If we are on a specific company/node page, only allow verified if it matches that node
          if (nodeParam && data.userEmail?.toLowerCase() !== nodeParam.toLowerCase()) {
            setError(`Security Conflict: This identity record is registered to another authority (${data.registrar?.companyName || data.userEmail}).`);
            setVerificationStatus('mismatch');
            setIsVerifying(false);
            return;
          }

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
    <main className={`relative min-h-screen w-full bg-white selection:bg-trust-green/20 ${!isGuest ? 'lg:pl-72' : ''} pt-16 lg:pt-0 pb-20 overflow-x-hidden`}>
      <BackgroundAnimation />
      {!isGuest && <Sidebar />}

      <div className={`relative z-10 w-full max-w-6xl mx-auto ${!isGuest ? 'py-12 lg:py-20' : 'py-20 lg:py-32'} px-4 sm:px-6`}>
        {isGuest && (
          <div className="absolute top-8 right-8 z-50">
            <button 
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-zinc-950 text-white rounded-full font-display font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-xl"
            >
              Access Member Node
            </button>
          </div>
        )}

        <header className="mb-20 text-center relative">
          {/* Atmospheric Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-trust-green/10 blur-[120px] rounded-full pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 bg-white border border-zinc-200 rounded-[2rem] flex items-center justify-center text-zinc-950 mx-auto mb-10 shadow-xl relative group"
          >
            <div className="absolute inset-0 bg-trust-green/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            {nodeInfo ? <Globe className="w-12 h-12 relative z-10" /> : <ShieldCheck className="w-12 h-12 relative z-10" />}
          </motion.div>
          
          {nodeInfo ? (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-3 px-6 py-2 bg-trust-green/10 border border-trust-green/20 text-trust-green rounded-full font-mono text-[10px] font-black uppercase tracking-[0.3em] shadow-sm"
              >
                <div className="w-2 h-2 bg-trust-green rounded-full animate-pulse" />
                Active Node Authority
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-7xl lg:text-9xl font-black text-zinc-950 tracking-tighter leading-[0.8] uppercase max-w-4xl mx-auto"
              >
                {nodeInfo.companyName || `${nodeInfo.firstName} ${nodeInfo.lastName}`}
              </motion.h1>
              <p className="font-sans text-zinc-500 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                Authorized gateway for <span className="text-zinc-900 font-bold">{nodeParam}</span>. Validating cryptographic artifacts and identity records on the TechCore substrate.
              </p>
            </div>
          ) : (
            <>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-6xl lg:text-8xl font-black text-zinc-950 mb-6 tracking-tighter leading-[0.85] uppercase"
              >
                Protocol Verification
              </motion.h1>
              <p className="font-sans text-zinc-500 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                 Public entry point for decentralized ledger authentication and identity verification.
              </p>
            </>
          )}
        </header>

        <div className="max-w-4xl mx-auto space-y-12">
          {/* Node Stats - Condensed version of the card */}
          {nodeInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-1 ring-1 ring-zinc-200 rounded-[2rem] overflow-hidden bg-white shadow-lg shadow-zinc-200/50"
            >
              {[
                { label: 'Authority', value: 'Level 2 Node', icon: ShieldCheck },
                { label: 'Status', value: 'Live 100%', icon: Globe },
                { label: 'Identity', value: nodeInfo.entityType || 'Registrar', icon: User },
              ].map((stat, i) => (
                <div key={i} className="p-8 bg-zinc-50 border-r border-zinc-200 last:border-r-0 flex flex-col items-center justify-center text-center group hover:bg-white transition-colors">
                  <stat.icon className="w-6 h-6 text-zinc-400 mb-3 group-hover:text-trust-green transition-colors" />
                  <p className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest mb-1 font-bold">{stat.label}</p>
                  <p className="font-display font-black text-zinc-900 text-sm uppercase tracking-wider">{stat.value}</p>
                </div>
              ))}
            </motion.div>
          )}

          <div className="flex justify-center">
            <div className="bg-zinc-100 p-1.5 rounded-[2rem] flex gap-1 shadow-inner">
              <button 
                onClick={() => { setActiveTab('file'); setResult(null); setVerificationStatus(null); }}
                className={`px-8 py-3 rounded-[1.5rem] font-display font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                  activeTab === 'file' ? 'bg-white text-zinc-950 shadow-xl scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Artifact Analysis
              </button>
              <button 
                onClick={() => { setActiveTab('id'); setResult(null); setVerificationStatus(null); }}
                className={`px-8 py-3 rounded-[1.5rem] font-display font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                  activeTab === 'id' ? 'bg-white text-zinc-950 shadow-xl scale-[1.02]' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Record Retrieval
              </button>
            </div>
          </div>

          <section className="bg-white border border-zinc-200 rounded-[4rem] p-10 lg:p-16 shadow-2xl shadow-zinc-200/50 relative overflow-hidden group">
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-trust-green/[0.02] to-transparent pointer-events-none" />

            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4"
              >
                <div className="w-6 h-6 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                {error}
              </motion.div>
            )}

            {!result && !isVerifying ? (
              <div className="space-y-10">
                {activeTab === 'file' ? (
                  <div className="relative group/upload">
                    <input 
                      type="file" 
                      onChange={onFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-zinc-100 group-hover/upload:border-trust-green/50 rounded-[3.5rem] py-24 px-10 transition-all duration-500 bg-zinc-50 flex flex-col items-center justify-center group-hover/upload:bg-trust-green/[0.03]">
                      <div className="w-24 h-24 bg-white border border-zinc-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl group-hover/upload:scale-110 transition-transform duration-500">
                        <Upload className="w-10 h-10 text-zinc-300 group-hover/upload:text-trust-green transition-colors" />
                      </div>
                      <p className="font-display font-bold text-3xl text-zinc-900 mb-3">
                        {file ? file.name : 'Ingest Artifact'}
                      </p>
                      <p className="font-sans text-base text-zinc-400 max-w-xs text-center leading-relaxed">
                        {file ? `${(file.size / 1024).toFixed(1)} KB identified. Awaiting consensus.` : 'Drop cryptographic asset to verify its immutable signature.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-16 bg-zinc-50 rounded-[3.5rem] border border-zinc-100 flex flex-col items-center justify-center text-center">
                       <div className="w-24 h-24 bg-white border border-zinc-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl">
                          <Fingerprint className="w-12 h-12 text-trust-green" />
                       </div>
                       <h3 className="font-display font-bold text-3xl text-zinc-900 mb-6 uppercase tracking-tight">Access Identifier</h3>
                       <div className="w-full max-w-md relative group/input">
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-zinc-300 group-focus-within/input:text-trust-green transition-colors" />
                          <input 
                            type="text" 
                            placeholder="TC-PROTOCOL-0000"
                            value={registryId}
                            onChange={(e) => setRegistryId(e.target.value.toUpperCase())}
                            className="w-full h-20 pl-16 pr-8 bg-white border border-zinc-200 rounded-3xl focus:outline-none focus:border-trust-green text-zinc-900 font-mono text-xl tracking-[0.2em] transition-all"
                          />
                       </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={activeTab === 'file' ? handleVerify : handleVerifyId}
                  disabled={activeTab === 'file' ? !file : !registryId}
                  className="w-full h-24 bg-zinc-950 text-white rounded-[2.5rem] font-display font-black text-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-6 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed transition-all duration-500 shadow-2xl relative overflow-hidden group/btn"
                >
                  {activeTab === 'file' ? 'Begin Authentication' : 'Query Substrate'}
                  <ArrowRight className="w-8 h-8 group-hover/btn:translate-x-2 transition-transform" />
                </button>
              </div>
            ) : isVerifying ? (
              <div className="py-24 text-center space-y-12">
                <div className="relative w-40 h-40 mx-auto">
                   <div className="absolute inset-0 border-[6px] border-zinc-100 border-t-trust-green rounded-full animate-spin" />
                   <div className="absolute inset-8 border-[6px] border-zinc-50 border-b-zinc-200 rounded-full animate-spin-reverse" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <ShieldCheck className="w-14 h-14 text-trust-green opacity-40 animate-pulse" />
                   </div>
                </div>
                <div>
                  <h3 className="font-display font-black text-4xl text-zinc-950 tracking-widest uppercase">Validating Protocol</h3>
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <span className="w-1.5 h-1.5 bg-trust-green rounded-full animate-ping" />
                    <p className="font-mono text-xs text-zinc-400 tracking-[0.4em] font-black uppercase">Consensus Synchronization In Progress</p>
                  </div>
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
                    className="bg-zinc-50 border border-zinc-100 rounded-[4rem] p-16 lg:p-24 text-center"
                  >
                    <div className="w-32 h-32 bg-white border border-zinc-200 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-xl">
                      <Archive className="w-14 h-14 text-zinc-300" />
                    </div>
                    <h3 className="font-display font-black text-5xl text-zinc-900 mb-6 uppercase tracking-tighter">Null Index</h3>
                    <p className="font-sans text-zinc-500 mb-12 max-w-md mx-auto leading-relaxed text-xl font-medium">
                      The cryptographic fingerprint requested is not recognized by this node instance. No substrate record found.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      <button 
                        onClick={() => { setResult(null); setVerificationStatus(null); setFile(null); setRegistryId(''); setError(null); }}
                        className="h-16 px-12 bg-zinc-950 text-white rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all shadow-xl"
                      >
                        Reset Gateway
                      </button>
                    </div>
                  </motion.div>
                ) : verificationStatus === 'mismatch' ? (
                   <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border border-red-100 rounded-[4rem] p-16 lg:p-24 text-center"
                  >
                    <div className="w-32 h-32 bg-white border border-red-200 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-xl">
                      <AlertTriangle className="w-14 h-14 text-red-500" />
                    </div>
                    <h3 className="font-display font-black text-5xl text-red-600 mb-6 uppercase tracking-tighter">Security Conflict</h3>
                    <p className="font-sans text-zinc-600 mb-12 max-w-xl mx-auto leading-relaxed text-xl font-medium">
                      Authentication Denied. This record is registered to a different authority node. Gateway isolation active.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      <button 
                        onClick={() => { setResult(null); setVerificationStatus(null); setFile(null); setRegistryId(''); setError(null); }}
                        className="h-16 px-12 bg-zinc-950 text-white rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] hover:bg-zinc-800 transition-all shadow-xl"
                      >
                        Terminate Search
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-trust-green/[0.01] border-2 border-trust-green/10 rounded-[4rem] p-10 lg:p-16 relative overflow-hidden shadow-xl"
                  >
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-trust-green/[0.03] blur-[120px] rounded-full -mr-[250px] -mt-[250px]" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-50 blur-[100px] rounded-full -ml-[200px] -mb-[200px]" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row gap-16 lg:items-start">
                      <div className="shrink-0 flex flex-col items-center lg:items-start">
                        <div className="w-40 h-40 bg-white rounded-[3.5rem] flex items-center justify-center shadow-xl ring-[16px] ring-zinc-50 mb-8 group overflow-hidden border border-zinc-100">
                          {result.type === 'registry' ? 
                            <Archive className="w-16 h-16 text-trust-green transition-transform duration-700 group-hover:scale-110" /> : 
                            <ShieldCheck className="w-16 h-16 text-trust-green transition-transform duration-700 group-hover:scale-110" />
                          }
                        </div>
                        <div className="w-full text-center">
                          <div className="px-6 py-2 bg-trust-green text-zinc-950 rounded-2xl font-mono text-xs font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3 shadow-lg shadow-trust-green/20">
                             <CheckCircle2 className="w-5 h-5" />
                             Verified
                          </div>
                        </div>
                      </div>


                        <div className="flex-1 space-y-10">
                          <div>
                            <div className="flex items-center gap-4 mb-6">
                              <span className="font-mono text-[10px] font-black uppercase tracking-[0.4em] px-4 py-1.5 bg-trust-green text-zinc-950 rounded-xl">Protocol.Alpha</span>
                              <div className="h-[1px] flex-1 bg-trust-green/10" />
                            </div>
                            <h3 className="font-display font-black text-6xl lg:text-7xl text-zinc-900 tracking-tighter leading-[0.8] uppercase mb-4">
                              Authentic<br />Artifact
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              { 
                                label: 'Artifact Class', 
                                value: result.docName || result.name || result.fileName || 'General Asset', 
                                icon: FileText,
                                type: 'text'
                              },
                              { 
                                label: result.type === 'registry' ? 'Protocol ID' : 'Persistence', 
                                value: result.type === 'registry' ? result.registryId : (result.expiryDate ? new Date(result.expiryDate).toLocaleDateString() : 'Permanent'), 
                                icon: result.type === 'registry' ? Fingerprint : Clock,
                                type: 'mono'
                              },
                              { 
                                label: 'Genesis Timestamp', 
                                value: new Date(result.createdAt).toLocaleString(), 
                                icon: Clock,
                                type: 'text'
                              },
                              // Only show registrar if it's NOT the current node info we are already showing
                              ...((!nodeInfo || (result.userEmail && nodeInfo.email && result.userEmail.toLowerCase() !== nodeInfo.email.toLowerCase())) ? [{ 
                                label: 'Genesis Registrar', 
                                value: result.registrar?.companyName || result.userEmail, 
                                icon: User,
                                type: 'text'
                              }] : [])
                            ].map((card, i) => (
                              <div key={i} className="p-6 bg-white border border-zinc-100 rounded-[2rem] shadow-sm group hover:bg-zinc-50 transition-colors">
                                <div className="flex items-center gap-2 mb-3 text-zinc-400 group-hover:text-trust-green transition-colors">
                                  <card.icon className="w-4 h-4" />
                                  <span className="font-mono text-[9px] font-black uppercase tracking-[0.3em]">{card.label}</span>
                                </div>
                                <p className={`font-display font-bold ${card.type === 'mono' ? 'font-mono text-xs' : 'text-lg'} text-zinc-950 truncate tracking-tight`}>
                                  {card.value}
                                </p>
                              </div>
                            ))}
                          </div>

                        <div className="space-y-6">
                           <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-[3rem] text-zinc-900 overflow-hidden relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-trust-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                              
                              <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                  <Fingerprint className="w-5 h-5 text-trust-green" />
                                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Ledger_Signature_SHA256</span>
                                </div>
                                <span className="font-mono text-[10px] font-black text-trust-green py-1 px-3 border border-trust-green/30 rounded-lg uppercase bg-trust-green/5">Immune</span>
                              </div>
                              <p className="font-mono text-sm text-zinc-500 break-all leading-loose relative z-10 font-bold tracking-wider">
                                {result.type === 'registry' ? result.fileKey : result.hash}
                              </p>
                           </div>

                           {result.type === 'registry' && result.description && (
                             <div className="p-10 bg-white border border-zinc-100 rounded-[3rem] shadow-sm italic relative overflow-hidden group/quote">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-trust-green/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover/quote:bg-trust-green/10 transition-colors" />
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                  <Quote className="w-6 h-6 text-trust-green" />
                                  <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.3em] font-black">Attestation Statement</span>
                                </div>
                                <p className="font-sans text-xl text-zinc-600 leading-relaxed relative z-10 font-medium">
                                  &quot;{result.description}&quot;
                                </p>
                             </div>
                           )}
                        </div>

                        <div className="flex items-center justify-between pt-10 border-t border-zinc-100">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-trust-green/10 rounded-full flex items-center justify-center border border-trust-green/20">
                              <ShieldCheck className="w-6 h-6 text-trust-green" />
                            </div>
                            <p className="font-sans text-xs text-zinc-400 font-black uppercase tracking-[0.3em]">
                              Audit Complete
                            </p>
                          </div>
                          <button 
                            onClick={() => { setFile(null); setRegistryId(''); setResult(null); setVerificationStatus(null); setError(null); }}
                            className="h-14 px-10 bg-zinc-100 text-zinc-600 rounded-2xl font-display font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all flex items-center gap-3"
                          >
                             Terminate Session <X className="w-5 h-5" />
                          </button>
                        </div>

                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

          </section>

          <section className="bg-white border border-zinc-200 overflow-hidden rounded-[3rem] shadow-2xl shadow-zinc-200/50 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-transparent opacity-20" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch">
              <div className="p-12 lg:p-16 flex items-center justify-center bg-zinc-50 border-b lg:border-b-0 lg:border-r border-zinc-100">
                <div className="w-24 h-24 bg-white border border-zinc-100 rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <AlertTriangle className="w-12 h-12 text-zinc-950" />
                </div>
              </div>
              <div className="p-12 lg:p-16 flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-mono text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Global Assurance Protocol</span>
                </div>
                <h4 className="font-display font-black text-4xl text-zinc-900 mb-6 uppercase tracking-tighter leading-none">Security Inflow Control</h4>
                <p className="font-sans text-lg text-zinc-500 leading-relaxed max-w-3xl font-medium">
                  This gateway enforces strict <span className="text-zinc-950 font-bold">256-bit SHA-2</span> cryptographic analysis. Any modification to the substrate records, however minute, will result in immediate <span className="text-red-600 font-bold">Authority Lockdown</span> and revocation of verification metadata.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
