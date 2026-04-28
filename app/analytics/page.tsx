'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { 
  Activity, 
  Database, 
  ShieldCheck, 
  TrendingUp, 
  FileCheck, 
  Users,
  Search
} from 'lucide-react';

const verificationData = [
  { name: 'Mon', count: 12, size: 45 },
  { name: 'Tue', count: 19, size: 78 },
  { name: 'Wed', count: 25, size: 52 },
  { name: 'Thu', count: 32, size: 120 },
  { name: 'Fri', count: 22, size: 90 },
  { name: 'Sat', count: 45, size: 156 },
  { name: 'Sun', count: 38, size: 110 },
];

const networkData = [
  { name: '00:00', load: 30 },
  { name: '04:00', load: 45 },
  { name: '08:00', load: 75 },
  { name: '12:00', load: 95 },
  { name: '16:00', load: 80 },
  { name: '20:00', load: 60 },
  { name: '23:59', load: 40 },
];

export default function AnalyticsPage() {
  const [history, setHistory] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
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
    };
    fetchHistory();
  }, []);

  // Process data for charts
  const processedData = history.reduce((acc: any[], curr: any) => {
    const date = new Date(curr.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
    const existing = acc.find(d => d.name === date);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: date, count: 1 });
    }
    return acc;
  }, []).reverse();

  const totalFiles = history.length;
  const trustScore = totalFiles > 0 ? 99.98 : 0;

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-7xl mx-auto py-12 lg:py-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl font-bold text-zinc-900 mb-2"
            >
              Network Insights
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-sans text-zinc-500"
            >
              Real-time monitoring of your cryptographic assets.
            </motion.p>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search logs..." 
                className="h-11 pl-10 pr-4 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:border-trust-green font-sans text-xs w-64"
              />
            </div>
            <button className="px-6 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-xl font-bold text-sm hover:bg-zinc-100 hover:border-zinc-200 transition-all shadow-sm">
              Export Ledger
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse mb-12">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-zinc-50 border border-zinc-100 rounded-3xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Verified Files", val: totalFiles.toLocaleString(), change: history.length > 0 ? "+100%" : "0%", icon: FileCheck },
            { label: "Active Nodes", val: "42", change: "+2", icon: Activity },
            { label: "Relay Latency", val: "14ms", change: "-4ms", icon: Database },
            { label: "Trust Score", val: trustScore.toString(), change: "Stable", icon: ShieldCheck },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 glass rounded-3xl border border-zinc-100 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold font-mono text-trust-green">
                  {stat.change}
                </div>
              </div>
              <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="font-display text-2xl font-bold text-zinc-900">{stat.val}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <section className="glass rounded-[2rem] p-8 border border-zinc-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-display text-xl font-bold text-zinc-900">Verification Volume</h3>
                <p className="font-sans text-xs text-zinc-400">Total documents processed per cycle</p>
              </div>
              <TrendingUp className="text-trust-green w-5 h-5" />
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.length > 0 ? processedData : [{ name: 'None', count: 0 }]}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f4f4f5' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="glass rounded-[2rem] p-8 border border-zinc-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-display text-xl font-bold text-zinc-900">Network Load</h3>
                <p className="font-sans text-xs text-zinc-400">Current relay throughput and utilization</p>
              </div>
              <Users className="text-zinc-400 w-5 h-5" />
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={networkData}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="load" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#areaGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Bottom Activity List */}
        <section className="glass rounded-[2rem] p-8 border border-zinc-100 mb-12">
          <h3 className="font-display text-xl font-bold text-zinc-900 mb-6">Security Event Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-50">
                  <th className="pb-4 font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Event_ID</th>
                  <th className="pb-4 font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Type</th>
                  <th className="pb-4 font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Action</th>
                  <th className="pb-4 font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                  <th className="pb-4 font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {history.length > 0 ? (
                  history.slice(0, 5).map((record, i) => (
                    <tr key={i} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-4 font-mono text-[11px] text-zinc-400">#LOG_{record._id?.slice(-4).toUpperCase() || 'SYS'}</td>
                      <td className="py-4 font-display font-bold text-xs text-zinc-900">VERIFICATION</td>
                      <td className="py-4 font-sans text-xs text-zinc-500">Hash Stored: {record.fileName}</td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-trust-green/10 text-trust-green rounded-lg font-mono text-[9px] font-bold uppercase">Success</span>
                      </td>
                      <td className="py-4 font-mono text-[11px] text-zinc-400 text-right">{new Date(record.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center font-sans text-xs text-zinc-400">No activity logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    )}
  </div>
</main>
);
}
