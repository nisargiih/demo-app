'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Upload, 
  Search, 
  FileCheck, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  Clock,
  User,
  ExternalLink
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
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
      
      const email = localStorage.getItem('authenticated_user_email');
      const res = await fetch(`/api/hashes?hash=${hash}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setResult(data);
          setVerificationStatus('authentic');
        } else {
          // Check if file with same name exists but different hash
          const historyRes = await fetch(`/api/hashes?email=${encodeURIComponent(email || '')}`);
          if (historyRes.ok) {
            const body = await historyRes.json();
            const history = SecurityService.processFromTransit(body);
            const nameMatch = history.find((h: any) => h.fileName === file.name);
            if (nameMatch) {
              setResult(nameMatch);
              setVerificationStatus('tampered');
            } else {
              setResult('NOT_FOUND');
              setVerificationStatus('unindexed');
            }
          } else {
            setResult('NOT_FOUND');
            setVerificationStatus('unindexed');
          }
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
          <section className="bg-white border border-zinc-100 rounded-[3rem] p-8 lg:p-12 shadow-xl shadow-zinc-100/50">
            {!result && !isVerifying ? (
              <div className="space-y-8">
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

                <button 
                  onClick={handleVerify}
                  disabled={!file}
                  className="w-full h-16 bg-trust-green text-white rounded-[1.25rem] font-display font-bold text-lg flex items-center justify-center gap-3 hover:bg-trust-green/90 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all shadow-xl shadow-trust-green/20"
                >
                  Initiate Scan
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
                  <div className="bg-amber-50/50 border border-amber-100 rounded-[2.5rem] p-10 text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-amber-500" />
                    </div>
                    <div className="flex justify-center mb-4">
                      <div className="px-3 py-1 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-amber-500/10 text-amber-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Unindexed Record
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-2xl text-zinc-900 mb-2">Registry Mismatch</h3>
                    <p className="font-sans text-zinc-500 max-w-md mx-auto">This document fingerprint does not exist in the TechCore repository. This could be a new document or a version that was never notarized.</p>
                  </div>
                ) : verificationStatus === 'tampered' ? (
                  <div className="bg-red-50/50 border border-red-100 rounded-[2.5rem] p-10">
                    <div className="flex flex-col md:flex-row gap-10">
                       <div className="shrink-0 text-center md:text-left">
                          <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto shadow-sm ring-4 ring-red-500/10">
                            <XCircle className="w-12 h-12 text-red-500" />
                          </div>
                      </div>
                      <div className="flex-1 space-y-6">
                        <div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <div className="px-3 py-1 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-red-500/10 text-red-500">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              Tamper Detected
                            </div>
                            <div className="px-3 py-1 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500">
                              Checksum Logic Fail
                            </div>
                          </div>
                          <h3 className="font-display font-bold text-3xl text-zinc-900 mb-1">Integrity Compromised</h3>
                          <p className="font-sans text-sm text-red-500 font-bold">Document Content Modified After Registration</p>
                        </div>
                        
                        <div className="p-4 bg-red-50/30 border border-red-100 rounded-2xl">
                          <p className="font-sans text-xs text-red-700 leading-relaxed">
                            <span className="font-bold">Security Analysis:</span> The filename &quot;{result.fileName}&quot; matches an existing entry, but the cryptographic hash is invalid. This indicates the file contents have been altered from the original notarized version.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="p-4 bg-white border border-zinc-100 rounded-xl">
                            <p className="font-mono text-[9px] text-zinc-400 uppercase font-bold tracking-widest mb-1">Original Hash (Stored)</p>
                            <p className="font-mono text-[10px] text-zinc-600 break-all">{result.hash}</p>
                          </div>
                          <div className="p-4 bg-red-50/50 border border-red-200 rounded-xl">
                            <p className="font-mono text-[9px] text-red-400 uppercase font-bold tracking-widest mb-1">Current Hash (Uploaded)</p>
                            <p className="font-mono text-[10px] text-red-600 break-all">{currentHash}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-trust-green/5 border border-trust-green/10 rounded-[2.5rem] p-10">
                    <div className="flex flex-col md:flex-row gap-10">
                       <div className="shrink-0 text-center md:text-left">
                          <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto shadow-sm ring-4 ring-trust-green/10">
                            <FileCheck className="w-12 h-12 text-trust-green" />
                          </div>
                      </div>
                      <div className="flex-1 space-y-6">
                        <div>
                          <h3 className="font-display font-bold text-3xl text-zinc-900 mb-1">Authenticity Confirmed</h3>
                          <p className="font-sans text-sm text-trust-green font-bold">Document Match Found in Ledger</p>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                          <div className={`px-3 py-1 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-trust-green/10 text-trust-green`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-trust-green animate-pulse" />
                            Authentic
                          </div>
                          <div className="px-3 py-1 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500">
                            P-384 Compliant
                          </div>
                          <div className="px-3 py-1 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider bg-trust-green/90 text-white">
                            Integrity 100%
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="p-4 bg-white rounded-2xl border border-zinc-100">
                             <div className="flex items-center gap-2 mb-2 text-zinc-400">
                               <FileText className="w-3.5 h-3.5" />
                               <span className="font-mono text-[9px] font-bold uppercase tracking-widest">Entry Name</span>
                             </div>
                             <p className="font-display font-bold text-sm text-zinc-900 truncate">{result.fileName}</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-zinc-100">
                             <div className="flex items-center gap-2 mb-2 text-zinc-400">
                               <Clock className="w-3.5 h-3.5" />
                               <span className="font-mono text-[9px] font-bold uppercase tracking-widest">Registration</span>
                             </div>
                             <p className="font-display font-bold text-sm text-zinc-900">{new Date(result.createdAt).toLocaleDateString()}</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-zinc-100">
                             <div className="flex items-center gap-2 mb-2 text-zinc-400">
                               <User className="w-3.5 h-3.5" />
                               <span className="font-mono text-[9px] font-bold uppercase tracking-widest">Registrar</span>
                             </div>
                             <p className="font-display font-bold text-sm text-zinc-900 truncate">{result.userEmail}</p>
                           </div>
                           <div className="p-4 bg-white rounded-2xl border border-zinc-100">
                             <div className="flex items-center gap-2 mb-2 text-zinc-400">
                               <ShieldCheck className="w-3.5 h-3.5" />
                               <span className="font-mono text-[9px] font-bold uppercase tracking-widest">Expiry</span>
                             </div>
                             <p className={`font-display font-bold text-sm ${result.expiryDate ? 'text-zinc-900' : 'text-zinc-400 italic'}`}>
                               {result.expiryDate ? new Date(result.expiryDate).toLocaleDateString() : 'None Set'}
                             </p>
                           </div>
                        </div>

                        <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                           <div className="flex items-center justify-between gap-4 mb-2">
                             <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest">Signature_Hash</span>
                             <span className="font-mono text-[9px] font-bold text-trust-green uppercase">Verified</span>
                           </div>
                           <p className="font-mono text-[10px] text-zinc-600 break-all leading-relaxed">{result.hash}</p>
                        </div>

                        <AnimatePresence>
                          {showDetails && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-6 bg-zinc-950 rounded-[2rem] text-white space-y-6 mt-4">
                                <div>
                                  <h4 className="font-display font-bold text-sm text-trust-green mb-3 uppercase tracking-widest">Network Protocol Details</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                                    <div className="flex justify-between border-b border-white/10 pb-2">
                                      <span className="text-zinc-500">Node ID</span>
                                      <span>TC-{result._id.slice(-8).toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-2">
                                      <span className="text-zinc-500">Storage Plane</span>
                                      <span>TechCore-Mainnet</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-2">
                                      <span className="text-zinc-500">Consensus</span>
                                      <span>Proof-of-Integrity</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/10 pb-2">
                                      <span className="text-zinc-500">Block Time</span>
                                      <span>{new Date(result.createdAt).getTime()}ms</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-display font-bold text-sm text-trust-green mb-3 uppercase tracking-widest">Security Attributes</h4>
                                  <ul className="space-y-2 text-[10px] font-sans text-zinc-400">
                                    <li className="flex items-center gap-2">
                                      <ShieldCheck className="w-3 h-3 text-trust-green" />
                                      Digital Notarization applied at entry
                                    </li>
                                    <li className="flex items-center gap-2">
                                      <ShieldCheck className="w-3 h-3 text-trust-green" />
                                      Metadata stripped from source for privacy
                                    </li>
                                    <li className="flex items-center gap-2">
                                      <ShieldCheck className="w-3 h-3 text-trust-green" />
                                      Multi-region distributed storage confirmed
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {result.expiryDate && new Date(result.expiryDate) < new Date() && (
                          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-display font-bold text-sm">Spectral Security Warning: Document Expiry Elapsed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => { setFile(null); setResult(null); setVerificationStatus(null); setShowDetails(false); }}
                    className="flex-1 h-16 bg-zinc-50 border border-zinc-100 rounded-2xl font-display font-bold text-zinc-950 hover:bg-zinc-100 transition-all flex items-center justify-center gap-3"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Reset Protocol
                  </button>
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    disabled={verificationStatus === 'unindexed'}
                    className={`flex-1 h-16 border-2 font-display font-bold rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                      showDetails ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-900 text-zinc-950 hover:bg-zinc-50'
                    }`}
                  >
                    {showDetails ? 'Hide Network Details' : 'View Network Detail'}
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
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
