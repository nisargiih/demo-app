'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BackgroundAnimation } from '@/components/background-animation';
import { Footer } from '@/components/layout-shared';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotification } from '@/hooks/use-notification';
import { SecurityService } from '@/lib/security-service';

import { useUser } from '@/hooks/use-user';

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 characters'),
});

type OtpInputs = z.infer<typeof otpSchema>;

export default function VerifyOtpPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const { refresh } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<OtpInputs>({
    resolver: zodResolver(otpSchema)
  });

  const onSubmit = async (data: OtpInputs) => {
    setIsSubmitting(true);
    const email = localStorage.getItem('pending_verification_email');

    if (!email) {
      notify('Session expired. Please register again.', 'error');
      router.push('/');
      return;
    }

    try {
      const payload = SecurityService.prepareForTransit({ email, otp: data.otp.toUpperCase() });
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const body = await response.json();
      const result = SecurityService.processFromTransit(body);

      if (response.ok) {
        if (result.user) {
          localStorage.setItem('authenticated_user_email', result.user.email);
          localStorage.setItem('authenticated_user_id', result.user.id);
          localStorage.setItem('user_first_name', result.user.firstName);
          if (result.sessionId) {
            localStorage.setItem('current_session_id', result.sessionId);
          }
          localStorage.removeItem('pending_verification_email');
          // Refresh context
          await refresh();
        } else {
          localStorage.setItem('authenticated_user_email', email);
        }

        setIsSuccess(true);
        notify('Identity verified. Synchronizing node...', 'success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        notify(result.error || 'Invalid OTP segment', 'error');
      }
    } catch (error) {
      notify('An error occurred during verification', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden bg-white dark:bg-zinc-950 selection:bg-trust-green/20 transition-colors duration-300">
      <BackgroundAnimation />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center gap-8">
        <motion.div
  initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-[450px]"
        >
          <div className="glass rounded-[3rem] p-8 md:p-12 border border-white/40 dark:border-white/5 shadow-2xl relative overflow-hidden">
            {isSuccess && (
               <div className="absolute inset-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-zinc-900 dark:text-white font-display">
                <CheckCircle2 className="text-trust-green w-16 h-16 mb-4" />
                <h2 className="text-2xl font-bold">Verification Complete</h2>
                <p className="font-sans text-zinc-500 dark:text-zinc-400">Redirecting to setup...</p>
               </div>
            )}

            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-trust-green/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-trust-green/20">
                <Lock className="text-trust-green w-8 h-8" />
              </div>
              <h2 className="font-display text-3xl font-bold mb-2 text-zinc-900 dark:text-white">Verify Identity</h2>
              <p className="font-sans text-zinc-500 dark:text-zinc-400 text-sm">We&apos;ve sent a 6-character code to your email.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-2 text-center">
                <label className="font-mono text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em]">Enter Verification Code</label>
                <div className="relative">
                  <input
                    {...register('otp')}
                    maxLength={6}
                    type="text"
                    placeholder="XXXXXX"
                    style={{ textTransform: 'uppercase' }}
                    className="w-full h-20 text-center text-4xl font-display font-bold tracking-[0.3em] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 rounded-3xl focus:outline-none focus:border-trust-green/50 focus:ring-8 focus:ring-trust-green/5 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-200 dark:placeholder:text-zinc-800"
                  />
                </div>
                {errors.otp && <p className="text-[10px] text-red-500 font-mono">{errors.otp.message}</p>}
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full h-14 bg-zinc-100 dark:bg-trust-green text-zinc-900 dark:text-zinc-950 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-200 dark:hover:bg-trust-green/90 disabled:opacity-70 transition-all shadow-xl dark:shadow-none"
              >
                {isSubmitting ? "Verifying..." : "Validate Hash"}
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-center font-sans text-xs text-zinc-500 dark:text-zinc-400">
                Didn&apos;t receive the code? <button type="button" className="text-trust-green font-bold hover:underline">Resend</button>
              </p>
            </form>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
