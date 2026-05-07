'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';

export default function SubscriptionPage() {
  return (
    <main className="min-h-screen bg-zinc-50 overflow-x-hidden selection:bg-trust-green/30">
      <BackgroundAnimation />
      <Sidebar />
      
      <div className="lg:pl-72 min-h-screen relative z-10 flex items-center justify-center">
        <div className="max-w-xl w-full mx-auto p-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-[3.5rem] p-12 sm:p-16 border border-zinc-100 shadow-2xl relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-trust-green/5 blur-[80px] rounded-full -mr-32 -mt-32" />
            
            <div className="relative z-10 space-y-8">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-zinc-950 text-white rounded-2xl shadow-xl">
                <Sparkles className="w-5 h-5 text-trust-green" />
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em]">Protocol Upgrade Inbound</span>
              </div>

              <div className="space-y-4">
                <h1 className="font-display text-5xl sm:text-6xl font-black text-zinc-950 tracking-tight leading-none uppercase">
                  Coming <br />
                  <span className="text-zinc-400">Soon</span>
                </h1>
                <p className="font-sans text-zinc-500 text-lg leading-relaxed max-w-sm mx-auto font-medium">
                  We are recalibrating our energy distribution protocols. The subscription module is currently undergoing security hardening.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 group hover:border-trust-green/30 transition-colors">
                  <Zap className="w-6 h-6 text-trust-green mb-3 mx-auto" />
                  <p className="font-display font-bold text-sm text-zinc-900">Advanced Quota</p>
                  <p className="font-mono text-[9px] text-zinc-400 uppercase font-black tracking-widest mt-1">Tiered Models</p>
                </div>
                <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 group hover:border-trust-green/30 transition-colors">
                  <ShieldCheck className="w-6 h-6 text-zinc-900 mb-3 mx-auto" />
                  <p className="font-display font-bold text-sm text-zinc-900">Enterprise SLA</p>
                  <p className="font-mono text-[9px] text-zinc-400 uppercase font-black tracking-widest mt-1">Guaranteed Sync</p>
                </div>
              </div>

              <div className="pt-8 border-t border-zinc-100 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-trust-green animate-pulse" />
                   <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Active Development</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-zinc-200" />
                <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Q3 2026 ETA</span>
              </div>
            </div>
          </motion.div>

          <p className="mt-12 font-sans text-xs text-zinc-400 max-w-xs mx-auto leading-loose italic">
            Existing free-tier monthly quotas (10 index/15 verify) remain active on the TechCore substrate during this maintenance pulse.
          </p>
        </div>
      </div>
    </main>
  );
}
