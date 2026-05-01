'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileText, 
  Folder,
  ShieldCheck, 
  X,
  Plus,
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useNotification } from '@/hooks/use-notification';
import { useRouter } from 'next/navigation';
import { SecurityService } from '@/lib/security-service';

interface NotaryItem {
  id: string;
  file: File;
  hash: string | null;
  status: 'pending' | 'computing' | 'ready' | 'storing' | 'success' | 'error' | 'exists_user' | 'exists_other';
  error?: string;
}

export default function NotarizePage() {
  const router = useRouter();
  const { notify, confirm } = useNotification();
  const [items, setItems] = useState<NotaryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const calculateHash = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hashHex;
  };

  const handleFiles = async (files: FileList | File[]) => {
    const newItems: NotaryItem[] = [];
    const fileList = Array.from(files);

    for (const file of fileList) {
      const id = crypto.randomUUID();
      newItems.push({
        id,
        file,
        hash: null,
        status: 'pending'
      });
    }

    setItems(prev => [...prev, ...newItems]);

    // Start computing hashes for pending items
    for (const item of newItems) {
      updateItemStatus(item.id, 'computing');
      try {
        const hash = await calculateHash(item.file);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, hash, status: 'ready' } : i));
      } catch (err) {
        updateItemStatus(item.id, 'error', 'Hash failed');
      }
    }
  };

  const updateItemStatus = (id: string, status: NotaryItem['status'], error?: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status, error } : item));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleFolderPathEntry = async () => {
    const isConfirmed = await confirm({
      title: 'Local Path Protocol',
      message: 'Browser security constraints prevent direct filesystem path traversal. To index a local folder, use our "Index Directory" protocol which utilizes secure system-level hooks.',
      confirmText: 'Use Protocol',
      cancelText: 'Cancel'
    });

    if (isConfirmed) {
      folderInputRef.current?.click();
    }
  };

  const notarizeAll = async () => {
    const readyItems = items.filter(i => i.status === 'ready' && i.hash);
    if (readyItems.length === 0) return;

    setIsProcessing(true);
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) {
      notify('Session expired. Please login again.', 'error');
      return;
    }

    for (const item of readyItems) {
      updateItemStatus(item.id, 'storing');
      try {
        const payload = SecurityService.prepareForTransit({
          userEmail: email,
          fileName: item.file.name,
          fileSize: item.file.size,
          hash: item.hash,
          expiryDate: null // Default to infinite
        });

        const res = await fetch('/api/hashes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const body = await res.json();
          const data = SecurityService.processFromTransit(body);
          
          if (data.status === 'exists_user') {
             updateItemStatus(item.id, 'exists_user', 'Already in your vault');
          } else if (data.status === 'exists_other') {
             updateItemStatus(item.id, 'exists_other', 'Indexed by another node');
          } else {
             updateItemStatus(item.id, 'success');
          }
        } else if (res.status === 402) {
          updateItemStatus(item.id, 'error', 'Insufficient Energy');
          notify('Your Energy Core is depleted. Batch processing halted.', 'error');
          setIsProcessing(false);
          return; // Stop the batch if credits are gone
        } else {
          updateItemStatus(item.id, 'error', 'Store failed');
        }
      } catch (err) {
        updateItemStatus(item.id, 'error', 'Network error');
      }
    }

    setIsProcessing(false);
    notify(`Batch processing complete. ${readyItems.length} records notarized.`, 'success');
  };

  const stats = useMemo(() => {
    return {
      total: items.length,
      ready: items.filter(i => i.status === 'ready').length,
      success: items.filter(i => i.status === 'success' || i.status === 'exists_user' || i.status === 'exists_other').length,
    };
  }, [items]);

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-5xl mx-auto py-12 lg:py-20">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-display text-4xl font-bold text-zinc-900 mb-2"
            >
              Bulk Notarization
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="font-sans text-zinc-500"
            >
              Index multiple documents or entire directories into the secure ledger.
            </motion.p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-12 px-6 bg-zinc-900 text-white rounded-2xl font-display font-bold text-sm flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
            >
              <Plus className="w-4 h-4" />
              Add Files
            </button>
            <button 
              onClick={() => folderInputRef.current?.click()}
              className="h-12 px-6 bg-white border-2 border-zinc-900 text-zinc-900 rounded-2xl font-display font-bold text-sm flex items-center gap-2 hover:bg-zinc-50 transition-all"
            >
              <Folder className="w-4 h-4" />
              Index Directory
            </button>
            <button 
              onClick={handleFolderPathEntry}
              className="h-12 px-6 bg-zinc-50 text-zinc-400 rounded-2xl font-display font-bold text-sm flex items-center gap-2 hover:bg-zinc-100 transition-all border border-zinc-100"
            >
              <Search className="w-4 h-4" />
              Local Path
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              onChange={(e) => e.target.files && handleFiles(e.target.files)} 
              className="hidden" 
            />
            {/* Folder input */}
            <input 
              type="file" 
              ref={folderInputRef} 
              multiple
              // @ts-ignore - webkitdirectory is non-standard but widely supported
              webkitdirectory=""
              onChange={(e) => e.target.files && handleFiles(e.target.files)} 
              className="hidden" 
            />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {items.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border-2 border-dashed border-zinc-100 rounded-[2.5rem] p-20 text-center"
                >
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-8 h-8 text-zinc-200" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-zinc-900 mb-2">Queue is Empty</h3>
                  <p className="font-sans text-sm text-zinc-400">Select files or a folder to begin indexing.</p>
                </motion.div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.status === 'success' ? 'bg-trust-green/10 text-trust-green' : 'bg-zinc-50 text-zinc-400'
                      }`}>
                        {item.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-zinc-900 truncate">{item.file.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                            {(item.file.size / 1024).toFixed(1)} KB
                          </p>
                          {item.hash && (
                            <p className="font-mono text-[9px] text-trust-green font-bold truncate max-w-[100px]">
                              {item.hash.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`font-mono text-[9px] font-bold uppercase tracking-wider ${
                          item.status === 'success' ? 'text-trust-green' :
                          item.status === 'exists_user' ? 'text-zinc-500' :
                          item.status === 'exists_other' ? 'text-amber-600' :
                          item.status === 'error' ? 'text-red-500' :
                          'text-zinc-400'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                        {item.error && <p className={`text-[8px] font-bold uppercase ${
                          item.status === 'exists_other' ? 'text-amber-600' : 
                          item.status === 'exists_user' ? 'text-zinc-400' : 
                          'text-red-500'
                        }`}>{item.error}</p>}
                      </div>
                      
                      {item.status === 'storing' || item.status === 'computing' ? (
                        <Loader2 className="w-4 h-4 text-trust-green animate-spin" />
                      ) : (
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-8">
            <section className="glass rounded-[2rem] p-8 border border-zinc-100 shadow-xl shadow-zinc-200/50">
              <h3 className="font-display font-bold text-xl text-zinc-900 mb-6 font-display">Batch Overview</h3>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-50">
                  <span className="font-sans text-sm text-zinc-500">Queue Total</span>
                  <span className="font-mono text-sm font-bold text-zinc-900">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-50">
                  <span className="font-sans text-sm text-zinc-500">Ready to Index</span>
                  <span className="font-mono text-sm font-bold text-trust-green">{stats.ready}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm text-zinc-500">Successfully Notarized</span>
                  <span className="font-mono text-sm font-bold text-zinc-900">{stats.success}</span>
                </div>
              </div>

              <button 
                onClick={notarizeAll}
                disabled={stats.ready === 0 || isProcessing}
                className="w-full h-14 bg-trust-green text-white rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-3 hover:bg-trust-green/90 transition-all shadow-lg shadow-trust-green/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                {isProcessing ? 'Processing Ledger...' : 'Commit Batch to Chain'}
              </button>
              
              <p className="mt-4 font-sans text-[10px] text-zinc-400 text-center leading-relaxed">
                By committing, you confirm these document fingerprints will be immutably indexed in your secure private vault.
              </p>
            </section>

            <section className="p-8 bg-zinc-50 rounded-[2rem] border border-zinc-100">
               <div className="flex items-center gap-3 mb-4">
                 <AlertCircle className="w-5 h-5 text-zinc-400" />
                 <h4 className="font-display font-bold text-zinc-900">Indexing Tips</h4>
               </div>
               <ul className="space-y-3">
                 <li className="font-sans text-xs text-zinc-500 flex gap-2">
                   <div className="w-1 h-1 rounded-full bg-trust-green mt-1.5" />
                   Directory indexing includes all nested subfolders.
                 </li>
                 <li className="font-sans text-xs text-zinc-500 flex gap-2">
                   <div className="w-1 h-1 rounded-full bg-trust-green mt-1.5" />
                   Files are hashed locally; content is never uploaded.
                 </li>
                 <li className="font-sans text-xs text-zinc-500 flex gap-2">
                   <div className="w-1 h-1 rounded-full bg-trust-green mt-1.5" />
                   Large directories may take a moment to compute.
                 </li>
               </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
