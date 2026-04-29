'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, User as UserIcon, Building, ShieldCheck } from 'lucide-react';
import { BackgroundAnimation } from '@/components/background-animation';
import { Footer } from '@/components/layout-shared';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/hooks/use-notification';

export default function OnboardingPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [selected, setSelected] = useState<'individual' | 'business' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    const email = localStorage.getItem('authenticated_user_email');
    
    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, entityType: selected }),
      });
      
      if (response.ok) {
        notify('Account protocol initialized successfully.', 'success');
        router.push('/dashboard'); 
      } else {
        notify('Failed to save configuration', 'error');
      }
    } catch (error) {
      notify('An error occurred during onboarding', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden bg-white selection:bg-trust-green/20">
      <BackgroundAnimation />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-center mb-16"
        >
          <h1 className="font-display text-5xl font-bold text-zinc-900 mb-4">Choose your entity type</h1>
          <p className="font-sans text-zinc-500 max-w-sm mx-auto">Tell us how you plan to use TechCore so we can tailor your experience.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-[800px] mb-12">
          {[
            { id: 'individual', icon: UserIcon, title: 'Individual', desc: 'Secure my own personal documents and assets.' },
            { id: 'business', icon: Building, title: 'Business', desc: 'Enterprise-grade verification for teams and organizations.' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelected(type.id as any)}
              className={`group relative p-8 glass rounded-[2.5rem] border transition-all text-left ${selected === type.id ? 'border-trust-green ring-4 ring-trust-green/5 bg-trust-green/[0.02]' : 'border-zinc-100 hover:border-zinc-200'}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${selected === type.id ? 'bg-trust-green text-white shadow-lg shadow-trust-green/20' : 'bg-zinc-50 text-zinc-400 group-hover:bg-zinc-100'}`}>
                <type.icon className="w-8 h-8" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2 text-zinc-900">{type.title}</h3>
              <p className="font-sans text-zinc-500 text-sm leading-relaxed">{type.desc}</p>
              
              {selected === type.id && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-8 right-8"
                >
                  <ShieldCheck className="text-trust-green w-6 h-6" />
                </motion.div>
              )}
            </button>
          ))}
        </div>

        <motion.button
          disabled={!selected || isSubmitting}
          onClick={handleNext}
          whileHover={selected ? { scale: 1.02 } : {}}
          whileTap={selected ? { scale: 0.98 } : {}}
          className="w-full max-w-[300px] h-16 bg-zinc-950 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 disabled:opacity-50 transition-all font-display text-lg shadow-xl shadow-zinc-200"
        >
          {isSubmitting ? 'Configuring Node...' : 'Access Dashboard'}
          <ArrowRight className="w-6 h-6" />
        </motion.button>
      </div>

      <Footer />
    </main>
  );
}
