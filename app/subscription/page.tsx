'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  ShieldAlert,
  Wallet,
  Sparkles,
  Info
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useNotification } from '@/hooks/use-notification';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const CREDIT_RATIO = 1.2; // ₹1 = 1.2 credits
const COSTS = {
  HASH: 7,
  REGISTRY: 12,
  VERIFY: 1
};

export default function SubscriptionPage() {
  const { notify } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState<number>(200);

  useEffect(() => {
    const fetchUser = async () => {
      const email = localStorage.getItem('authenticated_user_email');
      if (!email) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const body = await res.json();
          const data = SecurityService.processFromTransit(body);
          setUser(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-trust-green/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-trust-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const totalCredits = Math.floor(amount * CREDIT_RATIO);

  const handlePurchase = async () => {
    if (!user) {
      notify('Session invalid. Please reconnect.', 'error');
      return;
    }

    if (amount < 200) {
      notify('Minimum recharge amount is ₹200', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const orderRes = await fetch('/api/payment/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          email: user.email
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to initialize order');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TECHCORE INFRA",
        description: `Protocol Credits: ${totalCredits} Units`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            notify('Verifying transmission...', 'loading');
            
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                email: user.email,
                amount: amount
              })
            });

            const verifyData = await verifyRes.json();
            const result = SecurityService.processFromTransit(verifyData);

            if (verifyRes.ok && result.success) {
              notify(`Protocol Synchronized: ${result.message}`, 'success');
              setUser((prev: any) => ({
                ...prev,
                credits: (prev.credits || 0) + result.creditsAdded
              }));
              setTimeout(() => window.location.reload(), 2000);
            } else {
              notify(result.error || 'Verification protocol failed', 'error');
            }
          } catch (err) {
            notify('Atomic verification failed', 'error');
          }
        },
        prefill: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          contact: '9999999999'
        },
        theme: {
          color: "#000000",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'System fault detected', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <BackgroundAnimation />
      <Sidebar />
      
      <div className="lg:pl-72 min-h-screen">
        <div className="max-w-6xl mx-auto p-8 lg:p-12 xl:p-16">
          
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Left Column: Input & Selector */}
            <div className="flex-1 space-y-12">
              <header>
                <div className="px-3 py-1 bg-trust-green/10 rounded-full inline-block mb-6">
                  <span className="font-mono text-[9px] text-trust-green font-bold uppercase tracking-widest">Financial Node v3.0</span>
                </div>
                <h1 className="font-display text-5xl lg:text-7xl font-black text-zinc-950 tracking-tight leading-none mb-6">
                  Forge Your <br />
                  <span className="text-trust-green">Energy Core</span>
                </h1>
                <p className="font-sans text-lg text-zinc-500 leading-relaxed max-w-md">
                  Scale your operations with immediate credit injection. Minimum protocol entry: ₹200.
                </p>
              </header>

              <div className="p-10 bg-zinc-950 rounded-[3rem] text-white shadow-2xl shadow-zinc-950/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-trust-green/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                
                <label className="font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] block mb-8">Set Transaction Volume (INR)</label>
                
                <div className="flex items-center gap-6 mb-12">
                  <span className="font-display text-7xl font-black tabular-nums">₹</span>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent font-display text-7xl font-black focus:outline-none placeholder:text-zinc-800"
                    placeholder="200"
                  />
                </div>

                <div className="space-y-6">
                  <input 
                    type="range" 
                    min="200" 
                    max="10000" 
                    step="50"
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-trust-green"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-zinc-600 font-bold uppercase">
                    <span>Min Load: ₹200</span>
                    <span>Max Load: ₹10,000</span>
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={isProcessing || amount < 200}
                  className="mt-12 w-full h-20 bg-trust-green text-zinc-950 rounded-[1.5rem] font-display font-black text-xs uppercase tracking-[0.25em] flex items-center justify-center gap-3 hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  {isProcessing ? 'Synchronizing...' : 'Initialize Fusion'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Right Column: Calculator & Preview */}
            <div className="lg:w-[400px] space-y-8">
              <div className="p-10 bg-zinc-50 border border-zinc-100 rounded-[3rem] sticky top-8">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-trust-green" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-zinc-900">Yield Calculator</h3>
                </div>

                <div className="mb-10 p-6 bg-white rounded-2xl border border-zinc-100 shadow-sm text-center">
                  <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Projected Output</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="font-display font-black text-5xl text-zinc-950">{totalCredits.toLocaleString()}</span>
                    <span className="font-mono text-sm text-trust-green font-bold uppercase">Units</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Potential Operations</p>
                  
                  <div className="grid gap-4">
                    <div className="p-5 bg-white border border-zinc-50 rounded-2xl flex items-center justify-between group hover:border-trust-green/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-trust-green/5 rounded-xl flex items-center justify-center text-trust-green">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-sm text-zinc-900">Hash Generation</p>
                          <p className="font-sans text-[10px] text-zinc-400">7 Credits / Unit</p>
                        </div>
                      </div>
                      <span className="font-display font-black text-lg text-zinc-950">{Math.floor(totalCredits / COSTS.HASH)}x</span>
                    </div>

                    <div className="p-5 bg-white border border-zinc-50 rounded-2xl flex items-center justify-between group hover:border-trust-green/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center text-trust-green">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-sm text-zinc-900">Official Registry</p>
                          <p className="font-sans text-[10px] text-zinc-400">12 Credits / Doc</p>
                        </div>
                      </div>
                      <span className="font-display font-black text-lg text-zinc-950">{Math.floor(totalCredits / COSTS.REGISTRY)}x</span>
                    </div>

                    <div className="p-5 bg-white border border-zinc-50 rounded-2xl flex items-center justify-between group hover:border-trust-green/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-sm text-zinc-900">Verifications</p>
                          <p className="font-sans text-[10px] text-zinc-400">1 Credit / Req</p>
                        </div>
                      </div>
                      <span className="font-display font-black text-lg text-zinc-950">{Math.floor(totalCredits / COSTS.VERIFY)}x</span>
                    </div>
                  </div>
                </div>

                <div className="mt-10 p-5 bg-amber-50/50 rounded-2xl border border-amber-100 flex gap-4">
                   <Info className="w-4 h-4 text-amber-500 shrink-0" />
                   <p className="font-sans text-[10px] text-amber-900 leading-relaxed">
                     Credits have no expiration. Charges are deducted atomically upon protocol execution.
                   </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
