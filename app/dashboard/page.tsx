'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  ShieldAlert, 
  Fingerprint, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  X,
  Plus,
  Edit2
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useNotification } from '@/hooks/use-notification';

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [isEditingExpiry, setIsEditingExpiry] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const fetchHistory = React.useCallback(async () => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) return;

    try {
      const res = await fetch(`/api/hashes?email=${email}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const init = async () => {
      await fetchHistory();
    };
    init();
  }, [fetchHistory]);

  const calculateHash = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hashHex;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setIsUploading(true);
      setFile(selectedFile);
      
      // Simulate crunching process for UI feel
      setTimeout(async () => {
        const generatedHash = await calculateHash(selectedFile);
        setHash(generatedHash);
        setIsUploading(false);
      }, 1500);
    }
  };

  const handleStoreHash = async () => {
    if (!file || !hash) return;
    const email = localStorage.getItem('authenticated_user_email');
    
    try {
      const res = await fetch('/api/hashes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: email,
          fileName: file.name,
          fileSize: file.size,
          hash,
          expiryDate
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.alreadyExists) {
          notify('Note: This document fingerprint is already indexed in your secure archive.', 'info');
        } else {
          notify('Document successfully notarized on-chain.', 'success');
        }
        fetchHistory();
        resetUpload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setHash(null);
    setExpiryDate(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-5xl mx-auto py-12 lg:py-20">
        <header className="mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold text-zinc-900 mb-2"
          >
            Terminal Dashboard
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-sans text-zinc-500"
          >
            Access military-grade document hashing and verification.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Section */}
          <div className="lg:col-span-2 space-y-8">
            <section className="glass rounded-[3rem] p-8 md:p-12 border border-zinc-100 shadow-2xl shadow-zinc-200/50">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-trust-green/10 rounded-2xl flex items-center justify-center">
                  <Upload className="text-trust-green w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-zinc-900">Hash Generator</h2>
                  <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Protocol: SHA-256_ACTIVE</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl mb-8 flex gap-4 items-start">
                <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="font-sans text-xs text-amber-800 leading-relaxed">
                  <span className="font-bold">Attention:</span> Our hashing mechanism is highly sensitive. Even a single bit change or a minor character alteration in the source file will result in a completely different hash string, ensuring absolute tampering detection.
                </p>
              </div>

              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative border-2 border-dashed border-zinc-100 rounded-[2.5rem] p-16 text-center cursor-pointer hover:border-trust-green/50 hover:bg-trust-green/[0.02] transition-all"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-zinc-300 group-hover:text-trust-green transition-colors" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-zinc-900 mb-2">Drop your secure file here</h3>
                  <p className="font-sans text-sm text-zinc-400">PDF, JPG, PNG or DOCX up to 50MB</p>
                  
                  <div className="mt-8 flex justify-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                      AES-256
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                      End-to-End
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-zinc-100">
                        <FileText className="text-zinc-400 w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-zinc-900">{file.name}</p>
                        <p className="font-sans text-xs text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button onClick={resetUpload} className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-red-500 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {isUploading ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-12 text-center"
                      >
                         <div className="relative w-16 h-16 mx-auto mb-6">
                          <div className="absolute inset-0 border-4 border-trust-green/20 rounded-full" />
                          <div className="absolute inset-0 border-4 border-t-trust-green rounded-full animate-spin" />
                        </div>
                        <p className="font-mono text-xs font-bold text-trust-green uppercase tracking-[0.2em] animate-pulse">Computing_Matrix_Hash...</p>
                      </motion.div>
                    ) : hash && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="p-8 bg-white border-2 border-trust-green/20 rounded-[2rem] text-zinc-950 overflow-hidden relative group shadow-xl shadow-trust-green/5">
                          <div className="absolute inset-0 bg-gradient-to-br from-trust-green/[0.03] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                              <Fingerprint className="w-4 h-4 text-trust-green" />
                              <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Document Fingerprint (SHA-256)</span>
                            </div>
                            <p className="font-mono text-lg font-bold break-all tracking-wider text-zinc-950 leading-tight">
                              {hash}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 p-6 bg-zinc-50 border border-zinc-100 rounded-3xl">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-zinc-400" />
                                <span className="font-display font-bold text-sm text-zinc-500">Document Expiry</span>
                              </div>
                              <button 
                                onClick={() => setIsEditingExpiry(!isEditingExpiry)}
                                className="text-trust-green font-bold text-xs hover:underline flex items-center gap-1"
                              >
                                {expiryDate ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                {expiryDate ? 'Change' : 'Add Date'}
                              </button>
                            </div>
                            
                            {isEditingExpiry ? (
                              <div className="flex gap-2">
                                <input 
                                  type="date"
                                  className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2 font-sans text-sm focus:outline-none focus:border-trust-green"
                                  value={expiryDate || ''}
                                  onChange={(e) => {
                                    setExpiryDate(e.target.value);
                                    setIsEditingExpiry(false);
                                  }}
                                />
                                <button onClick={() => setIsEditingExpiry(false)} className="p-2 text-zinc-400 hover:text-zinc-900">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {expiryDate ? (
                                  <>
                                    <div className="w-2 h-2 bg-trust-green rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="font-display font-bold text-zinc-900">{new Date(expiryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                  </>
                                ) : (
                                  <span className="font-display font-bold text-zinc-400 italic">No Expiration Document</span>
                                )}
                              </div>
                            )}
                          </div>

                          <button 
                            onClick={handleStoreHash}
                            className="px-8 bg-trust-green text-white rounded-3xl font-bold flex items-center justify-center gap-3 hover:bg-trust-green/90 transition-all font-display shadow-lg shadow-trust-green/20"
                          >
                            Store on Chain
                            <CheckCircle2 className="w-5 h-5 shadow-[0_4px_12px_rgba(255,255,255,0.4)]" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>

          {/* Side Info / Activity */}
          <div className="space-y-8">
            <section className="glass rounded-[2.5rem] p-8 border border-zinc-100">
              <h3 className="font-display font-bold text-xl text-zinc-900 mb-6">Network Health</h3>
              <div className="space-y-6">
                {[
                  { label: "Verification Node", status: "Operational", color: "bg-trust-green" },
                  { label: "IPFS Gateway", status: "Active", color: "bg-trust-green" },
                  { label: "Auth Relay", status: "99.9% Up", color: "bg-trust-green" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-sans text-sm text-zinc-500">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 ${item.color} rounded-full`} />
                      <span className="font-mono text-[10px] font-bold text-zinc-900 uppercase">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass rounded-[2.5rem] p-8 border border-zinc-100 bg-gradient-to-br from-trust-green/5 to-transparent">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-5 h-5 text-zinc-400" />
                <h3 className="font-display font-bold text-lg text-zinc-900">Recent Hashes</h3>
              </div>
              <div className="space-y-4">
                 {isHistoryLoading ? (
                   [1, 2, 3].map(i => (
                     <div key={i} className="h-20 bg-zinc-50 border border-zinc-100 rounded-2xl animate-pulse" />
                   ))
                 ) : history.length > 0 ? (
                   history.slice(0, 3).map((record, i) => (
                     <div key={i} className="p-4 bg-white/50 border border-zinc-100 rounded-2xl hover:border-trust-green/20 transition-all cursor-pointer group">
                       <p className="font-mono text-[10px] text-trust-green font-bold mb-1 opacity-50">RECORD_{i + 1}</p>
                       <p className="font-display font-bold text-sm text-zinc-900 mb-1 group-hover:text-trust-green transition-colors truncate">{record.fileName}</p>
                       <p className="font-mono text-[9px] text-zinc-400 truncate">SHA256: {record.hash.slice(0, 16)}...</p>
                     </div>
                   ))
                 ) : (
                   <p className="font-sans text-xs text-zinc-400 text-center py-8">No records indexed yet.</p>
                 )}
              </div>
              <button 
                onClick={() => router.push('/archive')}
                className="w-full mt-6 py-3 font-display font-bold text-xs text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-[0.2em]"
              >
                View Archive
              </button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
