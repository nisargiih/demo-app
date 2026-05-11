'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Search, 
  Filter,
  Trash2,
  Calendar,
  Fingerprint,
  FileText,
  Clock,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  X,
  RefreshCw,
  Tag,
  Plus,
  LayoutGrid,
  List,
  SortAsc,
  Download,
  Eye,
  CheckSquare,
  Square
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useNotification } from '@/hooks/use-notification';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { getTagColor } from '@/lib/tag-utils';

export default function VaultPage() {
  const router = useRouter();
  const { notify, confirm } = useNotification();
  const { user, loading } = useUser();
  const [hashes, setHashes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const allTags = Array.from(new Set(hashes.flatMap(h => h.tags || []))).sort();

  const fetchHashes = async () => {
    if (!user?.email) return;

    try {
      const res = await fetch(`/api/hashes?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        setHashes(Array.isArray(data.history) ? data.history : []);
      }
    } catch (err) {
      console.error('Fetch Vault Error:', err);
      notify('Failed to synchronize vault data.', 'error');
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
    fetchHashes();
  }, [user, loading, router]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag, sortBy]);

  const filteredHashes = hashes.filter(h => {
    const matchesSearch = h.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          h.hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (h.tags || []).some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = !selectedTag || (h.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'name') return (a.fileName || '').localeCompare(b.fileName || '');
    if (sortBy === 'size') return b.fileSize - a.fileSize;
    return 0;
  });

  const totalPages = Math.ceil(filteredHashes.length / itemsPerPage);
  const paginatedHashes = filteredHashes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.length === paginatedHashes.length ? [] : paginatedHashes.map(h => h._id));
  };

  const handleBulkDelete = async () => {
    const isConfirmed = await confirm({
      title: 'Bulk Protocol Purge',
      message: `You are about to permanently delete ${selectedIds.length} selected records. This action is irreversible on the secure ledger.`,
      confirmText: 'Purge Selected',
      cancelText: 'Cancel'
    });

    if (!isConfirmed) return;

    try {
      for (const id of selectedIds) {
        await fetch(`/api/hashes?id=${id}&email=${encodeURIComponent(user?.email || '')}`, { method: 'DELETE' });
      }
      setHashes(prev => prev.filter(h => !selectedIds.includes(h._id)));
      setSelectedIds([]);
      notify(`${selectedIds.length} records purged successfully.`, 'success');
    } catch (err) {
      notify('Bulk purge encountered errors.', 'error');
    }
  };

  // Grouping by date helper for paginated view
  const groupedHashes = paginatedHashes.reduce((acc: any, h) => {
    const date = new Date(h.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(h);
    return acc;
  }, {});

  const handleDelete = async (id: string, fileName: string) => {
    const isConfirmed = await confirm({
      title: 'Irreversible Deletion',
      message: `You are about to purge the hash for "${fileName}" from the secure ledger. This cannot be undone.`,
      confirmText: 'Purge Hash',
      cancelText: 'Cancel'
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/hashes?id=${id}&email=${encodeURIComponent(user?.email || '')}`, { method: 'DELETE' });
      if (res.ok) {
        setHashes(prev => prev.filter(h => h._id !== id));
        notify('Hash purged from protocol.', 'success');
      }
    } catch (err) {
      notify('Purge failed due to network error.', 'error');
    }
  };

  const handleUpdateExpiry = async (id: string) => {
    try {
      const res = await fetch('/api/hashes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, expiryDate: newExpiryDate || null, userEmail: user?.email }),
      });

      if (res.ok) {
        setHashes(prev => prev.map(h => h._id === id ? { ...h, expiryDate: newExpiryDate || null } : h));
        setEditingId(null);
        notify('Protocol expiry updated.', 'success');
      }
    } catch (err) {
      notify('Update failed.', 'error');
    }
  };

  const handleUpdateTags = async (id: string, currentTags: string[]) => {
    if (!tagInput.trim()) return;
    const newTags = Array.from(new Set([...currentTags, tagInput.trim().toLowerCase()]));
    
    try {
      const res = await fetch('/api/hashes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tags: newTags, userEmail: user?.email }),
      });

      if (res.ok) {
        setHashes(prev => prev.map(h => h._id === id ? { ...h, tags: newTags } : h));
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
      const res = await fetch('/api/hashes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, tags: newTags, userEmail: user?.email }),
      });

      if (res.ok) {
        setHashes(prev => prev.map(h => h._id === id ? { ...h, tags: newTags } : h));
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
                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-trust-green" />
                </div>
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 dark:text-zinc-600">Vault_Protocol_v4.2</span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display text-5xl font-black text-zinc-950 dark:text-white tracking-tighter uppercase"
              >
                Protocol Vault
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-sans text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl font-medium"
              >
                Manage your cryptographically signed document fingerprints. Control expiry, revoke entries, and monitor chain status.
              </motion.p>
            </div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
            >
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-white/5 flex items-center gap-6">
                    <div className="text-center">
                        <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 uppercase font-black mb-1">Active Hashes</p>
                        <p className="font-display font-black text-xl text-zinc-950 dark:text-white leading-none">{hashes.length}</p>
                    </div>
                    <div className="w-[1px] h-8 bg-zinc-200 dark:bg-zinc-800" />
                    <div className="text-center">
                        <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 uppercase font-black mb-1">Status</p>
                        <p className="font-display font-black text-xl text-trust-green leading-none">Synced</p>
                    </div>
                </div>
            </motion.div>
          </div>
        </header>

        {/* Sticky Utility Section */}
        <div className="sticky top-16 lg:top-0 z-[30] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl pt-4 pb-2 -mx-4 px-4 lg:-mx-6 lg:px-6 mb-8 border-b border-zinc-100/50 dark:border-white/5">
          {/* Search & Actions Bar */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <div className="flex-1 relative group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-trust-green transition-colors" />
              <input 
                type="text" 
                placeholder="Search by filename or hash protocol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green transition-all font-sans text-sm font-medium shadow-sm dark:shadow-none dark:text-white dark:placeholder:text-zinc-700"
              />
            </div>
            
            <div className="flex items-center gap-2 p-1 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 rounded-2xl">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-trust-green shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                title="List View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white dark:bg-zinc-800 text-trust-green shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="relative group">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none h-12 pl-10 pr-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-all focus:outline-none focus:border-trust-green cursor-pointer"
              >
                <option value="newest">Newest Genesis</option>
                <option value="oldest">Oldest Genesis</option>
                <option value="name">Alphabetical</option>
                <option value="size">Record Size</option>
              </select>
              <SortAsc className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          {/* Bulk Selection Header */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-zinc-950 dark:bg-trust-green rounded-2xl flex items-center justify-between shadow-2xl shadow-trust-green/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/10 dark:bg-black/10 rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-4 h-4 text-white dark:text-black" />
                  </div>
                  <p className="font-display font-black text-xs uppercase tracking-widest text-white dark:text-black">
                    {selectedIds.length} Records Selected
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleBulkDelete}
                    className="h-10 px-6 bg-red-500 text-white rounded-xl font-display font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Purge Batch
                  </button>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="h-10 px-6 bg-white/10 dark:bg-black/10 text-white dark:text-black rounded-xl font-display font-black text-[10px] uppercase tracking-widest hover:bg-white/20 dark:hover:bg-black/20 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none">
              <button
                onClick={() => setSelectedTag(null)}
                className={`h-10 px-6 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${!selectedTag ? 'bg-zinc-100 dark:bg-trust-green text-zinc-900 dark:text-zinc-950 shadow-xl shadow-zinc-200 dark:shadow-none font-bold' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-white/5'}`}
              >
                <Filter className="w-3 h-3" />
                All Assets
              </button>
              {allTags.map(tag => {
                const color = getTagColor(tag);
                const isActive = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isActive ? null : tag)}
                    className={`h-10 px-6 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border whitespace-nowrap ${isActive ? `${color.bg} ${color.text} ${color.border} shadow-lg shadow-zinc-100 dark:shadow-none` : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-white/5'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${color.dot} ${isActive ? 'animate-pulse' : ''}`} />
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredHashes.length === 0 ? (
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] p-20 text-center border border-zinc-100 dark:border-white/5">
            <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-100 dark:border-white/5">
              <Shield className="w-8 h-8 text-zinc-200 dark:text-zinc-800" />
            </div>
            <h3 className="font-display text-2xl font-bold text-zinc-950 dark:text-white mb-2">Vault is Empty</h3>
            <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">You haven't notarized any documents yet. Head to the Indexer to begin.</p>
            <button 
                onClick={() => router.push('/notarize')}
                className="mt-8 h-12 px-8 bg-zinc-100 dark:bg-trust-green text-zinc-900 dark:text-zinc-950 rounded-xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-trust-green/90 transition-all shadow-lg dark:shadow-none"
            >
                Go to Indexer
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedHashes).map(([date, items]: [string, any]) => (
                <div key={date} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-[1px] flex-1 bg-zinc-100 dark:bg-zinc-900" />
                    <h2 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600 whitespace-nowrap">{date}</h2>
                    <div className="h-[1px] flex-1 bg-zinc-100 dark:bg-zinc-900" />
                  </div>
                  <div className="space-y-4">
                    {items.map((h: any) => (
                      <motion.div
                        layout
                        key={h._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`group bg-white dark:bg-zinc-900/50 border ${selectedIds.includes(h._id) ? 'border-trust-green shadow-xl shadow-trust-green/10' : 'border-zinc-100 dark:border-white/5'} p-6 rounded-[2.5rem] hover:border-trust-green/30 dark:hover:border-trust-green/50 hover:shadow-xl hover:shadow-zinc-200/40 dark:hover:shadow-none transition-all relative overflow-hidden`}
                      >
                        {selectedIds.includes(h._id) && (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-trust-green/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
                        )}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
                          <div className="flex items-center gap-6 flex-1 min-w-0">
                            <button 
                              onClick={() => toggleSelect(h._id)}
                              className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 border transition-all ${selectedIds.includes(h._id) ? 'bg-trust-green border-trust-green text-zinc-950 shadow-lg shadow-trust-green/20' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-white/5 group-hover:bg-trust-green/10 dark:group-hover:bg-trust-green group-hover:text-trust-green dark:group-hover:text-zinc-950 text-zinc-400 dark:text-zinc-600'}`}
                            >
                              {selectedIds.includes(h._id) ? <CheckSquare className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-display font-black text-xl text-zinc-950 dark:text-white truncate uppercase tracking-tight">{h.fileName}</h3>
                                <span className="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 font-mono text-[8px] font-black uppercase rounded-lg tracking-widest border border-zinc-100 dark:border-white/5">{(h.fileSize / 1024).toFixed(1)} KB</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                   <Fingerprint className="w-3.5 h-3.5 text-trust-green" />
                                   <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-500 font-bold tracking-widest uppercase truncate max-w-[200px]">{h.hash}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                   <Calendar className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700" />
                                   <p className="font-sans text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Genesis: {new Date(h.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                   <Clock className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700" />
                                   <p className={`font-sans text-[10px] font-medium ${h.expiryDate ? 'text-amber-600 dark:text-amber-500' : 'text-trust-green'}`}>
                                      Expiry: {h.expiryDate ? new Date(h.expiryDate).toLocaleDateString() : 'Infinite Protocol'}
                                   </p>
                                </div>
                              </div>

                              {/* Tags Display */}
                              <div className="flex flex-wrap items-center gap-2 mt-4">
                                 {(h.tags || []).map((tag: string) => {
                                   const color = getTagColor(tag);
                                   return (
                                     <span key={tag} className={`flex items-center gap-1.5 px-3 py-1 ${color.bg} ${color.text} border ${color.border} rounded-xl group/tag transition-all hover:scale-105`}>
                                       <div className={`w-1 h-1 rounded-full ${color.dot}`} />
                                       <span className="font-display font-bold text-[9px] uppercase tracking-widest">{tag}</span>
                                       <button 
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleRemoveTag(h._id, tag, h.tags);
                                         }}
                                         className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-red-500"
                                       >
                                         <X className="w-2.5 h-2.5" />
                                       </button>
                                     </span>
                                   );
                                 })}
                                 {editingTagsId === h._id ? (
                                   <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1" onClick={e => e.stopPropagation()}>
                                     <input 
                                       autoFocus
                                       type="text"
                                       placeholder="Add tag..."
                                       value={tagInput}
                                       onChange={e => setTagInput(e.target.value)}
                                       onKeyDown={e => e.key === 'Enter' && handleUpdateTags(h._id, h.tags || [])}
                                       className="h-8 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/5 rounded-xl focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green font-sans text-[10px] w-28 font-bold dark:text-white"
                                     />
                                     <button 
                                       onClick={() => setEditingTagsId(null)}
                                       className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-950 dark:hover:text-white bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-white/5"
                                     >
                                       <X className="w-3.5 h-3.5" />
                                     </button>
                                   </div>
                                 ) : (
                                   <button 
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setEditingTagsId(h._id);
                                     }}
                                     className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-white/10 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-300 hover:border-zinc-300 transition-all font-display font-medium"
                                   >
                                     <Plus className="w-2.5 h-2.5" />
                                     <span className="font-display font-bold text-[9px] uppercase tracking-widest">Add Tag</span>
                                   </button>
                                 )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                              {editingId === h._id ? (
                                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                      <input 
                                          type="date"
                                          value={newExpiryDate}
                                          onChange={(e) => setNewExpiryDate(e.target.value)}
                                          className="h-10 px-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl font-sans text-xs focus:outline-none focus:border-zinc-950 dark:focus:border-trust-green dark:text-white"
                                      />
                                      <button 
                                          onClick={() => handleUpdateExpiry(h._id)}
                                          className="h-10 px-4 bg-zinc-100 dark:bg-trust-green text-zinc-900 dark:text-zinc-950 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg dark:shadow-none"
                                      >
                                          Confirm
                                      </button>
                                      <button 
                                          onClick={() => setEditingId(null)}
                                          className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-950 dark:text-zinc-600 dark:hover:text-white transition-colors"
                                      >
                                          <X className="w-4 h-4" />
                                      </button>
                                  </div>
                              ) : (
                                  <>
                                      <button 
                                          onClick={() => {
                                              setEditingId(h._id);
                                              setNewExpiryDate(h.expiryDate ? new Date(h.expiryDate).toISOString().split('T')[0] : '');
                                          }}
                                          className="h-10 px-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-500 hover:bg-zinc-950 dark:hover:bg-trust-green hover:text-white dark:hover:text-zinc-950 hover:border-zinc-950 transition-all"
                                      >
                                          Update Expiry
                                      </button>
                                      <button 
                                          onClick={() => router.push(`/verify?hash=${h.hash}`)}
                                          className="w-10 h-10 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-xl text-zinc-400 dark:text-zinc-600 hover:bg-zinc-950 dark:hover:bg-trust-green hover:text-white dark:hover:text-zinc-950 hover:border-zinc-950 transition-all"
                                      >
                                          <ArrowUpRight className="w-4 h-4" />
                                      </button>
                                      <button 
                                          onClick={() => handleDelete(h._id, h.fileName)}
                                          className="w-10 h-10 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-xl text-zinc-300 dark:text-zinc-700 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 hover:border-red-100 transition-all"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </>
                              )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-xl shadow-zinc-200/20 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-white/5">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">
                      <button 
                        onClick={toggleSelectAll}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.length === filteredHashes.length ? 'bg-trust-green border-trust-green text-zinc-950' : 'border-zinc-200 dark:border-zinc-800'}`}
                      >
                         {selectedIds.length === filteredHashes.length && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className="px-6 py-4 font-mono text-[9px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Protocol Artifact</th>
                    <th className="px-6 py-4 font-mono text-[9px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Verification Hash</th>
                    <th className="px-6 py-4 font-mono text-[9px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Size</th>
                    <th className="px-6 py-4 font-mono text-[9px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Genesis</th>
                    <th className="px-6 py-4 font-mono text-[9px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                  <AnimatePresence mode="popLayout">
                    {paginatedHashes.map(h => (
                      <motion.tr 
                        layout
                        key={h._id} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`group transition-colors ${selectedIds.includes(h._id) ? 'bg-trust-green/5' : 'hover:bg-zinc-50 dark:hover:bg-trust-green/5'}`}
                      >
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => toggleSelect(h._id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${selectedIds.includes(h._id) ? 'bg-trust-green border-trust-green text-zinc-950' : 'border-zinc-100 dark:border-zinc-800 group-hover:border-zinc-300 dark:group-hover:border-zinc-600'}`}
                          >
                             {selectedIds.includes(h._id) && <CheckSquare className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-trust-green transition-colors" />
                            <div>
                                <p className="font-display font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-tight truncate max-w-[150px]">{h.fileName}</p>
                                <div className="flex gap-1 mt-1">
                                    {(h.tags || []).slice(0, 2).map((t: string) => (
                                        <span key={t} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono text-[7px] font-black uppercase rounded tracking-tighter">{t}</span>
                                    ))}
                                    {h.tags?.length > 2 && <span className="px-1.5 py-0.5 text-zinc-400 font-mono text-[7px] font-black uppercase">+{h.tags.length - 2}</span>}
                                </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Fingerprint className="w-3.5 h-3.5 text-trust-green/50" />
                            <code className="font-mono text-[10px] text-zinc-400 dark:text-zinc-600 font-bold">{h.hash?.slice(0, 8)}...{h.hash?.slice(-8)}</code>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase">{(h.fileSize / 1024).toFixed(1)} KB</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-[10px] text-zinc-400 font-bold">{new Date(h.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => router.push(`/verify?hash=${h.hash}`)}
                               className="p-2 text-zinc-400 hover:text-trust-green transition-colors"
                               title="Verify Protocol"
                             >
                                <Eye className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => handleDelete(h._id, h.fileName)}
                                className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                                title="Purge Record"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-1.5 px-4 mb-10">
            <button
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === 1}
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-100 dark:border-white/5 disabled:opacity-30 bg-white dark:bg-zinc-900 text-zinc-500 transition-all hover:bg-zinc-50 dark:hover:bg-white/5"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {(() => {
                const pages = [];
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentPage(i);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`h-10 w-10 rounded-xl font-display font-black text-[10px] uppercase tracking-widest transition-all border ${
                        currentPage === i
                          ? "bg-zinc-950 dark:bg-trust-green text-white dark:text-zinc-950 border-transparent shadow-lg shadow-trust-green/20"
                          : "bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10"
                      }`}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}
            </div>

            <button
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === totalPages}
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-100 dark:border-white/5 disabled:opacity-30 bg-white dark:bg-zinc-900 text-zinc-500 transition-all hover:bg-zinc-50 dark:hover:bg-white/5"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <footer className="mt-20 p-10 bg-zinc-950 dark:bg-zinc-900 rounded-[3rem] text-white relative overflow-hidden group border border-zinc-900/50 dark:border-white/10 transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-trust-green/10 blur-[100px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-trust-green/20" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-md">
                    <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-2">Immutable Protocol</h3>
                    <p className="font-sans text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                        Hash records are secured by decentralized notarization. Deleting a record here revokes its validity on the public verification interface.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                     onClick={() => {
                       const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(hashes, null, 2));
                       const downloadAnchorNode = document.createElement('a');
                       downloadAnchorNode.setAttribute("href",     dataStr);
                       downloadAnchorNode.setAttribute("download", "protocol_vault_ledger.json");
                       document.body.appendChild(downloadAnchorNode);
                       downloadAnchorNode.click();
                       downloadAnchorNode.remove();
                       notify('Ledger exported successfully.', 'success');
                     }}
                     className="hidden md:flex h-14 px-8 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl items-center gap-3 hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-all border border-zinc-800 dark:border-white/10 font-display font-black text-[10px] uppercase tracking-widest group/btn"
                  >
                      <Download className="w-5 h-5 text-trust-green group-hover/btn:scale-110 transition-transform" /> Export Ledger
                  </button>
                  <button 
                     onClick={() => fetchHashes()}
                     className="h-14 w-14 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-all border border-zinc-800 dark:border-white/10"
                  >
                      <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                    <button 
                       onClick={() => router.push('/notarize')}
                       className="h-14 px-10 bg-trust-green text-zinc-950 rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-trust-green/90 transition-all shadow-xl shadow-trust-green/20 dark:shadow-none"
                    >
                        Index More Records <ArrowUpRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </footer>
      </div>
    </main>
  );
}
