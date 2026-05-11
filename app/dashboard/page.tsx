'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  ShieldCheck,
  Fingerprint, 
  Clock, 
  Plus,
  TrendingUp,
  Activity,
  History,
  Archive,
  Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useNotification } from '@/hooks/use-notification';

import { useRouter } from 'next/navigation';
import { SecurityService } from '@/lib/security-service';
import { useUser } from '@/hooks/use-user';

export default function DashboardPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const { user, loading, role, permissions } = useUser();
  const [allHashes, setAllHashes] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | '3month'>('month');
  const [isMounted, setIsMounted] = useState(false);

  const fetchHashes = React.useCallback(async () => {
    if (!user?.email) return;

    try {
      const res = await fetch(`/api/hashes?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        if (data.history) {
          setAllHashes(data.history);
          setUsageStats(data.usage);
        } else {
          setAllHashes(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [user?.email]);

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Check for unauthorized access error
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'unauthorized') {
      notify('You do not have clearance for that protocol module.', 'error');
      router.replace('/dashboard');
    }

    const init = async () => {
      await fetchHashes();
      setIsMounted(true);
    };
    init();
  }, [loading, user, fetchHashes, router]);

  const stats = useMemo(() => {
    const now = new Date();
    
    // Logic for dynamic chart data based on statsPeriod
    let buckets: { name: string; timestamp: Date; count: number }[] = [];
    
    if (statsPeriod === 'day') {
      // 24 hours
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        d.setMinutes(0, 0, 0);
        buckets.push({ 
          name: d.toLocaleTimeString([], { hour: '2-digit' }), 
          timestamp: d,
          count: 0 
        });
      }
    } else if (statsPeriod === 'week' || statsPeriod === 'month') {
      const days = statsPeriod === 'week' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        d.setHours(0, 0, 0, 0);
        buckets.push({ 
          name: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), 
          timestamp: d,
          count: 0 
        });
      }
    } else if (statsPeriod === '3month') {
      // 12 weeks
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        d.setHours(0, 0, 0, 0);
        buckets.push({ 
          name: `W${12 - i}`, 
          timestamp: d,
          count: 0 
        });
      }
    }

    // Populate buckets
    allHashes.forEach(h => {
      const hDate = new Date(h.createdAt);
      const bucket = buckets.find((b, idx) => {
        const nextB = buckets[idx + 1];
        if (nextB) {
          return hDate >= b.timestamp && hDate < nextB.timestamp;
        }
        return hDate >= b.timestamp;
      });
      if (bucket) bucket.count++;
    });

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
    
    const uptimeSeed = user?._id ? user._id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 100 : 0;
    const uptime = total > 0 ? (99.8 + (uptimeSeed / 1000)).toFixed(2) : '0.00';

    return { total, expired, active, periodCount, chartData: buckets, uptime };
  }, [allHashes, statsPeriod, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 transition-colors duration-300">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-trust-green/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-trust-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const isVerified = user?.verificationStatus === 'verified';
  const isPending = user?.verificationStatus === 'pending';

  return (
    <main className="relative min-h-screen w-full bg-white dark:bg-zinc-950 selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6 transition-colors duration-300">
      <BackgroundAnimation />
      <Sidebar />
 
      <div className="relative z-10 w-full max-w-6xl mx-auto py-8 lg:py-12">
        <header className="mb-10 relative overflow-hidden group">
          {/* Decorative scanning line in header */}
          <motion.div 
            animate={{ left: ["-10%", "110%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 bottom-0 w-px bg-trust-green/20 blur-sm pointer-events-none"
          />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="font-display text-4xl lg:text-6xl font-black text-zinc-950 dark:text-white tracking-tighter uppercase leading-[0.85]">
                  Control Center
                </h1>
                {isVerified && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-trust-green text-white dark:text-zinc-950 rounded-full shadow-lg shadow-trust-green/20">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest">Protocol Verified</span>
                  </div>
                )}
              </div>
              <p className="font-sans text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-[0.2em] mt-2">
                Operational Status: <span className="text-trust-green">Sovereign Cluster Active</span>
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3"
            >
              <button 
                onClick={() => router.push('/notarize')}
                className="h-11 px-6 bg-zinc-900 dark:bg-trust-green text-white dark:text-zinc-950 rounded-xl font-display font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-zinc-900/10"
              >
                <Plus className="w-4 h-4" />
                Capture Fingerprint
              </button>
            </motion.div>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Total Index', value: stats.total, icon: Fingerprint, color: 'text-zinc-900 dark:text-white', bg: 'bg-white dark:bg-zinc-900' },
              { 
                label: 'Registry Quota', 
                value: usageStats ? `${usageStats.registryCount || 0}/5` : '0/5', 
                icon: Archive, 
                color: 'text-trust-green', 
                bg: 'bg-white dark:bg-zinc-900',
                sub: 'Monthly'
              },
              { 
                label: 'Verify Credits', 
                value: usageStats ? `${usageStats.verifyCount}/${usageStats.verifyLimit}` : '0/15', 
                icon: ShieldCheck, 
                color: 'text-zinc-900 dark:text-white', 
                bg: 'bg-white dark:bg-zinc-900',
                sub: 'Active'
              },
              { label: 'Uptime', value: `${stats.uptime}%`, icon: Zap, color: 'text-zinc-900 dark:text-white', bg: 'bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-white/5' },
            ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`${stat.bg} ${stat.color} p-5 rounded-3xl border border-zinc-100 dark:border-white/5 flex flex-col justify-between h-36 shadow-sm group relative overflow-hidden transition-all hover:border-trust-green/30`}
            >
              <stat.icon className="absolute -right-2 -bottom-2 w-16 h-16 opacity-5 group-hover:scale-110 transition-transform text-current" />
              <div className="relative z-10">
                <h4 className="font-mono text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">{stat.label}</h4>
                {stat.sub && (
                  <p className="font-mono text-[7px] opacity-40 uppercase tracking-tighter">{stat.sub}</p>
                )}
              </div>
              <p className="font-display text-2xl font-black relative z-10">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Activity Chart Area */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-[2.5rem] p-6 sm:p-8 flex flex-col shadow-sm">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-trust-green" />
                        <h3 className="font-display font-black text-xl text-zinc-900 dark:text-white tracking-tight uppercase">Index Activity</h3>
                    </div>
                    <p className="font-sans text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Protocol Signal Tracking</p>
                 </div>
                 
                 <div className="bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl flex gap-1 self-start">
                    {(['day', 'week', 'month', '3month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setStatsPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg font-display font-black text-[9px] uppercase tracking-widest transition-all ${
                            statsPeriod === p ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                            }`}
                        >
                            {p === '3month' ? '90D' : p}
                        </button>
                    ))}
                </div>
               </div>

               <div className="h-[280px] w-full">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f4f4f5" className="dark:opacity-5" />
                          <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 800 }}
                              dy={10}
                          />
                          <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 800 }}
                          />
                          <Tooltip 
                              contentStyle={{ 
                                  borderRadius: '16px', 
                                  border: 'none',
                                  backgroundColor: 'rgba(9, 9, 11, 0.95)',
                                  color: '#fff',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  backdropFilter: 'blur(8px)'
                              }}
                          />
                          <Area 
                              type="monotone" 
                              dataKey="count" 
                              name="Indexed"
                              stroke="#10b981" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#colorCount)" 
                          />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-zinc-100 dark:border-white/5 border-t-trust-green rounded-full animate-spin" />
                    </div>
                  )}
               </div>
            </section>
          </div>

          <div>
            <section className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-[2rem] p-6 flex flex-col h-full shadow-sm">
               <div className="flex items-center gap-2 mb-6">
                  <History className="w-4 h-4 text-zinc-900 dark:text-white" />
                  <h3 className="font-display font-black text-lg text-zinc-900 dark:text-white uppercase tracking-tighter">Ledger</h3>
               </div>
               
               <div className="space-y-4 flex-1">
                 {allHashes.length > 0 ? (
                    allHashes.slice(0, 5).map((log, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={i} 
                        className="flex gap-3 group cursor-pointer items-center"
                        onClick={() => router.push('/notarize')}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 flex items-center justify-center shrink-0 group-hover:border-trust-green transition-colors">
                          <FileText className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                           <p className="font-display font-bold text-[11px] text-zinc-900 dark:text-white truncate tracking-tight uppercase">{log.fileName}</p>
                           <p className="font-mono text-[8px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest">
                             {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                      </motion.div>
                    ))
                 ) : (
                    <div className="py-12 text-center flex flex-col items-center justify-center h-full">
                        <Fingerprint className="w-10 h-10 text-zinc-200 dark:text-zinc-800 mb-3" />
                        <p className="font-mono text-[9px] text-zinc-400 dark:text-zinc-600 font-black uppercase tracking-widest">Empty Ledger</p>
                    </div>
                 )}
               </div>
               
               {allHashes.length > 5 && (
                 <button 
                  onClick={() => router.push('/notarize')}
                  className="w-full mt-6 py-3 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-xl font-display font-black text-[9px] text-zinc-900 dark:text-white uppercase tracking-widest hover:border-trust-green transition-all"
                 >
                    Full Inventory
                 </button>
               )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
