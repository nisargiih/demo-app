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
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const trustScore = 99.98;

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
            { label: "Active Nodes", val: "42", change: "+2", icon: Activity },
            { label: "Relay Latency", val: "14ms", change: "-4ms", icon: Database },
            { label: "Trust Score", val: trustScore.toString(), change: "Stable", icon: ShieldCheck },
            { label: "Network Load", val: "Lo-Fi", change: "Optimal", icon: TrendingUp },
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
                <p className="font-sans text-xs text-zinc-400">Total documents processed per cycle (Projected)</p>
              </div>
              <TrendingUp className="text-trust-green w-5 h-5" />
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verificationData}>
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
      </>
    )}
  </div>
</main>
);
}
