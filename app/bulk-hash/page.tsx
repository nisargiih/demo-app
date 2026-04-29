'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Layers, 
  Fingerprint, 
  Calendar, 
  CheckCircle2, 
  X,
  Plus,
  Loader2,
  Trash2,
  Search,
  Check,
  Zap
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useRouter } from 'next/navigation';

interface FileRecord {
  file: File;
  hash: string | null;
  status: 'pending' | 'hashing' | 'ready' | 'authenticated' | 'error';
  expiryDate?: string;
}

export default function BulkHashPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkExpiryDate, setBulkExpiryDate] = useState<string>('');
  const [isApplyingBulkExpiry, setIsApplyingBulkExpiry] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateHash = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileRecord[] = Array.from(selectedFiles).map(f => ({
      file: f,
      hash: null,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const processAllHashes = async () => {
    setIsProcessing(true);
    
    // Process in chunks or one by one
    const updatedFiles = [...files];
    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status !== 'pending') continue;
      
      updatedFiles[i].status = 'hashing';
      setFiles([...updatedFiles]);
      
      try {
        const hash = await calculateHash(updatedFiles[i].file);
        updatedFiles[i].hash = hash;
        updatedFiles[i].status = 'ready';
      } catch (err) {
        console.error(err);
        updatedFiles[i].status = 'error';
      }
      setFiles([...updatedFiles]);
    }
    setIsProcessing(false);
  };

  const authenticateAll = async () => {
    const readyFiles = files.filter(f => f.status === 'ready');
    if (readyFiles.length === 0) return;

    setIsProcessing(true);
    const email = localStorage.getItem('authenticated_user_email');

    for (const record of readyFiles) {
      try {
        const res = await fetch('/api/hashes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: email,
            fileName: record.file.name,
            fileSize: record.file.size,
            hash: record.hash,
            expiryDate: record.expiryDate || bulkExpiryDate || null
          }),
        });

        if (res.ok) {
          setFiles(prev => prev.map(f => f.file === record.file ? { ...f, status: 'authenticated' as const } : f));
        }
      } catch (err) {
        console.error(err);
      }
    }
    setIsProcessing(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (confirm('Clear all files from the current session?')) {
      setFiles([]);
    }
  };

  const filteredFiles = files.filter(f => 
    f.file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: files.length,
    ready: files.filter(f => f.status === 'ready').length,
    authenticated: files.filter(f => f.status === 'authenticated').length,
    pending: files.filter(f => f.status === 'pending').length
  };

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-6xl mx-auto py-12 lg:py-20">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex items-center gap-2 mb-4"
            >
               <div className="px-3 py-1 bg-trust-green/10 text-trust-green rounded-full font-mono text-[10px] font-bold uppercase tracking-widest ">
                 Beta Protocol v2.1
               </div>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl font-bold text-zinc-900 mb-2"
            >
              Bulk Hash Engine
            </motion.h1>
            <p className="font-sans text-zinc-500">Process entire directories or multiple sets of sensitive documentation.</p>
          </div>

          <div className="flex items-center gap-3">
             <button 
               onClick={() => folderInputRef.current?.click()}
               className="h-11 px-6 bg-zinc-950 text-white rounded-xl font-display font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-all hover:scale-[1.02]"
             >
               <Layers className="w-4 h-4" />
               Select Directory
             </button>
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="h-11 px-6 bg-zinc-100 text-zinc-900 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-200 transition-all"
             >
               <Plus className="w-4 h-4" />
               Add Files
             </button>
             <input 
               type="file" 
               ref={folderInputRef}
               className="hidden"
               // @ts-ignore
               webkitdirectory="" 
               directory=""
               onChange={(e) => handleFiles(e.target.files)}
             />
             <input 
               type="file" 
               ref={fileInputRef}
               className="hidden"
               multiple
               onChange={(e) => handleFiles(e.target.files)}
             />
          </div>
        </header>

        {files.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3 space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                 <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                   <input 
                     type="text"
                     placeholder="Filter local manifest..."
                     className="w-full bg-transparent border-none pl-10 pr-4 py-2 font-sans text-sm focus:ring-0"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                   />
                 </div>
                 <div className="flex items-center gap-3">
                   <button 
                     onClick={clearAll}
                     className="px-4 py-2 text-red-500 font-display font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                   >
                     <Trash2 className="w-3 h-3" />
                     Clear Manifest
                   </button>
                 </div>
              </div>

              {/* File List */}
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredFiles.map((record, idx) => (
                    <motion.div 
                      layout
                      key={record.file.name + idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between hover:border-trust-green/20 transition-all hover:shadow-lg hover:shadow-zinc-200/20"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-zinc-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display font-bold text-sm text-zinc-900 truncate">{record.file.name}</h3>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest">{(record.file.size / 1024).toFixed(1)} KB</span>
                            {record.hash && (
                              <span className="font-mono text-[9px] text-zinc-400 flex items-center gap-1">
                                <Fingerprint className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[100px]">{record.hash}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                          {record.status === 'pending' && <span className="font-mono text-[8px] font-black text-zinc-300 uppercase tracking-widest">Awaiting Pulse</span>}
                          {record.status === 'hashing' && <span className="font-mono text-[8px] font-black text-trust-green uppercase tracking-widest animate-pulse">Hashing...</span>}
                          {record.status === 'ready' && <span className="font-mono text-[8px] font-black text-trust-green uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Ready</span>}
                          {record.status === 'authenticated' && <span className="font-mono text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5"><Zap className="w-3 h-3" /> Authenticated</span>}
                        </div>
                        <button 
                          onClick={() => removeFile(idx)}
                          className="p-2 text-zinc-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-6">
              <section className="glass rounded-[2rem] p-6 border border-zinc-100 sticky top-12">
                <h3 className="font-display font-bold text-lg text-zinc-900 mb-6">Execution Panel</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                    <span className="text-zinc-400 text-xs">Total Records</span>
                    <span className="font-mono font-bold text-sm text-zinc-900">{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                    <span className="text-zinc-400 text-xs">Awaiting Pulse</span>
                    <span className="font-mono font-bold text-sm text-zinc-900">{stats.pending}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-50">
                    <span className="text-zinc-400 text-xs">Verified Ready</span>
                    <span className="font-mono font-bold text-sm text-trust-green">{stats.ready}</span>
                  </div>
                </div>

                <div className="space-y-3">
                   <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                     <div className="flex items-center justify-between mb-3">
                       <span className="font-display font-bold text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                         <Calendar className="w-3 h-3" />
                         Bulk Expiry
                       </span>
                       <button 
                         onClick={() => setIsApplyingBulkExpiry(!isApplyingBulkExpiry)}
                         className="text-trust-green font-bold text-[9px] hover:underline"
                       >
                         {bulkExpiryDate ? 'Edit' : 'Set'}
                       </button>
                     </div>
                     {isApplyingBulkExpiry ? (
                       <input 
                         type="date"
                         className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-trust-green transition-all"
                         value={bulkExpiryDate}
                         onChange={(e) => {
                           setBulkExpiryDate(e.target.value);
                           setIsApplyingBulkExpiry(false);
                         }}
                         onBlur={() => setIsApplyingBulkExpiry(false)}
                         autoFocus
                       />
                     ) : (
                       <p className="font-display font-bold text-zinc-900 text-sm">
                         {bulkExpiryDate ? new Date(bulkExpiryDate).toLocaleDateString() : 'No date specified'}
                       </p>
                     )}
                   </div>

                   <button 
                     onClick={processAllHashes}
                     disabled={stats.pending === 0 || isProcessing}
                     className="w-full h-12 bg-zinc-950 text-white rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xl shadow-zinc-900/10"
                   >
                     {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                     Process Hashes
                   </button>

                   <button 
                     onClick={authenticateAll}
                     disabled={stats.ready === 0 || isProcessing}
                     className="w-full h-12 bg-trust-green text-white rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-trust-green/90 disabled:opacity-50 transition-all shadow-xl shadow-trust-green/20"
                   >
                     {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                     Authenticate All
                   </button>
                </div>

                <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="font-sans text-[10px] text-amber-800 leading-relaxed italic">
                    Large directories may take several seconds to generate cryptographic signatures. Do not close this terminal.
                  </p>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 bg-zinc-50 border border-zinc-100 border-dashed rounded-[3rem]"
          >
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl shadow-zinc-200/50 mb-6">
                <Layers className="w-8 h-8 text-zinc-200" />
             </div>
             <h2 className="font-display text-2xl font-bold text-zinc-900 mb-2">Manifest Empty</h2>
             <p className="font-sans text-zinc-400 text-center max-w-sm mb-8">
               Import a folder or select specific documents to begin the high-redundancy bulk hashing process.
             </p>
             <div className="flex gap-4">
                <button 
                  onClick={() => folderInputRef.current?.click()}
                  className="h-11 px-8 bg-zinc-950 text-white rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  Import Folder
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 px-8 border border-zinc-200 text-zinc-400 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-all"
                >
                  Select Files
                </button>
             </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
