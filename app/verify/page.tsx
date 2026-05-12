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

  const logVerificationResult = async (status: 'authentic' | 'unindexed' | 'mismatch', type: 'file' | 'registry', registrarEmail: string | null, identifier: string) => {
    try {
      await fetch('/api/analytics/log-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: nodeParam ? 'share_hub' : 'public',
          registrarEmail: registrarEmail || (nodeParam ? nodeInfo?.userEmail : null),
          status,
          type,
          [type === 'file' ? 'hash' : 'registryId']: identifier
        })
      });
    } catch (err) {
      console.error('Failed to log verification:', err);
    }
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
            setError('Monthly free verification quota reached for the current period. Upgrade required for additional analysis.');
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
            logVerificationResult('mismatch', 'file', data.userEmail, hash);
            setIsVerifying(false);
            return;
          }

          const resultType = data.type || (data.registryId ? 'registry' : 'hash');
          setResult({...data, type: resultType});
          setVerificationStatus('authentic');
          logVerificationResult('authentic', 'file', data.userEmail, hash);
        } else {
          setResult('NOT_FOUND');
          setVerificationStatus('unindexed');
          logVerificationResult('unindexed', 'file', nodeParam, hash);
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
            setError('Monthly free verification quota reached for the current period. Upgrade required for additional registry lookups.');
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
            logVerificationResult('mismatch', 'registry', data.userEmail, registryId);
            setIsVerifying(false);
            return;
          }

          setResult({...data, type: 'registry'});
          setVerificationStatus('authentic');
          logVerificationResult('authentic', 'registry', data.userEmail, registryId);
        } else {
          setResult('NOT_FOUND');
          setVerificationStatus('unindexed');
          logVerificationResult('unindexed', 'registry', nodeParam, registryId);
        }
      } else {
        setResult('NOT_FOUND');
        setVerificationStatus('unindexed');
        logVerificationResult('unindexed', 'registry', nodeParam, registryId);
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

  const handleDownload = async (fileKey: string, fileName: string) => {
    try {
      const res = await fetch(`/api/upload/download?key=${encodeURIComponent(fileKey)}`);
      if (res.ok) {
        const { url } = await res.json();
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download protocol failed:', err);
    }
  };

  const isGuest = !user?.email;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 transition-colors duration-300">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-trust-green/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-trust-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <main className={`relative min-h-screen w-full bg-white dark:bg-zinc-950 selection:bg-trust-green/20 ${!isGuest ? 'lg:pl-72' : ''} pt-16 lg:pt-0 pb-20 overflow-x-hidden transition-colors duration-300`}>
      <BackgroundAnimation />
      {!isGuest && <Sidebar />}

      <div className={`relative z-10 w-full max-w-6xl mx-auto ${!isGuest ? 'py-12 lg:py-20' : 'py-20 lg:py-32'} px-4 sm:px-6`}>
        {isGuest && (
          <div className="absolute top-8 right-8 z-50">
            <button 
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-trust-green text-zinc-950 rounded-full font-display font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-trust-green/90 transition-all shadow-lg shadow-trust-green/20"
            >
              Access Member Portal
            </button>
          </div>
        )}

        <header className="mb-12 text-center relative">
          {/* Atmospheric Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-trust-green/10 blur-[140px] rounded-full pointer-events-none opacity-40" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-3xl flex items-center justify-center text-zinc-950 dark:text-white mx-auto mb-8 shadow-xl relative group"
          >
            <div className="absolute inset-0 bg-trust-green/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            {nodeInfo ? <Globe className="w-10 h-10 relative z-10 text-trust-green" /> : <ShieldCheck className="w-10 h-10 relative z-10 text-trust-green" />}
          </motion.div>
          
          {nodeInfo ? (
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-trust-green/10 dark:bg-trust-green/5 border border-trust-green/20 dark:border-trust-green/10 text-trust-green rounded-full font-mono text-[9px] font-black uppercase tracking-[0.3em] shadow-sm"
              >
                <div className="w-1.5 h-1.5 bg-trust-green rounded-full animate-pulse" />
                Verified Node Authority
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-5xl lg:text-7xl font-black text-zinc-950 dark:text-white tracking-tighter leading-tight uppercase max-w-4xl mx-auto"
              >
                {nodeInfo.companyName || `${nodeInfo.firstName} ${nodeInfo.lastName}`}
              </motion.h1>
              <div className="flex items-center justify-center gap-3 text-zinc-500 dark:text-zinc-500 font-mono text-[9px] uppercase tracking-widest">
                <span>{nodeInfo.entityType || 'Registrar Node'}</span>
                <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
                <span>Substrate Alpha</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-6xl lg:text-8xl font-black text-zinc-950 dark:text-white mb-2 tracking-tighter leading-[0.8] uppercase"
              >
                Verify<br />Protocol
              </motion.h1>
              <p className="font-sans text-zinc-600 dark:text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed font-medium">
                 Official gateway for cryptographic artifact authentication and decentralized record retrieval.
              </p>
            </div>
          )}
        </header>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Node Stats - Condensed version of the card */}
          {nodeInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-1 ring-1 ring-zinc-200 dark:ring-white/5 rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 shadow-md shadow-zinc-200/50 dark:shadow-none transition-all"
            >
              {[
                { label: 'Authority', value: 'Level 2', icon: ShieldCheck },
                { label: 'Status', value: 'Live', icon: Globe },
                { label: 'Identity', value: nodeInfo.entityType || 'Registrar', icon: User },
              ].map((stat, i) => (
                <div key={i} className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-white/5 last:border-r-0 flex flex-col items-center justify-center text-center group hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                  <stat.icon className="w-5 h-5 text-zinc-400 dark:text-zinc-500 mb-2 group-hover:text-trust-green transition-colors" />
                  <p className="font-mono text-[8px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-0.5 font-bold">{stat.label}</p>
                  <p className="font-display font-black text-zinc-900 dark:text-white text-[11px] uppercase tracking-wider">{stat.value}</p>
                </div>
              ))}
            </motion.div>
          )}

          <div className="flex justify-center">
            <div className="bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-xl p-1.5 rounded-3xl flex gap-1 shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200/50 dark:border-white/5 transition-all">
              <button 
                onClick={() => { setActiveTab('file'); setResult(null); setVerificationStatus(null); }}
                className={`px-10 py-4 rounded-[1.25rem] font-display font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-500 relative overflow-hidden group ${
                  activeTab === 'file' ? 'bg-zinc-900 dark:bg-trust-green text-white dark:text-zinc-950 shadow-xl' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {activeTab === 'file' && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-zinc-900 dark:bg-trust-green -z-10" />}
                <span className="relative z-10">Artifact Analysis</span>
              </button>
              <button 
                onClick={() => { setActiveTab('id'); setResult(null); setVerificationStatus(null); }}
                className={`px-10 py-4 rounded-[1.25rem] font-display font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-500 relative overflow-hidden group ${
                  activeTab === 'id' ? 'bg-zinc-900 dark:bg-trust-green text-white dark:text-zinc-950 shadow-xl' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {activeTab === 'id' && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-zinc-900 dark:bg-trust-green -z-10" />}
                <span className="relative z-10">Record Retrieval</span>
              </button>
            </div>
          </div>

          <section className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-zinc-200 dark:border-white/5 rounded-[3rem] p-8 lg:p-12 shadow-2xl shadow-zinc-200/50 dark:shadow-none relative overflow-hidden group transition-all">
            {/* Ambient Animated Glow */}
            <div className={`absolute -top-20 -right-20 w-80 h-80 blur-[100px] rounded-full transition-colors duration-1000 ${activeTab === 'file' ? 'bg-trust-green/10' : 'bg-blue-500/10'}`} />
            <div className={`absolute -bottom-20 -left-20 w-80 h-80 blur-[100px] rounded-full transition-colors duration-1000 ${activeTab === 'file' ? 'bg-trust-green/5' : 'bg-blue-500/5'}`} />

            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-5 bg-red-500/5 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4 shadow-sm"
              >
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span>{error}</span>
              </motion.div>
            )}

            {!result && !isVerifying ? (
              <div className="space-y-8">
                {activeTab === 'file' ? (
                  <div className="relative group/upload">
                    <input 
                      type="file" 
                      onChange={onFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-zinc-200 dark:border-white/10 group-hover/upload:border-trust-green/40 group-hover/upload:bg-trust-green/[0.02] rounded-[2.5rem] py-20 px-8 transition-all duration-700 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-trust-green/[0.01] to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity duration-1000" />
                      <div className="w-20 h-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover/upload:scale-110 transition-all duration-700 relative z-10">
                        <Upload className="w-10 h-10 text-zinc-400 dark:text-zinc-600 group-hover/upload:text-trust-green transition-colors" />
                      </div>
                      <p className="font-display font-black text-2xl text-zinc-900 dark:text-white mb-3 relative z-10 uppercase tracking-tighter">
                        {file ? file.name : 'Ingest Artifact'}
                      </p>
                      <p className="font-sans text-base text-zinc-600 dark:text-zinc-400 max-w-sm text-center leading-relaxed font-medium relative z-10">
                        {file ? `Payload: ${(file.size / 1024).toFixed(1)} KB. Awaiting authorization.` : 'Drop cryptographic asset for substrate evaluation.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-12 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-[2.5rem] border border-zinc-100 dark:border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden group/id">
                       <div className="w-20 h-20 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/10 rounded-2xl flex items-center justify-center mb-8 shadow-xl relative z-10 group-hover/id:scale-110 transition-transform duration-700">
                          <Fingerprint className="w-10 h-10 text-trust-green" />
                       </div>
                       <h3 className="font-display font-black text-2xl text-zinc-900 dark:text-white mb-8 uppercase tracking-tight relative z-10">Network Address</h3>
                       <div className="w-full max-w-md relative group/input z-10">
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 dark:text-zinc-600 group-focus-within/input:text-trust-green transition-all" />
                          <input 
                            type="text" 
                            placeholder="TC-PROTOCOL-V1"
                            value={registryId}
                            onChange={(e) => setRegistryId(e.target.value.toUpperCase())}
                            className="w-full h-16 pl-14 pr-6 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-white/10 rounded-2xl focus:outline-none focus:border-trust-green text-zinc-900 dark:text-white font-mono text-lg tracking-[0.2em] shadow-sm transition-all"
                          />
                       </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={activeTab === 'file' ? handleVerify : handleVerifyId}
                  disabled={activeTab === 'file' ? !file : !registryId}
                  className={`w-full h-20 rounded-[1.75rem] font-display font-black text-xl uppercase tracking-[0.2em] flex items-center justify-center gap-6 transition-all duration-700 shadow-xl dark:shadow-none relative overflow-hidden group/btn active:scale-[0.98] ${
                    (activeTab === 'file' ? !file : !registryId)
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                    : 'bg-zinc-900 dark:bg-trust-green text-white dark:text-zinc-950'
                  }`}
                >
                  {activeTab === 'file' ? 'Analyze Pattern' : 'Query Registry'}
                  <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform duration-500" />
                </button>
              </div>
            ) : isVerifying ? (
              <div className="py-20 text-center space-y-12">
                <div className="relative w-32 h-32 mx-auto">
                   <div className="absolute inset-0 border-[6px] border-zinc-100 dark:border-white/5 border-t-trust-green rounded-full animate-spin" />
                   <div className="absolute inset-6 border-[6px] border-zinc-50 dark:border-white/5 border-b-zinc-200 dark:border-zinc-800 rounded-full animate-spin-reverse" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <ShieldCheck className="w-12 h-12 text-trust-green opacity-50 animate-pulse" />
                   </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-display font-black text-3xl text-zinc-950 dark:text-white tracking-widest uppercase">Analyzing</h3>
                  <div className="flex items-center justify-center gap-3">
                    <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-500 tracking-[0.4em] font-black uppercase">Consensus evaluation In Progress</p>
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
                    className="bg-red-500/[0.04] dark:bg-red-500/[0.02] border-2 border-red-500/20 rounded-[2.5rem] p-10 lg:p-14 text-center relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500/[0.08] via-transparent to-transparent pointer-events-none" />
                    <div className="w-16 h-16 bg-white dark:bg-zinc-900 border-2 border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl relative z-10 rotate-3">
                      <Archive className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="font-display font-black text-2xl lg:text-3xl text-red-600 dark:text-red-500 mb-2 uppercase tracking-tighter relative z-10">Unrecognized Hash</h3>
                    <p className="font-sans text-zinc-600 dark:text-zinc-400 mb-6 max-w-lg mx-auto leading-relaxed text-sm font-medium relative z-10">
                      The cryptographic fingerprint requested is <span className="text-red-600 font-black whitespace-nowrap">completely absent</span> from the IdenVault sovereign substrate. This asset has no recorded origin or has been structurally compromised.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
                      <button 
                        onClick={() => { setResult(null); setVerificationStatus(null); setFile(null); setRegistryId(''); setError(null); }}
                        className="h-14 px-10 bg-red-600 text-white border border-red-500/20 rounded-2xl font-display font-black text-[10px] uppercase tracking-[0.3em] hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95"
                      >
                        Reset Authority Gateway
                      </button>
                    </div>
                  </motion.div>
                ) : verificationStatus === 'mismatch' ? (
                   <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-500/10 rounded-[2.5rem] p-10 lg:p-14 text-center"
                  >
                    <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="font-display font-black text-2xl lg:text-3xl text-red-600 dark:text-red-500 mb-4 uppercase tracking-tighter">Security Conflict</h3>
                    <p className="font-sans text-zinc-600 dark:text-zinc-400 mb-8 max-w-lg mx-auto leading-relaxed text-sm font-medium">
                      Authentication Denied. This record is registered to a different authority node. Gateway isolation active.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      <button 
                        onClick={() => { setResult(null); setVerificationStatus(null); setFile(null); setRegistryId(''); setError(null); }}
                        className="h-14 px-10 bg-zinc-900 dark:bg-trust-green text-white dark:text-zinc-950 rounded-2xl font-display font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl dark:shadow-none active:scale-95"
                      >
                        Terminate Search
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`border border-zinc-100 dark:border-white/5 rounded-[3rem] p-6 lg:p-10 relative overflow-hidden bg-white dark:bg-zinc-900 shadow-xl transition-all ${
                      (result?.expiryDate && new Date(result.expiryDate) < new Date()) 
                        ? 'ring-2 ring-amber-500/30' 
                        : 'ring-1 ring-zinc-100 dark:ring-white/5'
                    }`}
                  >
                    {/* Expired Status Banner */}
                    {(result?.expiryDate && new Date(result.expiryDate) < new Date()) && (
                      <div className="absolute top-0 inset-x-0 bg-yellow-400 text-zinc-950 py-2 flex items-center justify-center gap-2 font-display font-black text-[10px] uppercase tracking-[0.4em] z-50">
                        <AlertTriangle className="w-4 h-4" />
                        Protocol Expired / Unauthorized Artifact
                      </div>
                    )}

                    <div className="relative z-10 pt-4">
                      {/* Top Info Bar */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-zinc-100 dark:border-white/5 mb-8">
                        <div className="flex items-center gap-6">
                           <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 ${
                            (result?.expiryDate && new Date(result.expiryDate) < new Date())
                              ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-600'
                              : 'bg-trust-green/10 border-trust-green/20 text-trust-green'
                          }`}>
                            {result.type === 'registry' ? <Archive className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                               <span className={`px-2 py-0.5 rounded-md font-mono text-[8px] font-black uppercase tracking-tighter ${
                                 (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'bg-yellow-400 text-zinc-950' : 'bg-trust-green text-zinc-950'
                               }`}>Protocol_Alpha</span>
                               <span className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600">v2.4.0</span>
                            </div>
                            <h3 className="font-display font-black text-3xl lg:text-4xl text-zinc-900 dark:text-white uppercase tracking-tighter leading-none">
                              {result.docName || result.name || result.fileName || 'Archive Data'}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                           {result.fileKey && (
                            <button 
                              onClick={() => handleDownload(result.fileKey, result.docName || result.fileName)}
                              className="h-12 px-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl flex items-center gap-3 font-display font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95"
                            >
                              <Archive className="w-4 h-4" />
                              Download
                            </button>
                          )}
                          <button 
                            onClick={() => { setFile(null); setRegistryId(''); setResult(null); setVerificationStatus(null); setError(null); }}
                            className="h-12 w-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                             <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                         {/* Authority Node / Registrar Details */}
                         <div className="lg:col-span-2 p-6 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-2 text-zinc-400">
                                <Building2 className="w-3.5 h-3.5" />
                                <span className="font-mono text-[8px] font-black uppercase tracking-widest text-[8px]">Authority Protocol</span>
                              </div>
                              {result.registrar?.verificationStatus === 'verified' ? (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-trust-green/10 text-trust-green rounded-full border border-trust-green/20">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span className="font-mono text-[9px] font-black uppercase tracking-widest">Verified Identity</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-900 text-zinc-400 rounded-full border border-zinc-200 dark:border-white/5">
                                  <User className="w-3.5 h-3.5" />
                                  <span className="font-mono text-[9px] font-black uppercase tracking-widest text-xs">Standard Candidate</span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                              <div>
                                <p className="font-mono text-[8px] text-zinc-400 uppercase tracking-widest mb-1.5">Entity Representative</p>
                                <p className={`font-display text-lg font-bold ${
                                  (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'text-yellow-600' : 'text-zinc-900 dark:text-white'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    {result.registrar?.firstName ? `${result.registrar.firstName} ${result.registrar.lastName}` : result.userEmail}
                                    {result.registrar?.verificationStatus === 'verified' && (
                                      <div className="flex items-center justify-center w-5 h-5 bg-trust-green rounded-full shadow-lg shadow-trust-green/20">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                                      </div>
                                    )}
                                  </div>
                                </p>
                                <p className="font-mono text-[10px] text-zinc-500 mt-1">{result.userEmail}</p>
                              </div>

                              <div>
                                <p className="font-mono text-[8px] text-zinc-400 uppercase tracking-widest mb-1.5">Node Classification</p>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 rounded font-mono text-[9px] font-black text-zinc-600 dark:text-zinc-400 uppercase">
                                    {result.registrar?.entityType || 'Individual'}
                                  </span>
                                  {result.registrar?.location && (
                                    <span className="font-sans text-[10px] text-zinc-500 font-medium">{result.registrar.location}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Company Details (Conditional) */}
                            {result.registrar?.entityType === 'Company' && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 pt-6 border-t border-zinc-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-6"
                              >
                                <div>
                                  <p className="font-mono text-[8px] text-zinc-400 uppercase tracking-widest mb-1.5 text-trust-green">Organization Name</p>
                                  <p className="font-display text-sm font-bold text-zinc-900 dark:text-white">{result.registrar.companyName}</p>
                                  {result.registrar.companyWebsite && (
                                    <a href={result.registrar.companyWebsite} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-trust-green hover:underline mt-1 block">
                                      {result.registrar.companyWebsite.replace(/^https?:\/\//, '')}
                                    </a>
                                  )}
                                </div>
                                <div>
                                  <p className="font-mono text-[8px] text-zinc-400 uppercase tracking-widest mb-1.5 text-trust-green">Corporate Contact</p>
                                  <p className="font-display text-sm font-bold text-zinc-900 dark:text-white">{result.registrar.companyEmail || 'N/A'}</p>
                                  {result.registrar.companyRegistration && (
                                    <p className="font-mono text-[10px] text-zinc-500 mt-1 uppercase">ID: {result.registrar.companyRegistration}</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                         </div>

                         <div className="space-y-6">
                           <div className="p-5 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-white/5">
                              <div className="flex items-center gap-2 mb-3 text-zinc-400">
                                <Fingerprint className="w-3.5 h-3.5" />
                                <span className="font-mono text-[8px] font-black uppercase tracking-widest text-[8px]">Index Hash</span>
                              </div>
                              <p className="font-mono text-[10px] text-zinc-500 break-all uppercase tracking-tighter line-clamp-2">
                                {result.registryId || result.hash || 'NOTARIZED_LOG'}
                              </p>
                           </div>

                           <div className="p-5 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-white/5">
                              <div className="flex items-center gap-2 mb-3 text-zinc-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-mono text-[8px] font-black uppercase tracking-widest text-[8px]">Persistence</span>
                              </div>
                              <p className={`font-display text-sm font-bold truncate ${(result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'text-yellow-600' : 'text-zinc-600 dark:text-zinc-300'}`}>
                                {(result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'Protocol Revoked' : (result.expiryDate ? new Date(result.expiryDate).toLocaleDateString() : 'Permanent')}
                              </p>
                           </div>
                         </div>
                      </div>

                      {result.type === 'registry' && result.description && (
                        <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-2xl mb-8 relative italic">
                           <Quote className="absolute top-4 right-4 w-10 h-10 text-trust-green/5" />
                           <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed relative z-10">
                             &quot;{result.description}&quot;
                           </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-zinc-400">
                         <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-trust-green animate-pulse" />
                            <span className="font-mono text-[9px] uppercase tracking-widest">Genesis: {new Date(result.createdAt).toLocaleDateString()}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            <span className="font-mono text-[9px] uppercase tracking-widest">{result.userEmail}</span>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

          </section>

          <section className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 overflow-hidden rounded-3xl relative group transition-all">
            <div className="p-8 lg:p-10 flex flex-col sm:flex-row items-center gap-8">
              <div className="shrink-0">
                <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-2xl flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div>
                <p className="font-mono text-[8px] font-black text-red-500 uppercase tracking-[0.3em] mb-2">Security Protocol</p>
                <h4 className="font-display font-black text-2xl text-zinc-900 dark:text-white mb-2 uppercase tracking-tight">Active Integrity Shield</h4>
                <p className="font-sans text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed font-medium">
                  Artifact analysis is governed by <span className="text-zinc-950 dark:text-white font-bold">SHA-256</span>. Any deviation from recorded substrate records triggers immediate revocation.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
