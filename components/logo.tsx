'use client';

import React from 'react';
import { Hexagon, Box } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className = '', size = 'md', showText = true }: LogoProps) {
  const dimensions = {
    sm: { wrapper: 'w-8 h-8', icon: 'w-6 h-6', box: 'w-2.5 h-2.5', text: 'text-lg', pulse: 'w-1.5 h-1.5' },
    md: { wrapper: 'w-12 h-12', icon: 'w-10 h-10', box: 'w-4 h-4', text: 'text-2xl', pulse: 'w-2.5 h-2.5' },
    lg: { wrapper: 'w-16 h-16', icon: 'w-14 h-14', box: 'w-6 h-6', text: 'text-3xl', pulse: 'w-3 h-3' },
  };

  const dim = dimensions[size];

  return (
    <div className={`flex items-center gap-4 ${className} group/logo`}>
      <div className={`relative ${dim.wrapper} flex items-center justify-center`}>
        {/* The Foundation: Hexagon Substrate */}
        <Hexagon 
          className={`${dim.icon} text-trust-green fill-trust-green/5 transition-all duration-500 group-hover/logo:rotate-[30deg] group-hover/logo:scale-110`} 
          strokeWidth={1.5} 
        />
        
        {/* The Central Asset: Protocol Box */}
        <Box 
          className={`absolute inset-0 m-auto ${dim.box} text-zinc-950 dark:text-white group-hover/logo:text-trust-green transition-colors duration-500`} 
          strokeWidth={2.5} 
        />
        
        {/* Precision Pulse */}
        <div className={`absolute -top-0.5 -right-0.5 ${dim.pulse} bg-trust-green rounded-full border-2 border-white dark:border-zinc-950 animate-pulse shadow-[0_0_8px_#10b981]`} />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-display font-black ${dim.text} tracking-tighter text-zinc-950 dark:text-white leading-none uppercase`}>
            IDENVAULT
          </span>
          <div className="flex items-center gap-1.5 mt-1.5 opacity-40">
            <span className="font-mono text-[8px] font-black uppercase tracking-[0.4em]">SOVEREIGN_CORE</span>
          </div>
        </div>
      )}
    </div>
  );
}
