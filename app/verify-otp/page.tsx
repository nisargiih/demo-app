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

const otpSchema = z.object({
  otp: z.string().length(4, 'OTP must be 4 digits'),
});

type OtpInputs = z.infer<typeof otpSchema>;

export default function VerifyOtpPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<OtpInputs>({
    resolver: zodResolver(otpSchema)
  });

  const onSubmit = async (data: OtpInputs) => {
    setIsSubmitting(true);
    const email = localStorage.getItem('pending_verification_email');

    if (!email) {
      alert('Session expired. Please register again.');
      router.push('/');
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: data.otp }),
      });
      
      const result = await response.json();

      if (response.ok) {
        localStorage.setItem('authenticated_user_email', email);
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/onboarding');
        }, 2000);
      } else {
        alert(result.error || 'Invalid OTP');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden bg-white selection:bg-trust-green/20">
      <BackgroundAnimation />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-[450px]"
        >
          <div className="glass rounded-[3rem] p-8 md:p-12 border border-white/40 shadow-2xl relative overflow-hidden">
            {isSuccess && (
               <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-zinc-900 font-display">
                <CheckCircle2 className="text-trust-green w-16 h-16 mb-4" />
                <h2 className="text-2xl font-bold">Verification Complete</h2>
                <p className="font-sans text-zinc-500">Redirecting to setup...</p>
               </div>
            )}

            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-trust-green/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock className="text-trust-green w-8 h-8" />
              </div>
              <h2 className="font-display text-3xl font-bold mb-2 text-zinc-900">Verify Identity</h2>
              <p className="font-sans text-zinc-500 text-sm">We've sent a 4-digit code to your email.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-2 text-center">
                <label className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Enter Verification Code</label>
                <div className="relative">
                  <input
                    {...register('otp')}
                    maxLength={4}
                    type="text"
                    placeholder="0000"
                    className="w-full h-20 text-center text-4xl font-display font-bold tracking-[0.5em] bg-zinc-50 border border-zinc-100 rounded-3xl focus:outline-none focus:border-trust-green/50 focus:ring-8 focus:ring-trust-green/5 transition-all"
                  />
                </div>
                {errors.otp && <p className="text-[10px] text-red-500 font-mono">{errors.otp.message}</p>}
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full h-14 bg-zinc-950 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 disabled:opacity-70 transition-all"
              >
                {isSubmitting ? "Verifying..." : "Validate Hash"}
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-center font-sans text-xs text-zinc-500">
                Didn't receive the code? <button type="button" className="text-trust-green font-bold">Resend</button>
              </p>
            </form>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  );
}
