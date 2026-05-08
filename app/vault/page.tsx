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
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  X,
  RefreshCw,
  Tag,
  Plus
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useNotification } from '@/hooks/use-notification';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';

export default function VaultPage() {
  const router = useRouter();
  const { notify, confirm } = useNotification();
  const { user, loading } = useUser();
  const [hashes, setHashes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [tagInput, setTagInput] = useState('');

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

  const filteredHashes = hashes.filter(h => {
    const matchesSearch = h.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          h.hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (h.tags || []).some((t: string) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = !selectedTag || (h.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

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
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-6">
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
                <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-trust-green" />
                </div>
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Vault_Protocol_v4.2</span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display text-5xl font-black text-zinc-950 tracking-tighter uppercase"
              >
                Protocol Vault
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-sans text-zinc-500 mt-2 max-w-xl font-medium"
              >
                Manage your cryptographically signed document fingerprints. Control expiry, revoke entries, and monitor chain status.
              </motion.p>
            </div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
            >
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-6">
                    <div className="text-center">
                        <p className="font-mono text-[9px] text-zinc-400 uppercase font-black mb-1">Active Hashes</p>
                        <p className="font-display font-black text-xl text-zinc-950 leading-none">{hashes.length}</p>
                    </div>
                    <div className="w-[1px] h-8 bg-zinc-200" />
                    <div className="text-center">
                        <p className="font-mono text-[9px] text-zinc-400 uppercase font-black mb-1">Status</p>
                        <p className="font-display font-black text-xl text-trust-green leading-none">Synced</p>
                    </div>
                </div>
            </motion.div>
          </div>
        </header>

        {/* Search Bar */}
        <div className="mb-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-trust-green transition-colors" />
          <input 
            type="text" 
            placeholder="Search by filename or hash protocol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:border-zinc-950 transition-all font-sans text-sm font-medium shadow-sm"
          />
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-1.5 rounded-full font-display font-bold text-[10px] uppercase tracking-widest transition-all ${!selectedTag ? 'bg-zinc-950 text-white shadow-lg shadow-zinc-200' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}
            >
              All Assets
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-4 py-1.5 rounded-full font-display font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedTag === tag ? 'bg-trust-green text-zinc-950 shadow-lg shadow-trust-green/20' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* List Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-zinc-50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredHashes.length === 0 ? (
          <div className="bg-zinc-50 rounded-[3rem] p-20 text-center border border-zinc-100">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-100">
              <Shield className="w-8 h-8 text-zinc-200" />
            </div>
            <h3 className="font-display text-2xl font-bold text-zinc-950 mb-2">Vault is Empty</h3>
            <p className="font-sans text-sm text-zinc-500 max-w-sm mx-auto">You haven't notarized any documents yet. Head to the Indexer to begin.</p>
            <button 
                onClick={() => router.push('/notarize')}
                className="mt-8 h-12 px-8 bg-zinc-950 text-white rounded-xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg"
            >
                Go to Indexer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredHashes.map((h) => (
                <motion.div
                  layout
                  key={h._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group bg-white border border-zinc-100 p-6 rounded-[2.5rem] hover:border-trust-green/30 hover:shadow-xl hover:shadow-zinc-200/40 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <div className="w-14 h-14 bg-zinc-50 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-zinc-100 group-hover:bg-trust-green/10 group-hover:border-trust-green/20 transition-all">
                        <FileText className="w-6 h-6 text-zinc-400 group-hover:text-trust-green" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-display font-black text-xl text-zinc-950 truncate uppercase tracking-tight">{h.fileName}</h3>
                          <span className="px-2 py-0.5 bg-zinc-50 text-zinc-400 font-mono text-[8px] font-black uppercase rounded-lg tracking-widest border border-zinc-100">{(h.fileSize / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                             <Fingerprint className="w-3.5 h-3.5 text-trust-green" />
                             <p className="font-mono text-[9px] text-zinc-400 font-bold tracking-widest uppercase truncate max-w-[200px]">{h.hash}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Calendar className="w-3.5 h-3.5 text-zinc-300" />
                             <p className="font-sans text-[10px] text-zinc-400 font-medium">Genesis: {new Date(h.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Clock className="w-3.5 h-3.5 text-zinc-300" />
                             <p className={`font-sans text-[10px] font-medium ${h.expiryDate ? 'text-amber-600' : 'text-trust-green'}`}>
                               Expiry: {h.expiryDate ? new Date(h.expiryDate).toLocaleDateString() : 'Infinite Protocol'}
                             </p>
                          </div>
                        </div>

                        {/* Tags Display */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                           {(h.tags || []).map((tag: string) => (
                             <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-zinc-100 rounded-lg group/tag">
                               <span className="font-display font-bold text-[9px] uppercase tracking-widest text-zinc-500">{tag}</span>
                               <button 
                                 onClick={() => handleRemoveTag(h._id, tag, h.tags)}
                                 className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-red-500"
                               >
                                 <X className="w-2.5 h-2.5" />
                               </button>
                             </span>
                           ))}
                           {editingTagsId === h._id ? (
                             <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1">
                               <input 
                                 autoFocus
                                 type="text"
                                 placeholder="Add tag..."
                                 value={tagInput}
                                 onChange={e => setTagInput(e.target.value)}
                                 onKeyDown={e => e.key === 'Enter' && handleUpdateTags(h._id, h.tags || [])}
                                 className="h-7 px-2 bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:border-zinc-950 font-sans text-[10px] w-24"
                               />
                               <button 
                                 onClick={() => setEditingTagsId(null)}
                                 className="text-zinc-400 hover:text-zinc-950"
                               >
                                 <X className="w-3.5 h-3.5" />
                               </button>
                             </div>
                           ) : (
                             <button 
                               onClick={() => setEditingTagsId(h._id)}
                               className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 border border-dashed border-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-950 hover:border-zinc-300 transition-all"
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
                                    className="h-10 px-4 bg-zinc-50 border border-zinc-200 rounded-xl font-sans text-xs focus:outline-none focus:border-zinc-950"
                                />
                                <button 
                                    onClick={() => handleUpdateExpiry(h._id)}
                                    className="h-10 px-4 bg-zinc-950 text-white rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all"
                                >
                                    Confirm
                                </button>
                                <button 
                                    onClick={() => setEditingId(null)}
                                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-950 transition-colors"
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
                                    className="h-10 px-4 bg-zinc-50 border border-zinc-100 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-500 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all"
                                >
                                    Update Expiry
                                </button>
                                <button 
                                    onClick={() => router.push(`/verify?hash=${h.hash}`)}
                                    className="w-10 h-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-400 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all"
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(h._id, h.fileName)}
                                    className="w-10 h-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-300 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <footer className="mt-20 p-10 bg-zinc-950 rounded-[3rem] text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-trust-green/10 blur-[100px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-trust-green/20" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-md">
                    <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-2">Immutable Protocol</h3>
                    <p className="font-sans text-xs text-zinc-500 leading-relaxed font-medium">
                        Hash records are secured by decentralized notarization. Deleting a record here revokes its validity on the public verification interface.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                     onClick={() => fetchHashes()}
                     className="h-14 w-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center hover:bg-zinc-800 transition-all border border-zinc-800"
                  >
                      <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                    <button 
                       onClick={() => router.push('/notarize')}
                       className="h-14 px-10 bg-trust-green text-zinc-950 rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-trust-green/90 transition-all shadow-xl shadow-trust-green/20"
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
