'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  opacity: number;
  duration: number;
  animateY: number;
}

export function BackgroundAnimation() {
  const [isMounted, setIsMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      const newParticles = [...Array(15)].map((_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100,
        opacity: Math.random() * 0.3,
        duration: Math.random() * 10 + 15,
        animateY: -100 - Math.random() * 100
      }));
      setParticles(newParticles);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-zinc-50">
      <div className="absolute inset-0 grid-bg opacity-20" />
      
      {/* Soft Aurora Orbs */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, 60, 100, 0],
          scale: [1, 1.2, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] bg-trust-green/10 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 100, -60, 0],
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[10%] -right-[15%] w-[70%] h-[70%] bg-neon-purple/5 rounded-full blur-[140px]"
      />
      <motion.div
        animate={{
          y: [0, -80, 0],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-0 left-1/4 w-[60%] h-[40%] bg-neon-green/5 rounded-full blur-[100px]"
      />

      {/* Floating Data Fragments */}
      {isMounted && particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ 
            left: `${50 + p.x}%`, 
            top: `${p.y + 100}%`,
            opacity: 0
          }}
          animate={{ 
            top: `${p.y - 120}%`,
            opacity: [0, p.opacity, 0],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute font-mono text-[10px] text-zinc-300 font-bold tracking-widest whitespace-nowrap"
        >
          {p.id.toString(16).padStart(8, '0').toUpperCase()}
        </motion.div>
      ))}

      {/* Scanning Line Effect */}
      <motion.div
        animate={{
          y: ["-10%", "110%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-x-0 h-[300px] bg-gradient-to-b from-transparent via-trust-green/[0.03] to-transparent z-1 pointer-events-none"
      />
    </div>
  );
}
