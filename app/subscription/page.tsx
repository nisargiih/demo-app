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

const PRICING_TIERS = [
  { id: 'starter', amount: 150, credits: 180, label: 'Entry Protocol', recommended: false },
  { id: 'standard', amount: 500, credits: 620, label: 'Core Professional', recommended: true, bonus: 20 },
  { id: 'enterprise', amount: 1000, credits: 1300, label: 'Sovereign Node', recommended: false, bonus: 100 },
];

export default function SubscriptionPage() {
  const { notify } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const email = localStorage.getItem('authenticated_user_email');
      if (!email) return;

      try {
        const res = await fetch(`/api/auth/me?email=${email}`);
        if (res.ok) {
          const body = await res.json();
          const data = SecurityService.processFromTransit(body);
          setUser(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const handlePurchase = async (tier: typeof PRICING_TIERS[0]) => {
    if (!user) {
      notify('Session invalid. Please reconnect.', 'error');
      return;
    }

    setIsProcessing(true);
    setSelectedTier(tier.id);

    try {
      // 1. Create order on server
      const orderRes = await fetch('/api/payment/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: tier.amount,
          email: user.email
        })
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to initialize order');

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TECHCORE INFRA",
        description: `Protocol Credits: ${tier.credits} Units`,
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
                amount: tier.amount
              })
            });

            const verifyData = await verifyRes.json();
            const result = SecurityService.processFromTransit(verifyData);

            if (verifyRes.ok && result.success) {
              notify(`Protocol Synchronized: ${result.message}`, 'success');
              // Refresh user data locally
              setUser((prev: any) => ({
                ...prev,
                credits: (prev.credits || 0) + result.creditsAdded
              }));
              // Re-sync after delay
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
        },
        theme: {
          color: "#000000",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        notify('Payment sequence terminated by agent', 'error');
      });
      rzp.open();

    } catch (err) {
      notify(err instanceof Error ? err.message : 'System fault detected', 'error');
    } finally {
      setIsProcessing(false);
      setSelectedTier(null);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <BackgroundAnimation />
      <Sidebar />
      
      <div className="lg:pl-72 min-h-screen">
        <div className="max-w-6xl mx-auto p-8 lg:p-12 xl:p-16">
          
          {/* Header */}
          <div className="max-w-3xl mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-6"
            >
              <div className="px-3 py-1 bg-trust-green/10 rounded-full">
                <span className="font-mono text-[10px] text-trust-green font-bold uppercase tracking-widest">Financial Interface v2.0</span>
              </div>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-5xl lg:text-7xl font-black text-zinc-950 tracking-tight leading-none mb-8"
            >
              Power Your <br />
              <span className="text-trust-green">Tech Stack</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-sans text-xl text-zinc-500 leading-relaxed max-w-2xl"
            >
              Secure credits to execute high-compute protocols, notarize directories, 
              and verify identity archives with enterprise-grade resilience.
            </motion.p>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-zinc-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-zinc-950/20"
             >
                <div className="absolute top-0 right-0 w-48 h-48 bg-trust-green/10 blur-[80px] -mr-24 -mt-24 rounded-full" />
                <Wallet className="w-10 h-10 text-trust-green mb-8" />
                <p className="font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Authenticated Balance</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <h2 className="font-display text-6xl font-black text-white">{user?.credits?.toLocaleString() || '0'}</h2>
                  <span className="font-mono text-xs text-trust-green font-bold uppercase">Units</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-sans text-xs font-bold">Secured by AES-256 Ledger</span>
                </div>
             </motion.div>

             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.1 }}
               className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-10 flex flex-col justify-center"
             >
                <Zap className="w-10 h-10 text-zinc-300 mb-8" />
                <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Active Protocol</p>
                <h2 className="font-display text-3xl font-bold text-zinc-900 mb-4 italic">Pay-As-You-Flow</h2>
                <p className="font-sans text-sm text-zinc-500 leading-relaxed">
                   No subscriptions. No recurring traps. <br />
                   Only pay for what you synchronize.
                </p>
             </motion.div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
            {PRICING_TIERS.map((tier, idx) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className={`relative flex flex-col p-10 rounded-[2.5rem] transition-all duration-500 overflow-hidden ${
                  tier.recommended 
                    ? 'bg-white border-2 border-trust-green shadow-xl shadow-trust-green/5' 
                    : 'bg-white border border-zinc-100 hover:border-zinc-200'
                }`}
              >
                {tier.recommended && (
                  <div className="absolute top-6 right-6">
                    <Sparkles className="w-6 h-6 text-trust-green" />
                  </div>
                )}

                <div className="mb-10">
                  <p className={`font-mono text-[10px] font-bold uppercase tracking-widest mb-2 ${tier.recommended ? 'text-trust-green' : 'text-zinc-400'}`}>
                    {tier.label}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-5xl text-zinc-950">₹{tier.amount}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-6 mb-12">
                   <div className="p-6 bg-zinc-50 rounded-[1.5rem] space-y-1">
                      <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase">Allocated Credits</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display font-black text-3xl text-zinc-950">{tier.credits}</span>
                        <span className="font-mono text-xs text-zinc-500 font-bold">Units</span>
                      </div>
                      {tier.bonus && (
                        <p className="font-sans text-[10px] text-trust-green font-bold">Includes {tier.bonus} bonus credits</p>
                      )}
                   </div>

                   <ul className="space-y-4">
                      {[
                        'One-time authorization',
                        'No recursive billing',
                        'Atomic delivery',
                        '24/7 Priority Node Access'
                      ].map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <CheckCircle2 className={`w-4 h-4 ${tier.recommended ? 'text-trust-green' : 'text-zinc-300'}`} />
                          <span className="font-sans text-xs font-bold text-zinc-600">{feature}</span>
                        </li>
                      ))}
                   </ul>
                </div>

                <button
                  onClick={() => handlePurchase(tier)}
                  disabled={isProcessing}
                  className={`group relative w-full h-20 rounded-2xl font-display font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 overflow-hidden ${
                    tier.recommended 
                      ? 'bg-zinc-950 text-white hover:bg-zinc-800' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-950 hover:text-white'
                  }`}
                >
                   {isProcessing && selectedTier === tier.id ? (
                     <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                   ) : (
                     <>
                        Initialize Payment
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                     </>
                   )}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-zinc-100 pt-20 pb-32">
            <div className="space-y-6">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-display text-2xl font-bold text-zinc-900">Safety Protocol</h3>
              <p className="font-sans text-base text-zinc-500 leading-relaxed">
                Transactions are processed through encrypted gateways. TECHCORE never stores 
                raw payment signatures or credit card data. All purchases are final and applied 
                directly to your atomic balance.
              </p>
            </div>
            <div className="space-y-6">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center">
                <Info className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-zinc-900">Credit Utility</h3>
              <p className="font-sans text-base text-zinc-500 leading-relaxed">
                Credits are spent based on compute complexity. Simple file index protocols cost 
                nominal units, while full archive audits and bulk notarization require high-density 
                allocations.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
