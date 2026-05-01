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

const PRICING_TIERS = [
  { id: 'starter', amount: 250, credits: 300, label: 'Observer Node', desc: 'Ideal for light indexing.' },
  { id: 'standard', amount: 750, credits: 950, label: 'Core Professional', desc: 'Optimal for regular notarization.', recommended: true },
  { id: 'pro', amount: 1500, credits: 2000, label: 'Sovereign Authority', desc: 'Maximum throughput for archive audits.' },
];

export default function SubscriptionPage() {
  const { notify } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState<number>(250);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');

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
        config: {
          display: {
            blocks: {
              [paymentMethod]: {
                name: paymentMethod === 'upi' ? 'UPI' : 'Card Payment',
                instruments: [{
                  method: paymentMethod
                }],
              },
            },
            sequence: ['block.' + paymentMethod],
            preferences: {
              show_default_blocks: false,
            },
          },
        },
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
            {/* Left Column: Flow */}
            <div className="flex-1 space-y-12">
              <header>
                <div className="px-3 py-1 bg-trust-green/10 rounded-full inline-block mb-6">
                  <span className="font-mono text-[9px] text-trust-green font-bold uppercase tracking-widest">Financial Interface v4.0</span>
                </div>
                <h1 className="font-display text-5xl lg:text-7xl font-black text-zinc-950 tracking-tight leading-none mb-6">
                   Forge Your <br />
                   <span className="text-trust-green">Energy Core</span>
                </h1>
                <p className="font-sans text-lg text-zinc-500 leading-relaxed max-w-md">
                   Initialize high-density credit injection. Select your protocol tier and verification method.
                </p>
              </header>

              {/* Step 1: Package Selection */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-display font-bold text-xs">01</div>
                  <h3 className="font-display font-bold text-xl text-zinc-900">Select Energy Package</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {PRICING_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setAmount(tier.amount)}
                      className={`p-6 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden group ${
                        amount === tier.amount 
                          ? 'border-trust-green bg-trust-green/5' 
                          : 'border-zinc-100 bg-white hover:border-zinc-200'
                      }`}
                    >
                      <p className={`font-mono text-[9px] font-bold uppercase tracking-widest mb-1 ${amount === tier.amount ? 'text-trust-green' : 'text-zinc-400'}`}>
                        {tier.label}
                      </p>
                      <p className="font-display font-black text-2xl text-zinc-950 mb-4">₹{tier.amount}</p>
                      <p className="font-sans text-[10px] text-zinc-500 leading-tight">{tier.desc}</p>
                      {tier.recommended && (
                        <div className="absolute top-2 right-4">
                          <Sparkles className="w-4 h-4 text-trust-green" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Amount Slider */}
                <div className="p-8 bg-zinc-950 rounded-[2.5rem] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-trust-green/5 blur-[80px] -mr-24 -mt-24 rounded-full" />
                  <label className="font-mono text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em] block mb-6">Custom Pulse Volume (INR)</label>
                  
                  <div className="flex items-center gap-4 mb-8">
                    <span className="font-display text-4xl font-black text-white/40">₹</span>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent font-display text-5xl font-black focus:outline-none"
                    />
                  </div>

                  <input 
                    type="range" 
                    min="200" 
                    max="10000" 
                    step="50"
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-trust-green mb-2"
                  />
                  <div className="flex justify-between font-mono text-[8px] text-zinc-600 font-bold uppercase">
                    <span>MIN: 200</span>
                    <span>MAX: 10,000</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-display font-bold text-xs">02</div>
                  <h3 className="font-display font-bold text-xl text-zinc-900">Choose Verification Port</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('upi')}
                    className={`flex items-center gap-5 p-6 rounded-[2rem] border-2 transition-all text-left ${
                      paymentMethod === 'upi' 
                        ? 'border-trust-green bg-trust-green/5' 
                        : 'border-zinc-100 bg-white hover:border-zinc-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${paymentMethod === 'upi' ? 'bg-trust-green text-white shadow-xl shadow-trust-green/20' : 'bg-zinc-50 text-zinc-400'}`}>
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm text-zinc-900">UPI Transmission</p>
                      <p className="font-sans text-[10px] text-zinc-500">GPay, PhonePe, Any UPI App</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center gap-5 p-6 rounded-[2rem] border-2 transition-all text-left ${
                      paymentMethod === 'card' 
                        ? 'border-trust-green bg-trust-green/5' 
                        : 'border-zinc-100 bg-white hover:border-zinc-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${paymentMethod === 'card' ? 'bg-trust-green text-white shadow-xl shadow-trust-green/20' : 'bg-zinc-50 text-zinc-400'}`}>
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm text-zinc-900">Secure Credit Card</p>
                      <p className="font-sans text-[10px] text-zinc-500">Visa, Mastercard, RuPay</p>
                    </div>
                  </button>
                </div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={isProcessing || amount < 200}
                className="w-full h-24 bg-zinc-950 text-white rounded-[2.5rem] font-display font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-trust-green hover:text-zinc-950 transition-all shadow-2xl shadow-zinc-950/20 group"
              >
                {isProcessing ? 'Synchronizing Archive...' : 'Execute Pulse Protocol'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>

            {/* Right Column: Calculator */}
            <div className="lg:w-[380px] space-y-8">
              <div className="p-10 bg-zinc-50 border border-zinc-100 rounded-[3rem] sticky top-8">
                <div className="flex items-center gap-3 mb-10">
                  <Sparkles className="w-6 h-6 text-trust-green" />
                  <h3 className="font-display font-bold text-xl text-zinc-900">Yield Intel</h3>
                </div>

                <div className="mb-12 p-8 bg-white rounded-[2rem] border border-zinc-200 shadow-xl shadow-zinc-100/50 text-center relative">
                   <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-zinc-950 rounded-full">
                      <span className="font-mono text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Total Atomic Yield</span>
                   </div>
                   <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="font-display font-black text-6xl text-zinc-950">{totalCredits.toLocaleString()}</span>
                    <span className="font-mono text-sm text-trust-green font-bold uppercase">Units</span>
                  </div>
                  <p className="font-sans text-[10px] text-zinc-400 font-bold">Applied strictly to {user?.email || 'Authenticated User'}</p>
                </div>

                <div className="space-y-5">
                  <div className="flex justify-between items-center px-2">
                    <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase">Compute Allocations</span>
                  </div>
                  
                  {[
                    { label: 'Hash Pulses', cost: COSTS.HASH, icon: Zap },
                    { label: 'Registry Vaults', cost: COSTS.REGISTRY, icon: ShieldCheck },
                    { label: 'Verifications', cost: COSTS.VERIFY, icon: CheckCircle2 },
                  ].map((item) => (
                    <div key={item.label} className="p-5 bg-white border border-zinc-200/50 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <item.icon className="w-5 h-5 text-zinc-300 group-hover:text-trust-green transition-colors" />
                        <div>
                          <p className="font-display font-bold text-sm text-zinc-900">{item.label}</p>
                          <p className="font-sans text-[9px] text-zinc-400">{item.cost} Units Each</p>
                        </div>
                      </div>
                      <span className="font-display font-black text-lg text-zinc-950">{Math.floor(totalCredits / item.cost)}x</span>
                    </div>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-zinc-200 flex gap-4">
                   <ShieldAlert className="w-5 h-5 text-zinc-300 shrink-0" />
                   <p className="font-sans text-[10px] text-zinc-500 leading-relaxed italic">
                     "Credits represent finite compute energy. One-time acquisition. 
                     No expiration on synchronized units."
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
