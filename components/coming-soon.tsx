'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Construction, 
  ArrowLeft, 
  Cpu, 
  Globe, 
  Hammer,
  ShieldCheck
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import Link from 'next/link';

interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <main className="relative min-h-screen w-full bg-white flex flex-col items-center justify-center p-6 text-center lg:pl-72 selection:bg-trust-green/20">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-2xl px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 bg-zinc-950 rounded-[2rem] flex items-center justify-center mx-auto mb-12 shadow-2xl shadow-zinc-200"
        >
          <Hammer className="text-trust-green w-10 h-10 animate-bounce" />
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
        >
          <h1 className="font-display text-5xl font-bold text-zinc-900 mb-6 tracking-tight">{title}</h1>
          <p className="font-sans text-xl text-zinc-500 mb-12 leading-relaxed">{description}</p>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.4 }}
           className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12"
        >
           {[
             { icon: Globe, label: "Global Sync" },
             { icon: Cpu, label: "Core Processing" },
             { icon: ShieldCheck, label: "Edge Security" }
           ].map((item, i) => (
             <div key={i} className="p-6 glass rounded-3xl border border-zinc-100">
               <item.icon className="w-6 h-6 text-zinc-300 mx-auto mb-3" />
               <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{item.label}</span>
             </div>
           ))}
        </motion.div>

        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.6 }}
        >
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-3 px-8 py-4 bg-zinc-950 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
        </motion.div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 flex justify-center opacity-10">
        <Construction className="w-64 h-64 text-zinc-900 rotate-12" />
      </div>
    </main>
  );
}
