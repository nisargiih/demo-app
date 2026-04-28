import React from 'react';
import { Cpu } from 'lucide-react';

export function Header() {
  return (
    <div className="flex items-center gap-2 opacity-50 mb-8">
      <Cpu className="w-5 h-5" />
      <span className="font-display font-medium text-sm tracking-widest text-zinc-500 uppercase">TECH_CORE_2026</span>
    </div>
  );
}

export function Footer() {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block">
      <div className="flex items-center gap-8 opacity-20 hover:opacity-100 transition-opacity">
         <div className="h-px w-24 bg-gradient-to-r from-transparent to-zinc-400" />
         <p className="font-mono text-[10px] tracking-widest text-zinc-500 font-bold uppercase">
           SECURE_ENCLAVE_ESTABLISHED // {new Date().getFullYear()}
         </p>
         <div className="h-px w-24 bg-gradient-to-l from-transparent to-zinc-400" />
      </div>
    </div>
  );
}
