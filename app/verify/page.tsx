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

        <header className="mb-20 text-center relative">
          {/* Atmospheric Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-trust-green/10 blur-[160px] rounded-full pointer-events-none opacity-50" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-28 h-28 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] flex items-center justify-center text-zinc-950 dark:text-white mx-auto mb-10 shadow-2xl relative group"
          >
            <div className="absolute inset-0 bg-trust-green/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            {nodeInfo ? <Globe className="w-14 h-14 relative z-10 text-trust-green" /> : <ShieldCheck className="w-14 h-14 relative z-10 text-trust-green" />}
          </motion.div>
          
          {nodeInfo ? (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-3 px-6 py-2 bg-trust-green/10 dark:bg-trust-green/5 border border-trust-green/20 dark:border-trust-green/10 text-trust-green rounded-full font-mono text-[10px] font-black uppercase tracking-[0.3em] shadow-sm"
              >
                <div className="w-2 h-2 bg-trust-green rounded-full animate-pulse" />
                Verified Node Authority
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-7xl lg:text-9xl font-black text-zinc-950 dark:text-white tracking-tighter leading-[0.8] uppercase max-w-4xl mx-auto"
              >
                {nodeInfo.companyName || `${nodeInfo.firstName} ${nodeInfo.lastName}`}
              </motion.h1>
              <div className="flex items-center justify-center gap-4 text-zinc-500 dark:text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                <span>{nodeInfo.entityType || 'Registrar Node'}</span>
                <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
                <span>Substrate Alpha</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-7xl lg:text-9xl font-black text-zinc-950 dark:text-white mb-6 tracking-tighter leading-[0.8] uppercase"
              >
                Verify<br />Protocol
              </motion.h1>
              <p className="font-sans text-zinc-600 dark:text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                 Official gateway for cryptographic artifact authentication and decentralized record retrieval.
              </p>
            </div>
          )}
        </header>

        <div className="max-w-4xl mx-auto space-y-12">
          {/* Node Stats - Condensed version of the card */}
          {nodeInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-1 ring-1 ring-zinc-200 dark:ring-white/5 rounded-[2rem] overflow-hidden bg-white dark:bg-zinc-900 shadow-lg shadow-zinc-200/50 dark:shadow-none transition-all"
            >
              {[
                { label: 'Authority', value: 'Level 2 Node', icon: ShieldCheck },
                { label: 'Status', value: 'Live 100%', icon: Globe },
                { label: 'Identity', value: nodeInfo.entityType || 'Registrar', icon: User },
              ].map((stat, i) => (
                <div key={i} className="p-8 bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-white/5 last:border-r-0 flex flex-col items-center justify-center text-center group hover:bg-white dark:hover:bg-zinc-800 transition-colors">
                  <stat.icon className="w-6 h-6 text-zinc-500 dark:text-zinc-500 mb-3 group-hover:text-trust-green transition-colors" />
                  <p className="font-mono text-[9px] text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-1 font-bold">{stat.label}</p>
                  <p className="font-display font-black text-zinc-900 dark:text-white text-sm uppercase tracking-wider">{stat.value}</p>
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

          <section className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-zinc-200 dark:border-white/5 rounded-[4rem] p-10 lg:p-16 shadow-2xl shadow-zinc-200/50 dark:shadow-none relative overflow-hidden group transition-all">
            {/* Ambient Animated Glow */}
            <div className={`absolute -top-24 -right-24 w-96 h-96 blur-[120px] rounded-full transition-colors duration-1000 ${activeTab === 'file' ? 'bg-trust-green/10' : 'bg-blue-500/10'}`} />
            <div className={`absolute -bottom-24 -left-24 w-96 h-96 blur-[120px] rounded-full transition-colors duration-1000 ${activeTab === 'file' ? 'bg-trust-green/5' : 'bg-blue-500/5'}`} />

            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 p-6 bg-red-500/5 border border-red-500/20 text-red-500 rounded-3xl text-[11px] font-black uppercase tracking-[0.25em] flex items-center gap-5 shadow-sm"
              >
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span>{error}</span>
              </motion.div>
            )}

            {!result && !isVerifying ? (
              <div className="space-y-12">
                {activeTab === 'file' ? (
                  <div className="relative group/upload">
                    <input 
                      type="file" 
                      onChange={onFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-zinc-200 dark:border-white/10 group-hover/upload:border-trust-green/40 group-hover/upload:bg-trust-green/[0.02] rounded-[3.5rem] py-32 px-10 transition-all duration-700 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-trust-green/[0.01] to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity duration-1000" />
                      <div className="w-28 h-28 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl group-hover/upload:scale-110 group-hover/upload:rotate-6 transition-all duration-700 relative z-10">
                        <Upload className="w-12 h-12 text-zinc-400 dark:text-zinc-600 group-hover/upload:text-trust-green transition-colors" />
                      </div>
                      <p className="font-display font-black text-4xl text-zinc-900 dark:text-white mb-4 relative z-10 uppercase tracking-tighter">
                        {file ? file.name : 'Ingest Artifact'}
                      </p>
                      <p className="font-sans text-lg text-zinc-600 dark:text-zinc-400 max-w-sm text-center leading-relaxed font-medium relative z-10">
                        {file ? `Signature payload: ${(file.size / 1024).toFixed(1)} KB. Awaiting authorization.` : 'Transmit cryptographic asset for substrate consensus evaluation.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="p-20 bg-zinc-50/50 dark:bg-zinc-950/30 rounded-[3.5rem] border border-zinc-100 dark:border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden group/id">
                       <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.02] to-transparent pointer-events-none" />
                       <div className="w-28 h-28 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/10 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl relative z-10 group-hover/id:scale-110 transition-transform duration-700">
                          <Fingerprint className="w-14 h-14 text-trust-green" />
                       </div>
                       <h3 className="font-display font-black text-4xl text-zinc-900 dark:text-white mb-10 uppercase tracking-tight relative z-10">Network Address</h3>
                       <div className="w-full max-w-lg relative group/input z-10">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-zinc-400 dark:text-zinc-600 group-focus-within/input:text-trust-green transition-all" />
                          <input 
                            type="text" 
                            placeholder="TC-PROTOCOL-ALPHA-V1"
                            value={registryId}
                            onChange={(e) => setRegistryId(e.target.value.toUpperCase())}
                            className="w-full h-24 pl-20 pr-8 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-white/10 rounded-[2rem] focus:outline-none focus:border-trust-green text-zinc-900 dark:text-white font-mono text-2xl tracking-[0.25em] shadow-xl transition-all"
                          />
                       </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={activeTab === 'file' ? handleVerify : handleVerifyId}
                  disabled={activeTab === 'file' ? !file : !registryId}
                  className={`w-full h-28 rounded-[2.5rem] font-display font-black text-3xl uppercase tracking-[0.25em] flex items-center justify-center gap-8 transition-all duration-700 shadow-2xl dark:shadow-none relative overflow-hidden group/btn active:scale-[0.98] ${
                    (activeTab === 'file' ? !file : !registryId)
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                    : 'bg-zinc-900 dark:bg-trust-green text-white dark:text-zinc-950 hover:shadow-trust-green/20'
                  }`}
                >
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 scale-x-0 group-hover/btn:scale-x-100 transition-transform origin-left duration-700" />
                  {activeTab === 'file' ? 'Analyze Pattern' : 'Query Registry'}
                  <ArrowRight className="w-10 h-10 group-hover/btn:translate-x-3 transition-transform duration-500" />
                </button>
              </div>
            ) : isVerifying ? (
              <div className="py-32 text-center space-y-16">
                <div className="relative w-48 h-48 mx-auto">
                   <div className="absolute inset-0 border-[8px] border-zinc-100 dark:border-white/5 border-t-trust-green rounded-full animate-spin" />
                   <div className="absolute inset-10 border-[8px] border-zinc-50 dark:border-white/5 border-b-zinc-200 dark:border-zinc-800 rounded-full animate-spin-reverse" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <ShieldCheck className="w-20 h-20 text-trust-green opacity-50 animate-pulse" />
                   </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-display font-black text-5xl text-zinc-950 dark:text-white tracking-widest uppercase">Analyzing</h3>
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-2 h-2 bg-trust-green rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-trust-green rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-trust-green rounded-full animate-bounce" />
                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500 tracking-[0.5em] font-black uppercase ml-4">Grid Consensus Check</p>
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
                    className="bg-red-500/[0.04] dark:bg-red-500/[0.02] border-4 border-red-500/20 rounded-[4rem] p-16 lg:p-24 text-center relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500/[0.08] via-transparent to-transparent pointer-events-none" />
                    <div className="w-36 h-36 bg-white dark:bg-zinc-900 border-2 border-red-500/30 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative z-10 rotate-12">
                      <Archive className="w-16 h-16 text-red-500" />
                    </div>
                    <h3 className="font-display font-black text-6xl text-red-600 dark:text-red-500 mb-8 uppercase tracking-tighter relative z-10">Unrecognized Hash</h3>
                    <p className="font-sans text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed text-2xl font-medium relative z-10">
                      The cryptographic fingerprint requested is <span className="text-red-600 font-black">completely absent</span> from the TechCore sovereign substrate. This asset has no recorded origin or has been structurally compromised.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
                      <button 
                        onClick={() => { setResult(null); setVerificationStatus(null); setFile(null); setRegistryId(''); setError(null); }}
                        className="h-20 px-16 bg-red-600 text-white border border-red-500/20 rounded-3xl font-display font-black text-sm uppercase tracking-[0.3em] hover:bg-red-700 transition-all shadow-2xl shadow-red-500/20 active:scale-95"
                      >
                        Reset Authority Gateway
                      </button>
                    </div>
                  </motion.div>
                ) : verificationStatus === 'mismatch' ? (
                   <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-500/10 rounded-[4rem] p-16 lg:p-24 text-center"
                  >
                    <div className="w-32 h-32 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-500/20 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-xl">
                      <AlertTriangle className="w-14 h-14 text-red-500" />
                    </div>
                    <h3 className="font-display font-black text-5xl text-red-600 dark:text-red-500 mb-6 uppercase tracking-tighter">Security Conflict</h3>
                    <p className="font-sans text-zinc-600 dark:text-zinc-400 mb-12 max-w-xl mx-auto leading-relaxed text-xl font-medium">
                      Authentication Denied. This record is registered to a different authority node. Gateway isolation active.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                      <button 
                        onClick={() => { setResult(null); setVerificationStatus(null); setFile(null); setRegistryId(''); setError(null); }}
                        className="h-16 px-12 bg-zinc-100 dark:bg-trust-green text-zinc-900 dark:text-zinc-950 rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] hover:bg-zinc-200 dark:hover:bg-trust-green/90 transition-all shadow-xl dark:shadow-none"
                      >
                        Terminate Search
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`border-2 rounded-[4rem] p-10 lg:p-16 relative overflow-hidden shadow-xl dark:shadow-none transition-all ${
                      (result?.expiryDate && new Date(result.expiryDate) < new Date()) 
                        ? 'bg-red-500/[0.02] border-red-500/20' 
                        : 'bg-trust-green/[0.01] dark:bg-trust-green/[0.02] border-trust-green/10'
                    }`}
                  >
                    {/* Decorative Background Elements */}
                    <div className={`absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full -mr-[250px] -mt-[250px] ${
                      (result?.expiryDate && new Date(result.expiryDate) < new Date()) 
                        ? 'bg-red-500/[0.05]' 
                        : 'bg-trust-green/[0.03]'
                    }`} />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-zinc-50 dark:bg-zinc-950 blur-[100px] rounded-full -ml-[200px] -mb-[200px]" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row gap-16 lg:items-start">
                      <div className="shrink-0 flex flex-col items-center lg:items-start">
                        <div className={`w-40 h-40 bg-white dark:bg-zinc-900 rounded-[3.5rem] flex items-center justify-center shadow-xl ring-[16px] mb-8 group overflow-hidden border ${
                          (result?.expiryDate && new Date(result.expiryDate) < new Date())
                            ? 'ring-red-500/[0.05] border-red-500/20'
                            : 'ring-zinc-50 dark:ring-zinc-950/50 border-zinc-100 dark:border-white/5'
                        }`}>
                          {result.type === 'registry' ? 
                            <Archive className={`w-16 h-16 transition-transform duration-700 group-hover:scale-110 ${
                              (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'text-red-500' : 'text-trust-green'
                            }`} /> : 
                            <ShieldCheck className={`w-16 h-16 transition-transform duration-700 group-hover:scale-110 ${
                              (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'text-red-500' : 'text-trust-green'
                            }`} />
                          }
                        </div>
                        <div className="w-full text-center space-y-4">
                          <div className={`px-6 py-2 rounded-2xl font-mono text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3 shadow-lg ${
                            (result?.expiryDate && new Date(result.expiryDate) < new Date())
                              ? 'bg-red-500 text-white shadow-red-500/20'
                              : result.registrar?.verificationStatus === 'verified' 
                                ? 'bg-trust-green text-zinc-950 shadow-trust-green/20' 
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shadow-none'
                          }`}>
                             {(result?.expiryDate && new Date(result.expiryDate) < new Date()) ? (
                               <>
                                 <AlertTriangle className="w-4 h-4" />
                                 DECOMMISSIONED
                               </>
                             ) : (
                               <>
                                 {result.registrar?.verificationStatus === 'verified' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                 {result.registrar?.verificationStatus === 'verified' ? 'TRUSTED AUTH' : 'UNVERIFIED NODE'}
                               </>
                             )}
                          </div>

                          {result.fileKey && (
                            <button 
                              onClick={() => handleDownload(result.fileKey, result.docName || result.fileName)}
                              className="w-full h-14 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl flex items-center justify-center gap-3 font-display font-black text-[10px] uppercase tracking-[0.2em] text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm dark:shadow-none group/dl"
                            >
                              <Archive className={`w-4 h-4 group-hover/dl:scale-110 transition-transform ${
                                (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'text-red-500' : 'text-trust-green'
                              }`} />
                              Fetch Artifact
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 space-y-8">
                        <div>
                          <div className="flex items-center gap-4 mb-4">
                            <span className={`font-mono text-[9px] font-black uppercase tracking-[0.4em] px-3 py-1 rounded-lg border ${
                              (result?.expiryDate && new Date(result.expiryDate) < new Date())
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-trust-green/10 text-trust-green border-trust-green/20'
                            }`}>Protocol.Alpha</span>
                            <div className="h-[1px] flex-1 bg-zinc-100 dark:bg-white/10" />
                          </div>
                          <h3 className="font-display font-black text-5xl lg:text-7xl text-zinc-900 dark:text-white tracking-tighter leading-[0.85] uppercase mb-2">
                            {(result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'Invalid' : 'Authentic'}<br />Artifact {result.type === 'registry' ? 'Record' : 'Pulse'}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { 
                              label: 'Asset Title', 
                              value: result.docName || result.name || result.fileName || 'Archive Data', 
                              icon: FileText,
                              color: 'text-zinc-900 dark:text-white font-bold text-lg'
                            },
                            { 
                              label: 'Authority Node', 
                              value: result.registrar?.companyName || `${result.registrar?.firstName} ${result.registrar?.lastName}` || result.userEmail, 
                              icon: Building2,
                              color: (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'text-red-500' : 'text-trust-green font-bold'
                            },
                            { 
                              label: 'Fingerprint ID', 
                              value: result.registryId || 'NOTARIZED_LOG', 
                              icon: Fingerprint,
                              color: 'font-mono text-xs text-zinc-500 uppercase tracking-widest'
                            },
                            { 
                              label: 'Persistence Status', 
                              value: (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'EXPIRED / REVOKED' : (result.expiryDate ? 'TEMPORAL' : 'PERMANENT'), 
                              icon: Clock,
                              color: (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'text-red-500 font-black' : 'text-zinc-500'
                            }
                          ].map((card, i) => (
                            <div key={i} className="p-6 bg-white dark:bg-zinc-800/20 border border-zinc-100 dark:border-white/5 rounded-[2rem] shadow-sm group hover:border-trust-green/30 transition-all flex flex-col justify-between h-full">
                              <div className="flex items-center gap-2 mb-3 text-zinc-400 dark:text-zinc-600">
                                <card.icon className="w-4 h-4" />
                                <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em]">{card.label}</span>
                              </div>
                              <p className={`font-display ${card.color} break-words line-clamp-2`}>
                                {card.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="p-8 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-white/5 rounded-[2.5rem] relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <ShieldCheck className="w-16 h-16 text-trust-green" />
                          </div>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-trust-green/10 rounded-xl flex items-center justify-center border border-trust-green/20">
                              <User className="w-4 h-4 text-trust-green" />
                            </div>
                            <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Node Administrator</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                               <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mb-1">Identity</p>
                               <p className="text-zinc-900 dark:text-zinc-100 font-display font-bold">{result.registrar?.firstName} {result.registrar?.lastName}</p>
                               <p className="text-zinc-500 text-[11px] font-mono mt-1">{result.userEmail}</p>
                             </div>
                             {result.registrar?.companyName && (
                               <div>
                                 <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mb-1">Affiliation</p>
                                 <p className={`font-display font-black text-sm uppercase tracking-wider ${
                                   (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'text-red-500' : 'text-trust-green'
                                 }`}>
                                   {result.registrar?.companyName}
                                 </p>
                               </div>
                             )}
                          </div>
                        </div>

                        {result.type === 'registry' && result.description && (
                          <div className="p-10 bg-white dark:bg-zinc-800/40 border border-zinc-100 dark:border-white/5 rounded-[3rem] shadow-sm relative overflow-hidden group/quote">
                            <Quote className="absolute top-6 right-6 w-16 h-16 text-trust-green/5 group-hover/quote:text-trust-green/10 transition-colors" />
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                              <div className="w-1 h-8 bg-trust-green rounded-full" />
                              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-black">Official Attestation</span>
                            </div>
                            <p className="font-sans text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed relative z-10 font-medium italic">
                              &quot;{result.description}&quot;
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-zinc-100 dark:border-white/5">
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
                              (result?.expiryDate && new Date(result.expiryDate) < new Date())
                                ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                                : 'bg-trust-green/10 border-trust-green/20 text-trust-green'
                            }`}>
                              { (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? <AlertTriangle className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" /> }
                            </div>
                            <div>
                               <p className={`font-display font-black text-sm uppercase tracking-[0.2em] ${
                                 (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'text-red-500' : 'text-zinc-900 dark:text-white'
                               }`}>
                                 { (result?.expiryDate && new Date(result.expiryDate) < new Date()) ? 'Validity Expired' : 'Protocol Secured' }
                               </p>
                               <p className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Genesis: {new Date(result.createdAt).toLocaleDateString()} {new Date(result.createdAt).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => { setFile(null); setRegistryId(''); setResult(null); setVerificationStatus(null); setError(null); }}
                            className="h-16 px-12 bg-zinc-900 dark:bg-zinc-800 text-white rounded-[2rem] font-display font-black text-[11px] uppercase tracking-[0.4em] hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-all flex items-center gap-4 group/close active:scale-95"
                          >
                             Terminate Analysis <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                          </button>
                        </div>

                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

          </section>

          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 overflow-hidden rounded-[3rem] shadow-2xl shadow-zinc-200/50 dark:shadow-none relative group transition-all">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-transparent opacity-20" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch">
              <div className="p-12 lg:p-16 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-white/5">
                <div className="w-24 h-24 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
                  <AlertTriangle className="w-12 h-12 text-zinc-950 dark:text-white" />
                </div>
              </div>
              <div className="p-12 lg:p-16 flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-mono text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Global Assurance Protocol</span>
                </div>
                <h4 className="font-display font-black text-4xl text-zinc-900 dark:text-white mb-6 uppercase tracking-tighter leading-none">Security Inflow Control</h4>
                <p className="font-sans text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl font-medium">
                  This gateway enforces strict <span className="text-zinc-950 dark:text-white font-bold">256-bit SHA-2</span> cryptographic analysis. Any modification to the substrate records, however minute, will result in immediate <span className="text-red-600 dark:text-red-500 font-bold">Authority Lockdown</span> and revocation of verification metadata.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
