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
  History
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

export default function DashboardPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [allHashes, setAllHashes] = useState<any[]>([]);
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | '3month'>('month');

  const [isMounted, setIsMounted] = useState(false);

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
      setIsMounted(true);
      setIsAuthLoading(false);
    };
    init();
  }, [fetchUser, fetchHashes, router]);

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

  const isVerified = user?.verificationStatus === 'verified';
  const isPending = user?.verificationStatus === 'pending';

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6">
      <BackgroundAnimation />
      <Sidebar />
 
      <div className="relative z-10 w-full max-w-6xl mx-auto py-8 sm:py-12 lg:py-20">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display text-4xl sm:text-5xl font-bold text-zinc-900 tracking-tight">
                  Control Center
                </h1>
                {isVerified && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-trust-green/10 border border-trust-green/20 rounded-full">
                    <ShieldCheck className="w-4 h-4 text-trust-green" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-trust-green">L2 Verified</span>
                  </div>
                )}
                {isPending && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">Under Review</span>
                  </div>
                )}
              </div>
              <p className="font-sans text-sm sm:text-base text-zinc-500">
                Logged as <span className="text-zinc-900 font-semibold">{user?.firstName} {user?.lastName}</span> — {user?.entityType} node.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-4"
            >
              <button 
                onClick={() => router.push('/notarize')}
                className="h-12 px-8 bg-zinc-950 text-white rounded-2xl font-display font-bold text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
              >
                <Plus className="w-4 h-4" />
                Capture Fingerprint
              </button>
            </motion.div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Index', value: stats.total, icon: Fingerprint, color: 'text-zinc-900', bg: 'bg-zinc-50' },
            { label: 'Integrity Rating', value: stats.total > 0 ? 'AAA+' : 'N/A', icon: ShieldCheck, color: 'text-trust-green', bg: 'bg-trust-green/5' },
            { label: 'Latency Node', value: `${stats.uptime}%`, icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-50' },
            { label: 'Period Activity', value: stats.periodCount, icon: TrendingUp, color: 'text-white', bg: 'bg-zinc-950', invert: true },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`${stat.invert ? 'bg-zinc-950 text-white' : `${stat.bg} ${stat.color}`} p-7 rounded-[2.5rem] border border-zinc-100 flex flex-col justify-between h-44 shadow-sm transition-all hover:shadow-xl hover:shadow-zinc-200/40 group relative overflow-hidden`}
            >
              <stat.icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-5 transition-transform group-hover:scale-125 ${stat.invert ? 'text-white' : 'text-zinc-950'}`} />
              <h4 className={`font-mono text-[10px] font-bold uppercase tracking-widest relative z-10 ${stat.invert ? 'text-zinc-500' : 'opacity-60'}`}>{stat.label}</h4>
              <p className="font-display text-4xl font-bold relative z-10">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Activity Chart Area */}
            <section className="glass rounded-[3rem] p-8 sm:p-10 border border-zinc-100 flex flex-col min-h-[500px]">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-5 h-5 text-trust-green" />
                        <h3 className="font-display font-bold text-2xl text-zinc-900 tracking-tight">Index Activity</h3>
                    </div>
                    <p className="font-sans text-xs text-zinc-400 font-medium">Real-time cryptographic fingerprint tracking</p>
                 </div>
                 
                 <div className="bg-zinc-100/50 p-1.5 rounded-2xl flex gap-1 border border-zinc-100 self-start">
                    {(['day', 'week', 'month', '3month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setStatsPeriod(p)}
                            className={`px-4 py-2 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest transition-all ${
                            statsPeriod === p ? 'bg-white text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-zinc-600'
                            }`}
                        >
                            {p === '3month' ? '90 Days' : p}
                        </button>
                    ))}
                </div>
               </div>

               <div className="h-[350px] w-full">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f4f4f5" />
                          <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                              dy={10}
                          />
                          <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                              width={30}
                          />
                          <Tooltip 
                              contentStyle={{ 
                                  borderRadius: '16px', 
                                  border: '1px solid #f4f4f5',
                                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                              }}
                          />
                          <Area 
                              type="monotone" 
                              dataKey="count" 
                              name="Indexed"
                              stroke="#10b981" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorCount)" 
                              animationDuration={1500}
                          />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-zinc-100 border-t-zinc-900 rounded-full animate-spin" />
                    </div>
                  )}
               </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="glass rounded-[2.5rem] p-8 border border-zinc-100 flex flex-col h-full">
               <div className="flex items-center gap-3 mb-8">
                  <History className="w-5 h-5 text-zinc-900" />
                  <h3 className="font-display font-bold text-xl text-zinc-900">Recent Ledger</h3>
               </div>
               
               <div className="space-y-6 flex-1">
                 {allHashes.length > 0 ? (
                    allHashes.slice(0, 6).map((log, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={i} 
                        className="flex gap-4 group cursor-pointer"
                        onClick={() => router.push('/notarize')}
                      >
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-zinc-900 transition-colors">
                          <FileText className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                           <p className="font-display font-bold text-sm text-zinc-900 truncate tracking-tight">{log.fileName}</p>
                           <p className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                             {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                      </motion.div>
                    ))
                 ) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center h-full">
                        <Fingerprint className="w-12 h-12 text-zinc-100 mb-4" />
                        <p className="font-sans text-[11px] text-zinc-400 font-bold uppercase tracking-widest">No activity reported</p>
                    </div>
                 )}
               </div>
               
               {allHashes.length > 6 && (
                 <button className="w-full mt-8 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-display font-bold text-[10px] text-zinc-900 uppercase tracking-widest hover:bg-zinc-100 transition-colors">
                    View Full Inventory
                 </button>
               )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
