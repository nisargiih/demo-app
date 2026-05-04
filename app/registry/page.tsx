'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Archive, 
  Upload, 
  Search, 
  FileText, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  HardDrive,
  Trash2,
  X,
  Plus,
  Zap,
  Building2,
  Lock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useNotification } from '@/hooks/use-notification';

interface RegistryItem {
  _id?: string;
  userEmail: string;
  name: string;
  description?: string;
  registryId: string;
  fileKey: string;
  fileName: string;
  fileType: string;
  status: string;
  createdAt: string;
}

export default function RegistryPage() {
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Form State
  const [formDocName, setFormDocName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customRegistryId, setCustomRegistryId] = useState('');

  const { notify } = useNotification();

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const res = await fetch(`/api/registry?email=${email}`);
        if (res.ok) {
          const body = await res.json();
          const data = SecurityService.processFromTransit(body);
          setItems(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [refreshTrigger]);

  const generateRegistryId = () => {
    const prefix = 'TC';
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${Date.now().toString().slice(-4)}-${rand}`;
  };

  const calculateHash = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formDocName) setFormDocName(file.name.split('.')[0]);
      if (!customRegistryId) setCustomRegistryId(generateRegistryId());
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !formDocName || !customRegistryId) {
      notify('Please complete all required fields.', 'error');
      return;
    }

    setIsUploading(true);
    const email = localStorage.getItem('authenticated_user_email');

    try {
      // 0. Calculate Hash for integrity
      const fileHash = await calculateHash(selectedFile);

      // 1. Get Presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type
        })
      });

      if (!presignedRes.ok) throw new Error('Failed to get upload authorization');
      const { url, fileKey } = await presignedRes.json();

      // 2. Upload to S3
      const uploadRes = await fetch(url, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type }
      });

      if (!uploadRes.ok) throw new Error('Storage sync failed');

      // 3. Register in DB
      const registryData = {
        userEmail: email,
        name: formDocName,
        description: formDesc,
        registryId: customRegistryId,
        fileKey: fileKey,
        fileHash: fileHash,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SecurityService.prepareForTransit(registryData))
      });

      if (res.ok) {
        notify('Document registered successfully with ID: ' + customRegistryId, 'success');
        setShowUploadModal(false);
        resetForm();
        setRefreshTrigger(prev => prev + 1);
      } else {
        notify('Registry collision or integrity check failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      notify('Registry protocol error.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormDocName('');
    setFormDesc('');
    setSelectedFile(null);
    setCustomRegistryId('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify('Registry ID copied to clipboard', 'info');
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.registryId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="relative min-h-screen w-full bg-white lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6">
      <Sidebar />
      
      <div className="relative z-10 w-full max-w-6xl mx-auto py-8 sm:py-12 lg:py-16">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-4"
            >
              <div className="w-12 h-12 bg-trust-green/10 rounded-2xl flex items-center justify-center">
                <Archive className="text-trust-green w-6 h-6" />
              </div>
              <h1 className="font-display text-4xl font-bold text-zinc-900">Official Registry</h1>
            </motion.div>
            <p className="font-sans text-sm text-zinc-500">Public document repository for verified certificates and corporate credentials.</p>
          </div>

          <button 
            onClick={() => setShowUploadModal(true)}
            className="h-14 px-8 bg-zinc-950 text-white rounded-2xl font-display font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20"
          >
            <Plus className="w-5 h-5 text-trust-green" />
            Register Document
          </button>
        </header>

        {/* Stats / Search */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 h-14 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-trust-green transition-colors" />
            <input 
              type="text" 
              placeholder="Search registry by ID or document name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full pl-14 pr-6 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
            />
          </div>
          <div className="h-14 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center gap-3 px-6">
            <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase">Total Units</span>
            <span className="font-display font-black text-xl text-zinc-900">{items.length}</span>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredItems.map((item, i) => (
                <motion.div 
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-[2rem] p-6 border border-zinc-100 shadow-xl shadow-zinc-900/[0.02] group hover:border-trust-green/20 transition-all"
                >
                   <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-zinc-50 shadow-sm text-zinc-400 group-hover:text-trust-green transition-colors">
                         <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="px-3 py-1 bg-trust-green/5 text-trust-green font-mono text-[9px] font-bold rounded-full uppercase">VERIFIED</span>
                         <span className="font-sans text-[10px] text-zinc-400 mt-2">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                   </div>

                   <h3 className="font-display font-bold text-lg text-zinc-900 mb-2 truncate">{item.name}</h3>
                   <p className="font-sans text-xs text-zinc-500 mb-6 line-clamp-2 min-h-[2rem]">{item.description || 'No description provided for this registry entry.'}</p>

                   <div className="p-4 bg-zinc-50/50 rounded-2xl border border-zinc-100 space-y-3">
                      <div className="flex items-center justify-between">
                         <span className="font-display font-bold text-[9px] text-zinc-400 uppercase tracking-widest">Registry ID</span>
                         <button onClick={() => copyToClipboard(item.registryId)} className="p-1 hover:text-trust-green transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                         </button>
                      </div>
                      <div className="font-mono text-xs font-bold text-zinc-900 break-all bg-white px-3 py-2 rounded-lg border border-zinc-50">
                         {item.registryId}
                      </div>
                   </div>

                   <button className="w-full mt-6 h-12 flex items-center justify-center gap-2 font-display text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-950 transition-all border border-transparent hover:border-zinc-100 rounded-xl">
                      View Documents <ExternalLink className="w-4 h-4" />
                   </button>
                </motion.div>
             ))}
          </div>
        ) : (
          <div className="h-96 glass rounded-[3rem] border border-zinc-100 flex flex-col items-center justify-center text-center p-12">
             <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-zinc-200" />
             </div>
             <h3 className="font-display font-bold text-xl text-zinc-900 mb-2">Registry is Clear</h3>
             <p className="font-sans text-sm text-zinc-500 max-w-xs">No registered documents found matching your search protocol or user profile.</p>
             <button 
                onClick={() => setShowUploadModal(true)}
                className="mt-8 h-12 px-8 bg-zinc-950 text-white rounded-xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all"
             >
                Initialize Registration
             </button>
          </div>
        )}

        {/* Upload Modal */}
        <AnimatePresence>
          {showUploadModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => !isUploading && setShowUploadModal(false)}
                 className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md"
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden shadow-zinc-950/40 border border-zinc-100"
               >
                  <div className="p-8 sm:p-12">
                     <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-trust-green/10 rounded-2xl flex items-center justify-center">
                              <Zap className="text-trust-green w-6 h-6" />
                           </div>
                           <div>
                              <h2 className="font-display text-2xl font-bold text-zinc-900">Registry Protocol</h2>
                              <p className="font-sans text-xs text-zinc-400">Initialize official document registration.</p>
                           </div>
                        </div>
                        <button 
                           onClick={() => setShowUploadModal(false)}
                           className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-50 text-zinc-400 transition-all"
                        >
                           <X className="w-5 h-5" />
                        </button>
                     </div>

                     <form onSubmit={handleUpload} className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           <div className="space-y-2">
                              <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Document Name</label>
                              <input 
                                 type="text" 
                                 placeholder="e.g. ISO-9001 Certificate"
                                 value={formDocName}
                                 onChange={(e) => setFormDocName(e.target.value)}
                                 className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all"
                                 required
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Registration ID (Custom / Auto)</label>
                              <div className="relative">
                                 <input 
                                    type="text" 
                                    placeholder="TC-RANDOM-ID"
                                    value={customRegistryId}
                                    onChange={(e) => setCustomRegistryId(e.target.value.toUpperCase())}
                                    className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all uppercase"
                                    required
                                 />
                                 <button 
                                    type="button"
                                    onClick={() => setCustomRegistryId(generateRegistryId())}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-trust-green font-mono text-[9px] font-bold underline"
                                 >
                                    REGEN
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Brief Description</label>
                           <textarea 
                              placeholder="Describe the purpose or details of this certificate..."
                              value={formDesc}
                              onChange={(e) => setFormDesc(e.target.value)}
                              rows={3}
                              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-sm transition-all resize-none"
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest pl-1">Source File (Notarization Unit)</label>
                           <div className={`relative h-40 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center p-6 ${
                              selectedFile ? 'border-trust-green bg-trust-green/5' : 'border-zinc-100 hover:border-trust-green/30 bg-zinc-50'
                           }`}>
                              <input 
                                 type="file" 
                                 className="absolute inset-0 opacity-0 cursor-pointer" 
                                 onChange={handleFileChange}
                              />
                              {selectedFile ? (
                                 <>
                                    <div className="w-12 h-12 bg-trust-green/10 rounded-2xl flex items-center justify-center mb-3">
                                       <CheckCircle2 className="w-6 h-6 text-trust-green" />
                                    </div>
                                    <p className="font-display font-bold text-sm text-zinc-900 truncate max-w-xs">{selectedFile.name}</p>
                                    <p className="font-mono text-[10px] text-zinc-400 mt-1 uppercase">{(selectedFile.size / 1024).toFixed(2)} KB • READY</p>
                                 </>
                              ) : (
                                 <>
                                    <Upload className="w-8 h-8 text-zinc-300 mb-3" />
                                    <p className="font-display font-bold text-sm text-zinc-400">Click or drag to stage certificate</p>
                                    <p className="font-sans text-[10px] text-zinc-300 mt-1">PDF, JPG, PNG up to 10MB</p>
                                 </>
                              )}
                           </div>
                        </div>

                        <div className="p-6 bg-zinc-950 rounded-3xl text-white relative overflow-hidden">
                           <div className="relative z-10 flex items-center gap-6">
                              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                                 <Lock className="w-6 h-6 text-trust-green" />
                              </div>
                              <div>
                                 <h4 className="font-display font-bold text-sm mb-1 leading-none">Security Assurance</h4>
                                 <p className="font-sans text-[10px] text-zinc-500 leading-tight">Registered documents are cryptographically associated with your node ID. Re-registration by other nodes will be blocked.</p>
                              </div>
                           </div>
                        </div>

                        <button 
                           type="submit"
                           disabled={isUploading}
                           className="w-full h-16 bg-zinc-950 text-white rounded-2xl font-display font-black text-xs uppercase tracking-[0.25em] flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-950/30 disabled:opacity-50"
                        >
                           {isUploading ? 'Registering...' : 'Confirm Registration'}
                           <ChevronRight className="w-5 h-5 text-trust-green" />
                        </button>
                     </form>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      <BackgroundAnimation />
    </main>
  );
}
