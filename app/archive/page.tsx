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
  AlertCircle
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';

export default function ArchivePage() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState('');

  const fetchHistory = useCallback(async () => {
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
    if (!confirm('Are you sure you want to remove this ledger entry?')) return;
    
    try {
      const res = await fetch(`/api/hashes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(history.filter(h => h._id !== id));
      }
    } catch (err) {
      console.error(err);
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

  const filteredHistory = history.filter(item => 
    item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.hash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-6xl mx-auto py-12 lg:py-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="w-10 h-10 bg-trust-green/10 rounded-xl flex items-center justify-center text-trust-green">
                <History className="w-5 h-5" />
              </div>
              <h1 className="font-display text-4xl font-bold text-zinc-900">Hash Archive</h1>
            </motion.div>
            <p className="font-sans text-zinc-500">Manage and oversee your registered cryptographic signatures.</p>
          </div>

          <div className="flex gap-3">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search ledger..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-xs w-64 transition-all"
              />
            </div>
            <button className="w-11 h-11 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-zinc-50 border border-zinc-100 rounded-3xl animate-pulse" />
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
                className="group relative bg-white border border-zinc-100 hover:border-trust-green/20 hover:shadow-xl hover:shadow-zinc-200/40 rounded-[2rem] p-6 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center shrink-0">
                    <FileText className="w-7 h-7 text-zinc-300" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-zinc-900 truncate">{item.fileName}</h3>
                      <div className="px-2 py-0.5 bg-trust-green/10 text-trust-green rounded-md font-mono text-[9px] font-bold uppercase">Verified</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-mono text-[10px] text-zinc-400 truncate">SHA256: <span className="text-zinc-900 font-bold">{item.hash}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase mb-1">Expiry Status</p>
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
                        <div className="flex items-center justify-end gap-2 text-zinc-900 font-display font-bold text-xs">
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'Perpetual'}
                          <button onClick={() => { setEditingId(item._id); setNewExpiry(item.expiryDate || ''); }} className="text-zinc-300 hover:text-trust-green transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="h-10 w-px bg-zinc-100 hidden md:block" />

                    <div className="flex items-center gap-2">
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
