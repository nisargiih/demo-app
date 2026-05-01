'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Upload, 
  Search, 
  FileCheck, 
  XCircle, 
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  Clock,
  User,
  ExternalLink,
  Archive,
  Fingerprint
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';

export default function VerifyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'file' | 'id'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [registryId, setRegistryId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'authentic' | 'tampered' | 'unindexed' | null>(null);
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
      const hash = await calculateHash(file);
      setCurrentHash(hash);
      
      const res = await fetch(`/api/hashes?hash=${hash}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setResult({...data, type: 'hash'});
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

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-4xl mx-auto py-12 lg:py-20">
        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-16 h-16 bg-trust-green/10 rounded-2xl flex items-center justify-center text-trust-green mx-auto mb-6"
          >
            <ShieldCheck className="w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold text-zinc-900 mb-2"
          >
            Verification Protocol
          </motion.h1>
          <p className="font-sans text-zinc-500">Authenticate any document against the TechCore decentralized ledger.</p>
        </header>

        <div className="grid grid-cols-1 gap-8">
          <div className="flex justify-center mb-4">
            <div className="bg-zinc-100 p-1 rounded-2xl flex gap-1">
              <button 
                onClick={() => { setActiveTab('file'); setResult(null); setVerificationStatus(null); }}
                className={`px-6 py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-widest transition-all ${
                  activeTab === 'file' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                File Verification
              </button>
              <button 
                onClick={() => { setActiveTab('id'); setResult(null); setVerificationStatus(null); }}
                className={`px-6 py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-widest transition-all ${
                  activeTab === 'id' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Registry ID Search
              </button>
            </div>
          </div>

          <section className="bg-white border border-zinc-100 rounded-[3rem] p-8 lg:p-12 shadow-xl shadow-zinc-100/50">
            {!result && !isVerifying ? (
              <div className="space-y-8">
                {activeTab === 'file' ? (
                  <div className="relative group">
                    <input 
                      type="file" 
                      onChange={onFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-zinc-100 group-hover:border-trust-green/50 rounded-[2.5rem] py-16 px-8 transition-all bg-zinc-50/50 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm ring-4 ring-zinc-50 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-zinc-300 group-hover:text-trust-green transition-colors" />
                      </div>
                      <p className="font-display font-bold text-lg text-zinc-900 mb-2">
                        {file ? file.name : 'Drop document to authenticate'}
                      </p>
                      <p className="font-sans text-sm text-zinc-400">
                        {file ? `${(file.size / 1024).toFixed(1)} KB recognized` : 'Supports PDF, DOCX, IMG, and more'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-10 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 flex flex-col items-center justify-center text-center">
                       <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                          <Fingerprint className="w-8 h-8 text-trust-green" />
                       </div>
                       <h3 className="font-display font-bold text-xl text-zinc-900 mb-4">Registry ID Lookup</h3>
                       <div className="w-full max-w-sm relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-trust-green transition-colors" />
                          <input 
                            type="text" 
                            placeholder="Enter Registry ID (e.g. TC-9021-X)"
                            value={registryId}
                            onChange={(e) => setRegistryId(e.target.value.toUpperCase())}
                            className="w-full h-14 pl-12 pr-4 bg-white border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-mono text-sm transition-all"
                          />
                       </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={activeTab === 'file' ? handleVerify : handleVerifyId}
                  disabled={activeTab === 'file' ? !file : !registryId}
                  className="w-full h-16 bg-trust-green text-white rounded-[1.25rem] font-display font-bold text-lg flex items-center justify-center gap-3 hover:bg-trust-green/90 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all shadow-xl shadow-trust-green/20"
                >
                  {activeTab === 'file' ? 'Initiate Scan' : 'Query Registry'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : isVerifying ? (
              <div className="py-20 text-center space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                   <div className="absolute inset-0 border-4 border-trust-green/20 border-t-trust-green rounded-full animate-spin" />
                   <div className="absolute inset-4 border-4 border-zinc-100 border-b-zinc-400 rounded-full animate-spin-reverse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-zinc-900">Cryptographic Analysis...</h3>
                  <p className="font-mono text-[10px] text-zinc-400 tracking-[0.2em] font-bold mt-2 uppercase animate-pulse">Running SHA256 Algorithm</p>
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                {verificationStatus === 'unindexed' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-50 border border-zinc-200/50 rounded-[3rem] p-12 lg:p-20 text-center"
                  >
                    <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                      <Archive className="w-10 h-10 text-zinc-300" />
                    </div>
                    <h3 className="font-display font-bold text-3xl text-zinc-900 mb-3 tracking-tight">Identity Not Found</h3>
                    <p className="font-sans text-zinc-500 mb-10 max-w-sm mx-auto leading-relaxed text-sm">
                      The document fingerprint or Registry ID could not be located across our decentralized cryptographic nodes.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button 
                        onClick={() => { setResult(null); setVerificationStatus(null); setFile(null); setRegistryId(''); }}
                        className="h-14 px-10 bg-zinc-900 text-white rounded-2xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20"
                      >
                        Reset Protocol
                      </button>
                      <button 
                        onClick={() => router.push('/notarize')}
                        className="h-14 px-10 bg-white text-zinc-900 border border-zinc-200 rounded-2xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-50 transition-all"
                      >
                        Initialize Notarization
                      </button>
                    </div>
                  </motion.div>
                ) : verificationStatus === 'tampered' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50/30 border border-red-100 rounded-[3rem] p-8 lg:p-12"
                  >
                    <div className="flex flex-col lg:flex-row gap-10">
                       <div className="shrink-0 flex flex-col items-center">
                          <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-sm ring-8 ring-red-500/5">
                            <XCircle className="w-12 h-12 text-red-500" />
                          </div>
                          <div className="mt-6 px-4 py-1.5 bg-red-500 text-white rounded-full font-mono text-[9px] font-black uppercase tracking-widest">
                             CRITICAL_MATCH_FAIL
                          </div>
                      </div>

                      <div className="flex-1 space-y-8">
                        <div>
                          <h3 className="font-display font-extrabold text-4xl text-zinc-900 mb-2 tracking-tight">Integrity Breach</h3>
                          <p className="font-sans text-red-500 font-bold uppercase text-[10px] tracking-[0.2em]">Cryptographic Mismatch Detected</p>
                        </div>
                        
                        <div className="p-6 bg-white/60 backdrop-blur-sm border border-red-100 rounded-[2rem]">
                          <div className="flex items-start gap-4">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="font-sans text-sm text-red-900/80 leading-relaxed">
                              <span className="font-bold">Security Analysis:</span> The document identifier matches a known entry, but the content payload has been modified from its original state. This file is no longer authentic.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-5 bg-white border border-zinc-100 rounded-2xl">
                            <p className="font-mono text-[9px] text-zinc-400 uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                              <ShieldCheck className="w-3 h-3 text-trust-green" /> Stored Immutable Hash
                            </p>
                            <p className="font-mono text-[11px] text-zinc-900 break-all bg-zinc-50 p-3 rounded-lg border border-zinc-100">{result.hash}</p>
                          </div>
                          <div className="p-5 bg-red-50/50 border border-red-100 rounded-2xl">
                            <p className="font-mono text-[9px] text-red-400 uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                              <RefreshCw className="w-3 h-3 text-red-500" /> Current Upload Fragment
                            </p>
                            <p className="font-mono text-[11px] text-red-600 break-all bg-white/50 p-3 rounded-lg border border-red-100">{currentHash}</p>
                          </div>
                        </div>

                        <button 
                          onClick={() => { setFile(null); setRegistryId(''); setResult(null); setVerificationStatus(null); }}
                          className="font-display font-bold text-[10px] uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-all flex items-center gap-2"
                        >
                           Terminate Audit <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-trust-green/[0.03] border border-trust-green/10 rounded-[3.5rem] p-8 lg:p-14 relative overflow-hidden"
                  >
                    {/* Decorative Pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-trust-green/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row gap-12 lg:items-start">
                      <div className="shrink-0 flex flex-col items-center lg:items-start">
                        <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.15)] ring-8 ring-trust-green/5 mb-6">
                          {result.type === 'registry' ? 
                            <Archive className="w-14 h-14 text-trust-green" /> : 
                            <ShieldCheck className="w-14 h-14 text-trust-green" />
                          }
                        </div>
                        <div className="px-4 py-1.5 bg-trust-green text-white rounded-full font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                           <CheckCircle2 className="w-3.5 h-3.5" />
                           Authentic
                        </div>
                      </div>

                      <div className="flex-1 space-y-8">
                        <div>
                          <div className="flex items-center gap-3 mb-2 text-trust-green">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 bg-trust-green/5 rounded">Verified Status</span>
                          </div>
                          <h3 className="font-display font-extrabold text-4xl lg:text-5xl text-zinc-900 tracking-tight leading-[0.95]">
                            {result.type === 'registry' ? 'Registered Ledger Entry' : 'Cryptographic Match Found'}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { 
                              label: 'Document Alias', 
                              value: result.name || result.fileName, 
                              icon: FileText,
                              type: 'text'
                            },
                            { 
                              label: 'Registrar / Issuer', 
                              value: result.userEmail, 
                              icon: User,
                              type: 'text'
                            },
                            { 
                              label: result.type === 'registry' ? 'Registry Protocol ID' : 'Expiry Status', 
                              value: result.type === 'registry' ? result.registryId : (result.expiryDate ? new Date(result.expiryDate).toLocaleDateString() : 'Permanent Index'), 
                              icon: result.type === 'registry' ? Fingerprint : Clock,
                              type: 'mono'
                            },
                            { 
                              label: 'Timestamp (UTC)', 
                              value: new Date(result.createdAt).toLocaleString(), 
                              icon: Clock,
                              type: 'text'
                            }
                          ].map((card, i) => (
                            <div key={i} className="p-5 bg-white/60 backdrop-blur-sm border border-white rounded-3xl shadow-sm group">
                              <div className="flex items-center gap-2 mb-3 text-zinc-400 group-hover:text-trust-green transition-colors">
                                <card.icon className="w-4 h-4" />
                                <span className="font-mono text-[9px] font-bold uppercase tracking-widest">{card.label}</span>
                              </div>
                              <p className={`font-display font-bold ${card.type === 'mono' ? 'font-mono text-xs' : 'text-sm'} text-zinc-900 truncate`}>
                                {card.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-4">
                           <div className="p-6 bg-zinc-950 rounded-[2rem] text-white overflow-hidden relative group">
                              {/* Inner glow */}
                              <div className="absolute inset-0 bg-gradient-to-r from-trust-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              
                              <div className="flex items-center justify-between mb-3 relative z-10">
                                <div className="flex items-center gap-2">
                                  <Fingerprint className="w-4 h-4 text-trust-green" />
                                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Notarization_Signature</span>
                                </div>
                                <span className="font-mono text-[8px] font-bold text-trust-green py-0.5 px-2 border border-trust-green/30 rounded uppercase">Verified</span>
                              </div>
                              <p className="font-mono text-[11px] text-zinc-400 break-all leading-relaxed relative z-10 font-medium">
                                {result.type === 'registry' ? result.fileKey : result.hash}
                              </p>
                           </div>

                           {result.type === 'registry' && result.description && (
                             <div className="p-6 bg-white/40 border border-zinc-100 rounded-[2rem]">
                                <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest block mb-1">Audit Notes</span>
                                <p className="font-sans text-sm text-zinc-600 italic leading-relaxed">&quot;{result.description}&quot;</p>
                             </div>
                           )}
                        </div>

                        <div className="flex items-center justify-between pt-4">
                          <p className="font-sans text-[10px] text-zinc-400 flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-trust-green" />
                            Verification protocol concluded with 100% integrity.
                          </p>
                          <button 
                            onClick={() => { setFile(null); setRegistryId(''); setResult(null); setVerificationStatus(null); }}
                            className="font-display font-bold text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-all flex items-center gap-2"
                          >
                             Close Audit <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

          </section>

          <section className="bg-zinc-50 p-8 rounded-[3rem] border border-zinc-100 flex flex-col md:flex-row items-center gap-8">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shrink-0 shadow-sm ring-4 ring-zinc-100">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h4 className="font-display font-bold text-xl text-zinc-900 mb-2">Technical Assurance</h4>
              <p className="font-sans text-sm text-zinc-500 leading-relaxed max-w-2xl">
                Verification checks compare the binary fingerprint of the uploaded file with our immutable ledger. 
                Even a single bit of difference will result in an &quot;Authenticity Void&quot; status.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
