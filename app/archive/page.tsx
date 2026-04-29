'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Trash2, 
  Calendar, 
  FileText, 
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  X,
  Edit2,
  ShieldCheck,
  AlertCircle,
  Check,
  CalendarDays
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useNotification } from '@/hooks/use-notification';

import { useRouter } from 'next/navigation';
import { SecurityService } from '@/lib/security-service';

export default function ArchivePage() {
  const { notify, confirm } = useNotification();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkExpiry, setBulkExpiry] = useState('');

  const fetchHistory = useCallback(async () => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) return;

    try {
      const res = await fetch(`/api/hashes?email=${email}`);
      if (res.ok) {
        const body = await res.json();
        // Process encrypted response from transit
        const data = SecurityService.processFromTransit(body);
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchHistory();
    };
    init();
  }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Remove Ledger Entry',
      message: 'Are you sure you want to remove this ledger entry? This action is irreversible.',
      confirmText: 'Delete Entry',
      cancelText: 'Keep Entry'
    });
    
    if (!ok) return;
    
    try {
      const res = await fetch(`/api/hashes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(history.filter(h => h._id !== id));
        notify('Archive entry successfully purged.', 'success');
      }
    } catch (err) {
      console.error(err);
      notify('Failed to delete entry.', 'error');
    }
  };

  const handleUpdateExpiry = async (id: string) => {
    try {
      const res = await fetch('/api/hashes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, expiryDate: newExpiry }),
      });
      if (res.ok) {
        setHistory(history.map(h => h._id === id ? { ...h, expiryDate: newExpiry } : h));
        setEditingId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkUpdateExpiry = async () => {
    if (!bulkExpiry) return;
    try {
      const res = await fetch('/api/hashes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, expiryDate: bulkExpiry }),
      });
      if (res.ok) {
        setHistory(history.map(h => selectedIds.includes(h._id) ? { ...h, expiryDate: bulkExpiry } : h));
        setSelectedIds([]);
        setIsBulkEditing(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredHistory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHistory.map(h => h._id));
    }
  };

  const filteredHistory = history.filter(item => 
    item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.hash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6">
      <BackgroundAnimation />
      <Sidebar />
 
      <div className="relative z-10 w-full max-w-6xl mx-auto py-8 sm:py-12 lg:py-20">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-trust-green/10 rounded-xl flex items-center justify-center text-trust-green">
                <History className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900">Hash Archive</h1>
            </motion.div>
            <p className="font-sans text-sm text-zinc-500">Manage and oversee your registered cryptographic signatures.</p>
          </div>
 
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
             <AnimatePresence>
               {selectedIds.length > 0 && (
                 <motion.div 
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="flex items-center gap-2 px-3 sm:px-4 bg-zinc-950 text-white rounded-xl h-10 lg:h-11 shadow-lg shadow-zinc-950/20"
                 >
                   <span className="font-mono text-[8px] sm:text-[9px] font-bold mr-1 sm:mr-2 whitespace-nowrap">{selectedIds.length} SELECTED</span>
                   <div className="h-4 w-px bg-white/10 mx-1" />
                   {isBulkEditing ? (
                     <div className="flex items-center gap-1 sm:gap-2">
                       <input 
                         type="date"
                         className="bg-zinc-800 border-none rounded-lg px-2 py-1 text-[8px] sm:text-[10px] text-white focus:ring-1 focus:ring-trust-green outline-none w-20 sm:w-auto"
                         value={bulkExpiry}
                         onChange={(e) => setBulkExpiry(e.target.value)}
                       />
                       <button 
                         onClick={handleBulkUpdateExpiry} 
                         className="p-1 hover:text-trust-green transition-colors"
                         title="Apply Expiry"
                       >
                         <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                       </button>
                       <button 
                         onClick={() => setIsBulkEditing(false)} 
                         className="p-1 hover:text-red-400 transition-colors"
                         title="Cancel"
                       >
                         <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                       </button>
                     </div>
                   ) : (
                     <button 
                       onClick={() => setIsBulkEditing(true)}
                       className="flex items-center gap-1.5 hover:text-trust-green transition-colors text-[8px] sm:text-[9px] font-bold uppercase tracking-widest whitespace-nowrap"
                     >
                       <Calendar className="w-3 h-3" />
                       Bulk Expiry
                     </button>
                   )}
                 </motion.div>
               )}
             </AnimatePresence>
             
             <button 
               onClick={toggleSelectAll}
               className={`h-10 lg:h-11 px-3 sm:px-4 rounded-xl border transition-all flex items-center gap-2 font-display font-bold text-[9px] sm:text-[10px] uppercase tracking-widest whitespace-nowrap ${
                 selectedIds.length > 0 
                   ? 'bg-trust-green text-white border-trust-green shadow-lg shadow-trust-green/20' 
                   : 'bg-zinc-50 text-zinc-400 border-zinc-100 hover:border-zinc-200'
               }`}
             >
               <Check className={`w-3 h-3 ${selectedIds.length === filteredHistory.length ? 'text-white' : 'text-zinc-300'}`} />
               <span className="hidden sm:inline">{selectedIds.length === filteredHistory.length ? 'Deselect All' : 'Select All'}</span>
               <span className="sm:hidden">ALL</span>
             </button>
 
             <div className="relative flex-1 lg:flex-none min-w-[150px]">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
               <input 
                 type="text" 
                 placeholder="Search ledger..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="h-10 lg:h-11 pl-9 lg:pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-xs w-full lg:w-64 transition-all"
               />
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-zinc-50 border border-zinc-100 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredHistory.map((item, i) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`group relative bg-white border rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 transition-all ${
                  selectedIds.includes(item._id) ? 'border-trust-green shadow-xl shadow-trust-green/5' : 'border-zinc-100 hover:border-trust-green/20 hover:shadow-xl hover:shadow-zinc-200/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center justify-between sm:justify-start gap-4">
                    <button 
                      onClick={() => toggleSelect(item._id)}
                      className={`shrink-0 w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                        selectedIds.includes(item._id) 
                          ? 'bg-trust-green border-trust-green text-white' 
                          : 'border-zinc-100 hover:border-zinc-200 bg-zinc-50/50'
                      }`}
                    >
                      {selectedIds.includes(item._id) && <Check className="w-4 h-4" />}
                    </button>
  
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-zinc-50 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300" />
                    </div>

                    <div className="flex sm:hidden items-center gap-2">
                       <button 
                        onClick={() => handleDelete(item._id)}
                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-zinc-900 truncate max-w-full">{item.fileName}</h3>
                      <div className="px-2 py-0.5 bg-trust-green/5 text-trust-green border border-trust-green/20 rounded-md font-mono text-[8px] font-bold uppercase tracking-wider">Authenticated</div>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <p className="font-mono text-[9px] sm:text-[10px] text-zinc-400 truncate">SHA256: <span className="text-zinc-900 font-bold">{item.hash}</span></p>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <CalendarDays className="w-3 h-3" />
                      <span className="font-sans text-[10px] font-medium">Issued on {new Date(item.createdAt || 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
 
                  <div className="flex items-center justify-between sm:justify-end gap-4 lg:gap-8 pt-4 sm:pt-0 border-t sm:border-none border-zinc-50">
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-[8px] sm:text-[10px] text-zinc-400 font-bold uppercase mb-1">Expiry Status</p>
                      {editingId === item._id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="date" 
                            className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-[10px] font-sans"
                            value={newExpiry}
                            onChange={(e) => setNewExpiry(e.target.value)}
                          />
                          <button onClick={() => handleUpdateExpiry(item._id)} className="text-trust-green">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-zinc-300">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-start sm:justify-end gap-2 text-zinc-900 font-display font-bold text-[11px] sm:text-xs">
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'Perpetual'}
                          <button onClick={() => { setEditingId(item._id); setNewExpiry(item.expiryDate || ''); }} className="text-zinc-300 hover:text-trust-green transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
 
                    <div className="h-10 w-px bg-zinc-100 hidden sm:block" />
 
                    <div className="hidden sm:flex items-center gap-2">
                       <button 
                        onClick={() => handleDelete(item._id)}
                        className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-50 rounded-[3rem] border border-dashed border-zinc-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Search className="w-6 h-6 text-zinc-200" />
            </div>
            <h3 className="font-display font-bold text-xl text-zinc-900 mb-2">No records found</h3>
            <p className="font-sans text-sm text-zinc-400">Try adjusting your search criteria or register a new document.</p>
          </div>
        )}

        <footer className="mt-20 pt-8 border-t border-zinc-100 flex justify-between items-center">
          <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">System_Protocol_Active</p>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-trust-green" />
              <span className="font-display font-bold text-[10px] text-zinc-900">E2E Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="font-display font-bold text-[10px] text-zinc-900">Immortal Ledger</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
