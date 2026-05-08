'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Archive, 
  Search, 
  Filter,
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Fingerprint,
  Trash2,
  Download,
  FileText,
  Clock,
  ArrowUpRight,
  Plus,
  X,
  Upload,
  Loader2,
  AlertCircle,
  Tag
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useNotification } from '@/hooks/use-notification';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { getTagColor } from '@/lib/tag-utils';

export default function RegistryPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const { user, loading } = useUser();
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [modalTagInput, setModalTagInput] = useState('');

  const allTags = Array.from(new Set(records.flatMap(r => r.tags || []))).sort();

  // New Record Stats
  const [newRecord, setNewRecord] = useState({
    registryId: '',
    docName: '',
    description: '',
    type: 'identity',
    tags: [] as string[],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRecords = async () => {
    if (!user?.email) return;

    try {
      const res = await fetch(`/api/registry?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Fetch Registry Error:', err);
      notify('Failed to synchronize registry data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchRecords();
  }, [user, loading, router]);

  const handleFileUpload = async (file: File) => {
    try {
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!res.ok) throw new Error('Failed to get presigned URL');
      const { url, fileKey } = await res.json();

      await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      return fileKey;
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.registryId || !newRecord.docName || !selectedFile) {
      notify('Registry ID, Title and Document are mandatory.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let fileKey = null;
      if (selectedFile) {
        fileKey = await handleFileUpload(selectedFile);
      }

      const payload = SecurityService.prepareForTransit({
        ...newRecord,
        userEmail: user?.email,
        fileKey,
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        contentType: selectedFile?.type,
      });

      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        notify('Official record committed to ledger.', 'success');
        setShowAddModal(false);
        setNewRecord({ registryId: '', docName: '', description: '', type: 'identity', tags: [] });
        setModalTagInput('');
        setSelectedFile(null);
        fetchRecords();
      } else {
        const error = await res.json();
        notify(error.error || 'Failed to create registry record.', 'error');
      }
    } catch (err) {
      notify('Registry protocol failed.', 'error');
    } finally {
      setIsSubmitting(false);
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
      } else {
        notify('Failed to generate secure download link.', 'error');
      }
    } catch (err) {
      notify('Download protocol failed.', 'error');
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      (record.registryId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.docName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.tags || []).some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTag = !selectedTag || (record.tags || []).includes(selectedTag);
    
    if (filterType === 'all') return matchesSearch && matchesTag;
    return matchesSearch && matchesTag && record.type === filterType;
  });

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/registry?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRecords(prev => prev.filter(r => r._id !== id));
        notify('Record purged from registry.', 'success');
      }
    } catch (err) {
      notify('Purge protocol failed.', 'error');
    }
  };

  const handleUpdateTags = async (id: string, currentTags: string[]) => {
    if (!tagInput.trim()) return;
    const newTags = Array.from(new Set([...currentTags, tagInput.trim().toLowerCase()]));
    
    try {
      const res = await fetch('/api/registry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tags: newTags, userEmail: user?.email }),
      });

      if (res.ok) {
        setRecords(prev => prev.map(r => r._id === id ? { ...r, tags: newTags } : r));
        setTagInput('');
        notify('Tags updated.', 'success');
      }
    } catch (err) {
      notify('Tag update failed.', 'error');
    }
  };

  const handleRemoveTag = async (id: string, tagToRemove: string, currentTags: string[]) => {
    const newTags = currentTags.filter(t => t !== tagToRemove);
    
    try {
      const res = await fetch('/api/registry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tags: newTags, userEmail: user?.email }),
      });

      if (res.ok) {
        setRecords(prev => prev.map(r => r._id === id ? { ...r, tags: newTags } : r));
        notify('Tag removed.', 'success');
      }
    } catch (err) {
      notify('Tag removal failed.', 'error');
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-white dark:bg-zinc-950 selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-6 transition-colors duration-300">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-6xl mx-auto py-12 lg:py-20">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="w-10 h-10 bg-zinc-950 dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-white/5">
                  <Archive className="w-5 h-5 text-trust-green" />
                </div>
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 dark:text-zinc-600">Node_Protocol_v2.0</span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display text-5xl font-black text-zinc-950 dark:text-white tracking-tighter uppercase"
              >
                Official Registry
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-sans text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl font-medium"
              >
                Manage your authenticated identity records and notarized protocol identifiers on the decentralized ledger.
              </motion.p>
            </div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
            >
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="h-14 px-8 bg-zinc-100 dark:bg-trust-green text-zinc-900 dark:text-zinc-950 rounded-2xl font-display font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-zinc-200 dark:hover:bg-trust-green/90 transition-all shadow-xl shadow-zinc-200 dark:shadow-none"
                >
                  <Plus className="w-4 h-4 text-trust-green dark:text-zinc-950" />
                  Official Registration
                </button>
            </motion.div>
          </div>
        </header>

        {/* Modal for Adding Record */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-20">
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isSubmitting && setShowAddModal(false)}
                  className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
               />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden border border-zinc-100 dark:border-white/5"
               >
                  <form onSubmit={handleSubmit}>
                    <div className="p-8 sm:p-10 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
                       <div>
                          <h2 className="font-display text-2xl font-black text-zinc-950 dark:text-white uppercase tracking-tight">Record Enrollment</h2>
                          <p className="font-sans text-xs text-zinc-400 dark:text-zinc-600 font-medium mt-1">Populate the decentralized ledger with official artifacts.</p>
                       </div>
                       <button 
                          type="button"
                          onClick={() => !isSubmitting && setShowAddModal(false)}
                          className="w-10 h-10 bg-zinc-50 dark:bg-zinc-950 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-600 hover:text-zinc-950 dark:hover:text-white transition-colors"
                        >
                          <X className="w-5 h-5" />
                       </button>
                    </div>

                    <div className="p-8 sm:p-10 space-y-8 max-h-[60vh] overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-2">
                               <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest block ml-1">Registry Identifier (ID)</label>
                               <input 
                                  required
                                  type="text" 
                                  placeholder="TC-AUTH-0000"
                                  value={newRecord.registryId}
                                  onChange={e => setNewRecord({...newRecord, registryId: e.target.value.toUpperCase()})}
                                  className="w-full h-14 px-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-2xl focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green font-mono text-sm font-bold tracking-widest uppercase transition-all dark:text-white"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest block ml-1">Artifact Type</label>
                               <select 
                                  value={newRecord.type}
                                  onChange={e => setNewRecord({...newRecord, type: e.target.value})}
                                  className="w-full h-14 px-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-2xl focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green font-display font-bold text-xs uppercase tracking-widest transition-all appearance-none cursor-pointer dark:text-white"
                               >
                                  <option value="identity">Identity Record</option>
                                  <option value="corporate">Corporate Data</option>
                                  <option value="asset">Digital Asset</option>
                                  <option value="legal">Legal Instrument</option>
                               </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                           <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest block ml-1">Official Document Title</label>
                           <input 
                              required
                              type="text" 
                              placeholder="e.g., Certificate of Incorporation"
                              value={newRecord.docName}
                              onChange={e => setNewRecord({...newRecord, docName: e.target.value})}
                              className="w-full h-14 px-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-2xl focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green font-sans text-sm font-bold transition-all dark:text-white"
                           />
                        </div>

                        <div className="space-y-2">
                           <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest block ml-1">Attestation Statement (Optional)</label>
                           <textarea 
                              placeholder="Directives, constraints or notarization notes..."
                              value={newRecord.description}
                              onChange={e => setNewRecord({...newRecord, description: e.target.value})}
                              className="w-full h-32 p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-2xl focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green font-sans text-sm font-medium transition-all resize-none dark:text-white"
                           />
                        </div>

                        <div className="space-y-4">
                           <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest block ml-1">Organization Tags</label>
                           <div className="flex flex-wrap gap-2 mb-2">
                             {newRecord.tags.map(tag => {
                               const color = getTagColor(tag);
                               return (
                                 <span key={tag} className={`flex items-center gap-1.5 px-3 py-1.5 ${color.bg} ${color.text} border ${color.border} rounded-xl`}>
                                   <div className={`w-1 h-1 rounded-full ${color.dot} animate-pulse`} />
                                   <span className="font-display font-bold text-[10px] uppercase tracking-widest">{tag}</span>
                                   <button type="button" onClick={() => setNewRecord({...newRecord, tags: newRecord.tags.filter(t => t !== tag)})}>
                                     <X className="w-3 h-3 hover:text-red-500 transition-colors" />
                                   </button>
                                 </span>
                               );
                             })}
                           </div>
                           <div className="flex gap-2">
                              <div className="relative flex-1 group">
                                <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600 group-focus-within:text-zinc-950 dark:group-focus-within:text-white transition-colors" />
                                <input 
                                  type="text"
                                  placeholder="Enter tag and press Enter..."
                                  value={modalTagInput}
                                  onChange={e => setModalTagInput(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (modalTagInput.trim()) {
                                        setNewRecord({...newRecord, tags: Array.from(new Set([...newRecord.tags, modalTagInput.trim().toLowerCase()]))});
                                        setModalTagInput('');
                                      }
                                    }
                                  }}
                                  className="w-full h-12 pl-12 pr-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-2xl focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green font-sans text-sm font-bold transition-all dark:text-white"
                                />
                              </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest block ml-1">Document Artifact (AWS S3)</label>
                           <div className={`relative border-2 border-dashed rounded-3xl p-8 transition-all ${selectedFile ? 'border-trust-green bg-trust-green/[0.02]' : 'border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-trust-green/50'}`}>
                              <input 
                                type="file" 
                                onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="flex flex-col items-center justify-center text-center">
                                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border transition-all ${selectedFile ? 'bg-trust-green text-white border-trust-green' : 'bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border-zinc-100 dark:border-white/5'}`}>
                                    {selectedFile ? <ShieldCheck className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                                 </div>
                                 <p className="font-display font-bold text-sm text-zinc-950 dark:text-white mb-1">
                                    {selectedFile ? selectedFile.name : 'Upload Official Artifact'}
                                 </p>
                                 <p className="font-sans text-[10px] text-zinc-400 dark:text-zinc-600 font-medium max-w-[200px]">
                                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB recognized` : 'Select the document to be notarized on the registry'}
                                 </p>
                              </div>
                           </div>
                        </div>
                    </div>

                    <div className="p-8 sm:p-10 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-3 text-zinc-400 dark:text-zinc-600">
                           <AlertCircle className="w-4 h-4" />
                           <p className="font-sans text-[10px] font-medium leading-tight">This will consume 1 Registry Credit. Action is immutable.</p>
                        </div>
                        <button 
                           type="submit"
                           disabled={isSubmitting}
                           className="w-full sm:w-auto h-14 px-10 bg-zinc-100 dark:bg-trust-green text-zinc-900 dark:text-zinc-950 rounded-2xl font-display font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-200 dark:hover:bg-trust-green/90 transition-all shadow-xl shadow-zinc-950/10 dark:shadow-none disabled:opacity-50"
                        >
                           {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-trust-green dark:text-zinc-950" /> : <ShieldCheck className="w-4 h-4 text-trust-green dark:text-zinc-950" />}
                           {isSubmitting ? 'Protocol Executing...' : 'Commit to Ledger'}
                        </button>
                    </div>
                  </form>
               </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Search & Filter Bar */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-stretch">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600 group-focus-within:text-trust-green transition-colors" />
            <input 
              type="text" 
              placeholder="Filter by ID, Title or Statement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green transition-all font-sans text-sm font-medium dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-12 px-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl focus:outline-none font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 appearance-none cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
            >
                <option value="all">Global Filter</option>
                <option value="identity">Identity Records</option>
                <option value="corporate">Corporate Data</option>
                <option value="asset">Digital Assets</option>
            </select>
            <button className="h-12 w-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all group">
                <Filter className="w-4 h-4 text-zinc-400 group-hover:text-trust-green transition-colors" />
            </button>
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-4 scrollbar-none">
            <button
              onClick={() => setSelectedTag(null)}
              className={`h-10 px-6 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border whitespace-nowrap ${!selectedTag ? 'bg-zinc-100 dark:bg-trust-green text-zinc-900 dark:text-zinc-950 shadow-xl dark:shadow-none' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-100 dark:border-white/5'}`}
            >
              <Filter className="w-3 h-3" />
              All Artifacts
            </button>
            {allTags.map(tag => {
              const color = getTagColor(tag);
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isActive ? null : tag)}
                  className={`h-10 px-6 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border whitespace-nowrap ${isActive ? `${color.bg} ${color.text} ${color.border} shadow-lg dark:shadow-none` : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-100 dark:border-white/5'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${color.dot} ${isActive ? 'animate-pulse' : ''}`} />
                  {tag}
                </button>
              );
            })}
          </div>
        )}

        {/* Records Table/Grid */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-zinc-50 dark:bg-zinc-900 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[3rem] p-20 text-center border border-zinc-100 dark:border-white/5 transition-all">
            <div className="w-20 h-20 bg-white dark:bg-zinc-950 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-100 dark:border-white/5">
              <Archive className="w-8 h-8 text-zinc-200 dark:text-zinc-800" />
            </div>
            <h3 className="font-display text-2xl font-bold text-zinc-950 dark:text-white mb-2">No Records Detected</h3>
            <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">Your registry queue is currently empty. Authenticate artifacts to populate the ledger.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredRecords.map((record) => (
                <motion.div
                  layout
                  key={record._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 p-6 rounded-[2.5rem] hover:border-trust-green/30 dark:hover:border-trust-green/50 hover:shadow-xl hover:shadow-zinc-200/40 dark:hover:shadow-none transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-950 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-zinc-100 dark:border-white/5 group-hover:bg-trust-green/10 dark:group-hover:bg-trust-green/20 group-hover:border-trust-green/20 dark:group-hover:border-trust-green/30 transition-all">
                        <FileText className="w-6 h-6 text-zinc-400 dark:text-zinc-600 group-hover:text-trust-green" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-display font-black text-xl text-zinc-950 dark:text-white truncate uppercase tracking-tight">{record.docName}</h3>
                          <span className="px-2 py-0.5 bg-zinc-950 dark:bg-trust-green text-white dark:text-zinc-950 font-mono text-[8px] font-black uppercase rounded-lg tracking-widest">{record.type || 'Identity'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                             <Fingerprint className="w-3.5 h-3.5 text-trust-green" />
                             <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 font-bold tracking-widest uppercase">{record.registryId}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Calendar className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700" />
                             <p className="font-sans text-[10px] text-zinc-400 dark:text-zinc-600 font-medium">Genesis: {new Date(record.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Tags Display */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                           {(record.tags || []).map((tag: string) => {
                             const color = getTagColor(tag);
                             return (
                               <span key={tag} className={`flex items-center gap-1.5 px-3 py-1 ${color.bg} ${color.text} border ${color.border} rounded-xl group/tag transition-all hover:scale-105`}>
                                 <div className={`w-1 h-1 rounded-full ${color.dot}`} />
                                 <span className="font-display font-bold text-[9px] uppercase tracking-widest">{tag}</span>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleRemoveTag(record._id, tag, record.tags);
                                   }}
                                   className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-red-500"
                                 >
                                   <X className="w-2.5 h-2.5" />
                                 </button>
                               </span>
                             );
                           })}
                           {editingTagsId === record._id ? (
                             <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1" onClick={e => e.stopPropagation()}>
                               <input 
                                 autoFocus
                                 type="text"
                                 placeholder="Add tag..."
                                 value={tagInput}
                                 onChange={e => setTagInput(e.target.value)}
                                 onKeyDown={e => e.key === 'Enter' && handleUpdateTags(record._id, record.tags || [])}
                                 className="h-8 px-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green dark:text-white font-sans text-[10px] w-28 font-bold"
                               />
                               <button 
                                 onClick={() => setEditingTagsId(null)}
                                 className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-950 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-white/5"
                               >
                                 <X className="w-3.5 h-3.5" />
                               </button>
                             </div>
                           ) : (
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setEditingTagsId(record._id);
                               }}
                               className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-white/10 rounded-xl text-zinc-400 dark:text-zinc-600 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-trust-green/50 transition-all font-display font-bold text-[9px] uppercase tracking-widest"
                             >
                               <Plus className="w-2.5 h-2.5" />
                               Add Tag
                             </button>
                           )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-50 dark:border-white/5">
                      <div className="text-right hidden sm:block">
                        <p className="font-mono text-[9px] text-trust-green font-black uppercase tracking-widest mb-1">Status: Active</p>
                        <div className="flex items-center gap-1.5 justify-end">
                            <span className="w-1 h-1 bg-trust-green rounded-full animate-ping" />
                            <p className="font-mono text-[8px] text-zinc-400 dark:text-zinc-600 font-bold uppercase">Linked to Substrate</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {record.fileKey && (
                          <button 
                            onClick={() => handleDownload(record.fileKey, record.docName)}
                            className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-400 dark:text-zinc-600 hover:bg-trust-green hover:text-white dark:hover:text-zinc-950 transition-all border border-zinc-100 dark:border-white/5"
                            title="Download Official Document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => router.push(`/verify?id=${record.registryId}`)}
                          className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-400 dark:text-zinc-600 hover:bg-zinc-950 dark:hover:bg-white hover:text-white dark:hover:text-zinc-950 transition-all border border-zinc-100 dark:border-white/5"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(record._id)}
                          className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-400 dark:text-zinc-600 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-all border border-zinc-100 dark:border-white/5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {record.description && (
                    <div className="mt-6 p-4 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-white/5 rounded-2xl lg:ml-20">
                      <p className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400 italic leading-relaxed">
                        &quot;{record.description}&quot;
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <footer className="mt-20 p-10 bg-zinc-950 dark:bg-zinc-900 rounded-[3rem] text-white relative overflow-hidden group border dark:border-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-trust-green/10 blur-[100px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-trust-green/20" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-md">
                    <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-2">Immutable Protocol</h3>
                    <p className="font-sans text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                        Registry records are secured by TechCore L2 consensus. Any manual modification to the database substrate will trigger an integrity alert and revoke the record status immediately.
                    </p>
                </div>
                <button 
                   onClick={() => router.push('/notarize')}
                   className="h-14 px-10 bg-trust-green text-zinc-950 rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-trust-green/90 transition-all shadow-xl shadow-trust-green/20 dark:shadow-none"
                >
                    Expand Registry <ArrowUpRight className="w-5 h-5" />
                </button>
            </div>
        </footer>
      </div>
    </main>
  );
}
