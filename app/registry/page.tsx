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
  ArrowUpRight
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useNotification } from '@/hooks/use-notification';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';

export default function RegistryPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const { user, loading } = useUser();
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

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

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      (record.registryId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.docName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterType === 'all') return matchesSearch;
    return matchesSearch && record.type === filterType;
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
                  <Archive className="w-5 h-5 text-trust-green" />
                </div>
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Node_Protocol_v2.0</span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display text-5xl font-black text-zinc-950 tracking-tighter uppercase"
              >
                Official Registry
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-sans text-zinc-500 mt-2 max-w-xl font-medium"
              >
                Manage your authenticated identity records and notarized protocol identifiers on the decentralized ledger.
              </motion.p>
            </div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
            >
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-6">
                    <div className="text-center">
                        <p className="font-mono text-[9px] text-zinc-400 uppercase font-black mb-1">Total Records</p>
                        <p className="font-display font-black text-xl text-zinc-950 leading-none">{records.length}</p>
                    </div>
                    <div className="w-[1px] h-8 bg-zinc-200" />
                    <div className="text-center">
                        <p className="font-mono text-[9px] text-zinc-400 uppercase font-black mb-1">Node Health</p>
                        <p className="font-display font-black text-xl text-trust-green leading-none">99.9%</p>
                    </div>
                </div>
            </motion.div>
          </div>
        </header>

        {/* Search & Filter Bar */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-stretch">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-trust-green transition-colors" />
            <input 
              type="text" 
              placeholder="Filter by ID, Title or Statement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:border-zinc-950 transition-all font-sans text-sm font-medium"
            />
          </div>
          <div className="flex gap-2">
            <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-12 px-6 bg-white border border-zinc-200 rounded-2xl focus:outline-none font-display text-[10px] font-bold uppercase tracking-widest text-zinc-600 appearance-none cursor-pointer hover:border-zinc-300 transition-all"
            >
                <option value="all">Global Filter</option>
                <option value="identity">Identity Records</option>
                <option value="corporate">Corporate Data</option>
                <option value="asset">Digital Assets</option>
            </select>
            <button className="h-12 w-12 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center hover:bg-zinc-50 transition-all">
                <Filter className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Records Table/Grid */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-zinc-50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-zinc-50 rounded-[3rem] p-20 text-center border border-zinc-100">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-100">
              <Archive className="w-8 h-8 text-zinc-200" />
            </div>
            <h3 className="font-display text-2xl font-bold text-zinc-950 mb-2">No Records Detected</h3>
            <p className="font-sans text-sm text-zinc-500 max-w-sm mx-auto">Your registry queue is currently empty. Authenticate artifacts to populate the ledger.</p>
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
                  className="group bg-white border border-zinc-100 p-6 rounded-[2.5rem] hover:border-trust-green/30 hover:shadow-xl hover:shadow-zinc-200/40 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <div className="w-14 h-14 bg-zinc-50 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-zinc-100 group-hover:bg-trust-green/10 group-hover:border-trust-green/20 transition-all">
                        <FileText className="w-6 h-6 text-zinc-400 group-hover:text-trust-green" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-display font-black text-xl text-zinc-950 truncate uppercase tracking-tight">{record.docName}</h3>
                          <span className="px-2 py-0.5 bg-zinc-950 text-white font-mono text-[8px] font-black uppercase rounded-lg tracking-widest">{record.type || 'Identity'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                             <Fingerprint className="w-3.5 h-3.5 text-trust-green" />
                             <p className="font-mono text-[9px] text-zinc-400 font-bold tracking-widest uppercase">{record.registryId}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <Calendar className="w-3.5 h-3.5 text-zinc-300" />
                             <p className="font-sans text-[10px] text-zinc-400 font-medium">Genesis: {new Date(record.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-50">
                      <div className="text-right hidden sm:block">
                        <p className="font-mono text-[9px] text-trust-green font-black uppercase tracking-widest mb-1">Status: Active</p>
                        <div className="flex items-center gap-1.5 justify-end">
                            <span className="w-1 h-1 bg-trust-green rounded-full animate-ping" />
                            <p className="font-mono text-[8px] text-zinc-400 font-bold uppercase">Linked to Substrate</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => router.push(`/verify?id=${record.registryId}`)}
                          className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 hover:bg-zinc-950 hover:text-white transition-all border border-zinc-100"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(record._id)}
                          className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all border border-zinc-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {record.description && (
                    <div className="mt-6 p-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl lg:ml-20">
                      <p className="font-sans text-[11px] text-zinc-500 italic leading-relaxed">
                        &quot;{record.description}&quot;
                      </p>
                    </div>
                  )}
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
                        Registry records are secured by TechCore L2 consensus. Any manual modification to the database substrate will trigger an integrity alert and revoke the record status immediately.
                    </p>
                </div>
                <button 
                   onClick={() => router.push('/notarize')}
                   className="h-14 px-10 bg-trust-green text-zinc-950 rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-trust-green/90 transition-all shadow-xl shadow-trust-green/20"
                >
                    Expand Registry <ArrowUpRight className="w-5 h-5" />
                </button>
            </div>
        </footer>
      </div>
    </main>
  );
}
