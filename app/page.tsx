'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff, Hash, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BackgroundAnimation } from '@/components/background-animation';
import { FormError } from '@/components/form-error';
import { Footer } from '@/components/layout-shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotification } from '@/hooks/use-notification';
import { SecurityService } from '@/lib/security-service';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterInputs = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInputs>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterInputs) => {
    setIsSubmitting(true);
    try {
      const payload = SecurityService.prepareForTransit(data);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const body = await response.json();
      const result = SecurityService.processFromTransit(body);

      if (response.ok) {
        localStorage.setItem('pending_verification_email', data.email);
        localStorage.setItem('user_first_name', data.firstName);
        setIsSuccess(true);
        notify('Initial registration hash generated. Awaiting signature.', 'success');
        setTimeout(() => {
          router.push('/verify-otp');
        }, 2000);
      } else {
        const errDetails = result.error;
        const msg = typeof errDetails === 'string' ? errDetails : 'Registration failed. Check connectivity.';
        notify(msg, 'error');
      }
    } catch (error) {
      notify('An error occurred. Protocol failure.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden bg-white dark:bg-zinc-950 selection:bg-trust-green/20 transition-colors duration-300">
      <BackgroundAnimation />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
        <div className="flex-1 text-center lg:text-left space-y-6 lg:space-y-8 max-w-xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass border border-zinc-100 dark:border-white/5 shadow-sm"
          >
            <div className="w-2 h-2 bg-trust-green rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="font-mono text-[10px] font-black tracking-[0.3em] text-zinc-500 dark:text-zinc-400 uppercase">Cryptographic Node Online</span>
          </motion.div>
 
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-6 lg:mb-8 text-zinc-900 dark:text-white">
              Immutable<br /><span className="text-gradient">Validation.</span>
            </h1>
            <p className="font-sans text-lg lg:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto lg:mx-0">
              Transform your documents into unbreakable cryptographic hashes. Verified. Forever.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center lg:justify-start gap-4"
          >
            {[
              { icon: Hash, label: "Deterministic" },
              { icon: CheckCircle2, label: "Verified Origin" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 font-mono text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-[0.2em] backdrop-blur-sm">
                <item.icon className="w-3 h-3 text-trust-green" />
                {item.label}
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="w-full max-w-[500px]"
        >
          <div className="glass rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-12 border border-zinc-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                >
                  <CheckCircle2 className="text-trust-green w-16 h-16 mb-4" />
                  <h2 className="font-display text-3xl font-black mb-3 text-zinc-900 dark:text-white tracking-tighter leading-none">Hash Created</h2>
                  <p className="font-sans text-zinc-500 dark:text-zinc-400 mb-8 max-w-[280px]">Your identity is being propagation across the network...</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-10 text-center lg:text-left relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-trust-green font-mono text-[9px] font-black uppercase tracking-widest mb-4">
                <ShieldCheck className="w-3 h-3" /> System Admin Hub
              </div>
              <h2 className="font-display text-3xl font-black mb-2 text-zinc-900 dark:text-white tracking-tighter leading-none">Register as Administrator</h2>
              <p className="font-sans text-zinc-500 dark:text-zinc-400 text-sm italic">You will have full control over nodes, permissions, and member access.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.3em] ml-1">First Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600 group-focus-within:text-trust-green transition-colors" />
                    <input
                      {...register('firstName')}
                      type="text"
                      placeholder="Alan"
                      className={`w-full h-13 pl-12 pr-4 bg-zinc-50 dark:bg-zinc-900/50 border ${errors.firstName ? 'border-red-500' : 'border-zinc-100 dark:border-white/5'} rounded-2xl font-sans text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-trust-green/50 focus:ring-4 focus:ring-trust-green/5 hover:border-trust-green/30 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700`}
                    />
                  </div>
                  <FormError message={errors.firstName?.message} />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.3em] ml-1">Last Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600 group-focus-within:text-trust-green transition-colors" />
                    <input
                      {...register('lastName')}
                      type="text"
                      placeholder="Turing"
                      className={`w-full h-13 pl-12 pr-4 bg-zinc-50 dark:bg-zinc-900/50 border ${errors.lastName ? 'border-red-500' : 'border-zinc-100 dark:border-white/5'} rounded-2xl font-sans text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-trust-green/50 focus:ring-4 focus:ring-trust-green/5 hover:border-trust-green/30 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700`}
                    />
                  </div>
                  <FormError message={errors.lastName?.message} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.3em] ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600 group-focus-within:text-trust-green transition-colors" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="alan@turing.io"
                    className={`w-full h-13 pl-12 pr-4 bg-zinc-50 dark:bg-zinc-900/50 border ${errors.email ? 'border-red-500' : 'border-zinc-100 dark:border-white/5'} rounded-2xl font-sans text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-trust-green/50 focus:ring-4 focus:ring-trust-green/5 hover:border-trust-green/30 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700`}
                  />
                </div>
                <FormError message={errors.email?.message} />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.3em] ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600 group-focus-within:text-trust-green transition-colors" />
                  <input
                    {...register('password')}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    className={`w-full h-13 pl-12 pr-12 bg-zinc-50 dark:bg-zinc-900/50 border ${errors.password ? 'border-red-500' : 'border-zinc-100 dark:border-white/5'} rounded-2xl font-sans text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-trust-green/50 focus:ring-4 focus:ring-trust-green/5 hover:border-trust-green/30 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-900 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FormError message={errors.password?.message} />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.3em] ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-600 group-focus-within:text-trust-green transition-colors" />
                  <input
                    {...register('confirmPassword')}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    className={`w-full h-13 pl-12 pr-12 bg-zinc-50 dark:bg-zinc-900/50 border ${errors.confirmPassword ? 'border-red-500' : 'border-zinc-100 dark:border-white/5'} rounded-2xl font-sans text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-trust-green/50 focus:ring-4 focus:ring-trust-green/5 hover:border-trust-green/30 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700`}
                    />
                  </div>
                  <FormError message={errors.confirmPassword?.message} />
                </div>

              <div className="pt-2">
                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full h-14 bg-trust-green text-zinc-950 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-trust-green/90 disabled:opacity-70 transition-all active:scale-[0.98] shadow-xl shadow-trust-green/20 dark:shadow-none transition-colors"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 dark:border-zinc-950/30 border-t-white dark:border-t-zinc-950 rounded-full animate-spin" />
                      <span className="font-mono text-xs tracking-widest uppercase">Hashing Data</span>
                    </div>
                  ) : (
                    <>
                      Create Identity
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center font-sans text-xs text-zinc-600 dark:text-zinc-400">
                Already part of the network? <Link href="/login" className="text-trust-green font-bold hover:underline">Log in</Link>
              </p>
            </form>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
