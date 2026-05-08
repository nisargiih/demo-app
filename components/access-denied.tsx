'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8 p-6 bg-red-50 dark:bg-red-500/10 rounded-3xl text-red-500"
      >
        <ShieldAlert className="w-16 h-16" />
      </motion.div>
      
      <h2 className="font-display text-3xl font-bold text-zinc-900 dark:text-white mb-4 uppercase tracking-wider">Access Denied</h2>
      <p className="font-sans text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-10 leading-relaxed text-sm md:text-base">
        Your current digital identity does not have sufficient clearance to access this protocol. Please contact your system administrator to provision module access.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
        <Link 
          href="/dashboard"
          className="h-12 px-8 bg-zinc-950 dark:bg-trust-green text-white dark:text-zinc-950 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-trust-green/90 transition-all shadow-xl shadow-zinc-200 dark:shadow-none"
        >
          <Home className="w-4 h-4" />
          Neural Link to Dashboard
        </Link>
        <button 
          onClick={() => window.history.back()}
          className="h-12 px-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 text-zinc-600 dark:text-zinc-400 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest hover:border-zinc-200 dark:hover:border-white/10 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retract Request
        </button>
      </div>
    </div>
  );
}
