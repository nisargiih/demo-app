'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { FileSearch, ArrowLeft, Home, ShieldAlert } from 'lucide-react';
import { BackgroundAnimation } from '@/components/background-animation';

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-6 bg-white selection:bg-trust-green/20 overflow-hidden">
      <BackgroundAnimation />
      
      <div className="relative z-10 w-full max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-12 inline-flex items-center justify-center"
        >
          <div className="relative">
            <motion.div 
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className="w-32 h-32 bg-zinc-950 rounded-[3rem] flex items-center justify-center shadow-2xl shadow-zinc-900/20"
            >
              <FileSearch className="w-12 h-12 text-trust-green" />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute -top-4 -right-4 bg-red-500 text-white p-3 rounded-2xl shadow-lg"
            >
              <ShieldAlert className="w-6 h-6" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="font-display text-8xl font-black text-zinc-900 mb-4 tracking-tighter">
            404
          </h1>
          <h2 className="font-display text-2xl font-bold text-zinc-800 mb-4 uppercase tracking-widest">
            Protocol Not Found
          </h2>
          <p className="font-sans text-zinc-500 max-w-md mx-auto mb-12 leading-relaxed">
            The requested resource node could not be resolved. This endpoint may have been decommissioned or moved to a different cryptographic sector.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link 
            href="/dashboard"
            className="w-full sm:w-auto h-14 px-8 bg-zinc-950 text-white rounded-2xl font-display font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto h-14 px-8 bg-white border border-zinc-100 text-zinc-600 rounded-2xl font-display font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:border-zinc-200 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Previous Node
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 pt-10 border-t border-zinc-50"
        >
          <p className="font-mono text-[9px] text-zinc-300 uppercase tracking-[0.4em]">
            System Status: Operational • Secure Signature Required
          </p>
        </motion.div>
      </div>
    </main>
  );
}
