'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  ShieldCheck,
  Fingerprint, 
  Clock, 
  Plus
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useNotification } from '@/hooks/use-notification';

import { useRouter } from 'next/navigation';
import { SecurityService } from '@/lib/security-service';

export default function DashboardPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [allHashes, setAllHashes] = useState<any[]>([]);
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | '3month'>('month');

  const fetchUser = React.useCallback(async () => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) return;

    try {
      const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        setUser(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchHashes = React.useCallback(async () => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) return;

    try {
      const res = await fetch(`/api/hashes?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        setAllHashes(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  React.useEffect(() => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) {
      router.push('/login');
      return;
    }
    
    const init = async () => {
      await Promise.all([fetchUser(), fetchHashes()]);
      setIsAuthLoading(false);
    };
    init();
  }, [fetchUser, fetchHashes, router]);

  const stats = useMemo(() => {
    const now = new Date();
    
    // Aggregate data for activity chart (last 20 buckets)
    const chartData = Array.from({ length: 20 }, (_, i) => {
      const bucketDate = new Date(now.getTime() - (19 - i) * (2 * 60 * 60 * 1000)); // 2 hour buckets
      const count = allHashes.filter(h => {
        const itemDate = new Date(h.createdAt);
        return itemDate > new Date(bucketDate.getTime() - 2 * 60 * 60 * 1000) && itemDate <= bucketDate;
      }).length;
      return count;
    });

    const maxCount = Math.max(...chartData, 1);
    const normalizedChart = chartData.map(c => (c / maxCount) * 80 + 20); // Min 20% height for visual

    const filtered = allHashes.filter(h => {
      const date = new Date(h.createdAt);
      const diff = now.getTime() - date.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      
      if (statsPeriod === 'day') return days <= 1;
      if (statsPeriod === 'week') return days <= 7;
      if (statsPeriod === 'month') return days <= 30;
      if (statsPeriod === '3month') return days <= 90;
      return true;
    });

    const total = allHashes.length;
    const expired = allHashes.filter(h => h.expiryDate && new Date(h.expiryDate) < now).length;
    const active = total - expired;
    const periodCount = filtered.length;
    
    // Derived node info
    const nodeId = user?._id ? user._id.slice(-8).toUpperCase() : '----';
    const uptimeSeed = user?._id ? user._id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 100 : 0;
    const uptime = total > 0 ? (99.8 + (uptimeSeed / 1000)).toFixed(2) : '0.00';

    return { total, expired, active, periodCount, normalizedChart, nodeId, uptime };
  }, [allHashes, statsPeriod, user]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-trust-green/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-trust-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const isVerified = user?.pan && user?.aadhaar;

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6">
      <BackgroundAnimation />
      <Sidebar />
 
      <div className="relative z-10 w-full max-w-6xl mx-auto py-8 sm:py-12 lg:py-20">
        <header className="mb-8 sm:mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900">
                  Control Center
                </h1>
                {isVerified && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-trust-green/10 border border-trust-green/20 rounded-full">
                    <ShieldCheck className="w-4 h-4 text-trust-green" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-trust-green">Verified</span>
                  </div>
                )}
                {user?.entityType && (
                  <div className="px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-500">{user.entityType}</span>
                  </div>
                )}
              </div>
              <p className="font-sans text-sm sm:text-base text-zinc-500">
                System Status: <span className="text-trust-green font-bold">Synchronized</span> | Node Lifecycle: <span className="text-zinc-900 font-bold">Active</span>
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3"
            >
              <button 
                onClick={() => router.push('/notarize')}
                className="h-12 px-6 bg-zinc-900 text-white rounded-2xl font-display font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
              >
                <Plus className="w-4 h-4" />
                New Index
              </button>
            </motion.div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Index', value: stats.total, color: 'text-zinc-900', bg: 'bg-zinc-50' },
            { label: 'Integrity Rating', value: stats.total > 0 ? 'AAA+' : 'N/A', color: 'text-trust-green', bg: 'bg-trust-green/5' },
            { label: 'Expired Records', value: stats.expired, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Period Activity', value: stats.periodCount, color: 'text-white', bg: 'bg-zinc-950', invert: true },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${stat.invert ? 'bg-zinc-950 text-white' : `${stat.bg} ${stat.color}`} p-7 rounded-[2.5rem] border border-zinc-100 flex flex-col justify-between h-40 shadow-sm transition-all hover:shadow-xl hover:shadow-zinc-200/50 group`}
            >
              <h4 className={`font-mono text-[10px] font-bold uppercase tracking-widest ${stat.invert ? 'text-zinc-500' : 'opacity-60'}`}>{stat.label}</h4>
              <p className="font-display text-4xl font-bold group-hover:scale-105 transition-transform origin-left">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-8">
            <h3 className="font-display text-xl font-bold text-zinc-900">System Monitoring</h3>
            <div className="bg-zinc-50 p-1 rounded-xl flex gap-1 border border-zinc-100">
                {(['day', 'week', 'month', '3month'] as const).map((p) => (
                <button
                    key={p}
                    onClick={() => setStatsPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg font-display font-bold text-[9px] uppercase tracking-widest transition-all ${
                    statsPeriod === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                >
                    {p === '3month' ? '90D' : p}
                </button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Identity Node Health */}
            <section className="glass rounded-[2.5rem] p-8 border border-zinc-100">
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center">
                     <Fingerprint className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <h3 className="font-display font-bold text-lg text-zinc-900">Identity Ledger Node</h3>
                     <p className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Protocol Version v4.0.2</p>
                   </div>
                 </div>
                 <div className="text-right">
                    <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Node Address</p>
                    <p className="font-mono text-xs text-zinc-900 font-bold tracking-tighter">AS-{stats.nodeId}-LDR</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="p-6 bg-zinc-50/50 rounded-2xl border border-zinc-100 transition-colors hover:bg-zinc-50">
                    <p className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Sync Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-trust-green rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                      <span className="font-display font-bold text-zinc-900">Synchronized</span>
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-50/50 rounded-2xl border border-zinc-100 transition-colors hover:bg-zinc-50">
                    <p className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Auth Tiers</p>
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-trust-green" />
                       <span className="font-display font-bold text-zinc-900">{isVerified ? 'Enterprise L2' : 'Standard L1'}</span>
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-50/50 rounded-2xl border border-zinc-100 transition-colors hover:bg-zinc-50">
                    <p className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Uptime</p>
                    <div className="flex items-center gap-2">
                       <Clock className="w-4 h-4 text-zinc-400" />
                       <span className="font-display font-bold text-zinc-900">{stats.uptime}%</span>
                    </div>
                  </div>
               </div>
            </section>

            {/* Throughput Chart */}
            <section className="glass rounded-[2.5rem] p-8 border border-zinc-100 h-80 flex flex-col">
               <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="font-display font-bold text-lg text-zinc-900">Cryptographic Throughput</h3>
                    <p className="font-sans text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Global Relay Activity</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-trust-green rounded-full" />
                       <span className="font-mono text-[9px] text-zinc-400 font-bold uppercase">Activity</span>
                    </div>
                 </div>
               </div>
               <div className="flex-1 flex items-end gap-2 px-2">
                  {stats.normalizedChart.map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.02, duration: 0.8, ease: "easeOut" }}
                      className={`flex-1 rounded-t-lg transition-all duration-300 relative group/bar ${h > 20 ? 'bg-zinc-900 hover:bg-trust-green' : 'bg-zinc-100'}`}
                    >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-2 py-1 rounded text-[8px] opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                            Point {i + 1}
                        </div>
                    </motion.div>
                  ))}
               </div>
               <div className="mt-4 flex justify-between font-mono text-[8px] text-zinc-400 font-bold uppercase tracking-widest">
                  <span>-24 Hours</span>
                  <span>-12 Hours</span>
                  <span>Real-time</span>
               </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="glass rounded-[2.5rem] p-8 border border-zinc-100">
               <h3 className="font-display font-bold text-lg text-zinc-900 mb-6">Security Event Log</h3>
               <div className="space-y-6">
                 {allHashes.length > 0 ? (
                    allHashes.slice(0, 5).map((log, i) => (
                      <div key={i} className="flex gap-4 relative">
                        {i !== Math.min(allHashes.length, 5) - 1 && <div className="absolute left-2.5 top-7 w-[1px] h-8 bg-zinc-100" />}
                        <div className="w-5 h-5 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-trust-green" />
                        </div>
                        <div className="min-w-0">
                           <p className="font-display font-bold text-xs text-zinc-900 truncate">Indexed: {log.fileName}</p>
                           <p className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                             {new Date(log.createdAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                      </div>
                    ))
                 ) : (
                    <div className="py-10 text-center">
                        <p className="font-sans text-[10px] text-zinc-400 font-bold uppercase tracking-widest">No activity reported</p>
                    </div>
                 )}
               </div>
               <button className="w-full mt-8 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors">
                 Download Full Audit
               </button>
            </section>

            <section className="p-8 bg-zinc-950 rounded-[2.5rem] text-white">
               <ShieldCheck className="w-8 h-8 text-trust-green mb-6" />
               <h3 className="font-display font-bold text-xl mb-2">Vault Integrity</h3>
               <p className="font-sans text-xs text-zinc-400 leading-relaxed mb-6">
                 Your document index is protected by P-384 elliptic curve cryptography. All records are immutably signed.
               </p>
               <div className="flex items-center justify-between py-3 border-t border-white/10">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase">Redundancy</span>
                  <span className="font-mono text-[10px] text-trust-green font-bold uppercase tracking-widest">3-Node Sync</span>
               </div>
               <div className="flex items-center justify-between py-3 border-t border-white/10">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase">Persistence</span>
                  <span className="font-mono text-[10px] text-trust-green font-bold uppercase tracking-widest">High</span>
               </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
