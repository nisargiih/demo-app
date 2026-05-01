'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginInputs) => {
    setIsSubmitting(true);
    try {
      const payload = SecurityService.prepareForTransit(data);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const body = await response.json();
      const result = SecurityService.processFromTransit(body);

      if (response.ok) {
        if (result.requires2FA) {
          localStorage.setItem('pending_verification_email', data.email);
          notify('Secondary authentication required. Check your email.', 'info');
          router.push('/verify-otp');
          return;
        }

        localStorage.setItem('user_first_name', result.user.firstName);
        localStorage.setItem('authenticated_user_email', data.email);
        localStorage.setItem('authenticated_user_id', result.user.id);
        setIsSuccess(true);
        notify('Authentication successful.', 'success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        if (result.redirect) {
          router.push(result.redirect);
        } else {
          notify(result.error || 'Authentication mismatch', 'error');
        }
      }
    } catch (error) {
      notify('An error occurred during authentication', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden bg-white selection:bg-trust-green/20">
      <BackgroundAnimation />
 
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
        <div className="flex-1 text-center lg:text-left space-y-6 lg:space-y-8 max-w-xl">
           <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-6 lg:mb-8 text-zinc-900">
              Welcome back to <span className="text-gradient">TechCore.</span>
            </h1>
            <p className="font-sans text-lg lg:text-xl text-zinc-600 leading-relaxed max-w-md mx-auto lg:mx-0">
              Your cryptographic identity is ready. Access your secure documents with absolute certainty.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="w-full max-w-[500px]"
        >
          <div className="glass rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-12 border border-white/40 shadow-2xl relative overflow-hidden">
            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                >
                  <CheckCircle2 className="text-trust-green w-16 h-16 mb-4" />
                  <h2 className="font-display text-3xl font-bold mb-3 text-zinc-900">Access Granted</h2>
                  <p className="font-sans text-zinc-500 mb-8 max-w-[280px]">Identity verified. Synchronizing node...</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-10 text-center lg:text-left relative z-10">
              <h2 className="font-display text-3xl font-bold mb-2 text-zinc-900">Login</h2>
              <p className="font-sans text-zinc-500 text-sm">Enter your credentials to access your secure vault.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-trust-green transition-colors" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="alan@turing.io"
                    className={`w-full h-13 pl-12 pr-4 bg-zinc-50 border ${errors.email ? 'border-red-500' : 'border-zinc-100'} rounded-2xl font-sans text-sm text-zinc-900 focus:outline-none focus:border-trust-green/50 focus:ring-4 focus:ring-trust-green/5 hover:border-trust-green/30 transition-all placeholder:text-zinc-300`}
                  />
                </div>
                <FormError message={errors.email?.message} />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-trust-green transition-colors" />
                  <input
                    {...register('password')}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    className={`w-full h-13 pl-12 pr-12 bg-zinc-50 border ${errors.password ? 'border-red-500' : 'border-zinc-100'} rounded-2xl font-sans text-sm text-zinc-900 focus:outline-none focus:border-trust-green/50 focus:ring-4 focus:ring-trust-green/5 hover:border-trust-green/30 transition-all placeholder:text-zinc-300`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-900 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FormError message={errors.password?.message} />
              </div>

              <div className="pt-2">
                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full h-14 bg-zinc-950 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 disabled:opacity-70 transition-all"
                >
                  {isSubmitting ? "Authenticating..." : (
                    <>
                      Login to Vault
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center font-sans text-xs text-zinc-600">
                New to the network? <Link href="/" className="text-trust-green font-bold hover:underline">Register Identity</Link>
              </p>
            </form>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
