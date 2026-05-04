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
  
  // Wizard State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number>(250);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [vpa, setVpa] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });

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

    if (paymentMethod === 'upi' && !vpa.includes('@')) {
      notify('Please enter a valid UPI ID', 'error');
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

      const options: any = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TECHCORE INFRA",
        description: `Refueling energy core: ${totalCredits} Units`,
        order_id: orderData.id,
        // Headless / Pre-selected Method Configuration
        method: paymentMethod,
        ...(paymentMethod === 'upi' ? { 'vpa': vpa } : {}),
        prefill: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          contact: '9999999999',
          method: paymentMethod
        },
        config: {
          display: {
            blocks: {
              banks: {
                name: paymentMethod === 'upi' ? 'UPI Transmission' : 'Secure Card',
                instruments: [
                  {
                    method: paymentMethod,
                  },
                ],
              },
            },
            sequence: ['block.banks'],
            preferences: {
              show_default_blocks: false,
            },
          },
        },
        handler: async function (response: any) {
          try {
            notify('Verifying energy transmission...', 'loading');
            
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
              notify(`Core Refueled: ${result.message}`, 'success');
              setUser((prev: any) => ({
                ...prev,
                credits: (prev.credits || 0) + result.creditsAdded
              }));
              setTimeout(() => window.location.reload(), 2000);
            } else {
              notify(result.error || 'Verification failure', 'error');
            }
          } catch (err) {
            notify('Atomic verify failed', 'error');
          }
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
    <main className="min-h-screen bg-white overflow-x-hidden">
      <BackgroundAnimation />
      <Sidebar />
      
      <div className="lg:pl-72 min-h-screen flex flex-col">
        <div className="max-w-6xl mx-auto p-6 md:p-10 lg:p-12 xl:p-16 w-full flex-1">
          
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 pb-24">
            {/* Main Wizard Flow */}
            <div className="flex-1 space-y-10">
              <header className="relative">
                <div className="flex items-center gap-4 mb-6">
                  {[1, 2, 3].map((s) => (
                    <div 
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-trust-green' : 'bg-zinc-100'}`}
                    />
                  ))}
                </div>
                <div className="px-3 py-1 bg-trust-green/10 rounded-full inline-block mb-6">
                  <span className="font-mono text-[9px] text-trust-green font-bold uppercase tracking-widest">Protocol Version 4.2</span>
                </div>
                <h1 className="font-display text-5xl lg:text-7xl font-black text-zinc-950 tracking-tight leading-none mb-6">
                   {step === 1 && "Select Fuel"}
                   {step === 2 && "Power Port"}
                   {step === 3 && "Authorization"}
                </h1>
              </header>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {PRICING_TIERS.map((tier) => (
                        <button
                          key={tier.id}
                          onClick={() => setAmount(tier.amount)}
                          className={`p-10 rounded-[2.5rem] border-2 text-left transition-all relative overflow-hidden group h-full flex flex-col ${
                            amount === tier.amount 
                              ? 'border-trust-green bg-trust-green/5' 
                              : 'border-zinc-100 bg-white hover:border-zinc-200'
                          }`}
                        >
                          <p className={`font-mono text-[10px] font-bold uppercase tracking-widest mb-2 ${amount === tier.amount ? 'text-trust-green' : 'text-zinc-400'}`}>
                            {tier.label}
                          </p>
                          <p className="font-display font-black text-4xl text-zinc-950 mb-auto">₹{tier.amount}</p>
                          <p className="font-sans text-[11px] text-zinc-500 leading-relaxed mt-4">{tier.desc}</p>
                          {tier.recommended && (
                            <div className="absolute top-4 right-6">
                              <Sparkles className="w-5 h-5 text-trust-green" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-10 bg-zinc-950 rounded-[3rem] text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-trust-green/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                      <label className="font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] block mb-8 text-center">Calibrate Custom Load (INR)</label>
                      <div className="flex items-center justify-center gap-4 mb-8">
                        <span className="font-display text-5xl font-black text-white/20">₹</span>
                        <input 
                          type="number" 
                          value={amount}
                          onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-48 bg-transparent font-display text-7xl font-black focus:outline-none text-center"
                        />
                      </div>
                      <input 
                        type="range" 
                        min="200" 
                        max="10000" 
                        step="100"
                        value={amount}
                        onChange={(e) => setAmount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-trust-green mb-4"
                      />
                      <div className="flex justify-between font-mono text-[9px] text-zinc-600 font-bold uppercase">
                        <span>Threshold: 200</span>
                        <span>Max Node: 10,000</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setStep(2)}
                      className="w-full h-20 bg-zinc-950 text-white rounded-[1.5rem] font-display font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-trust-green hover:text-zinc-950 transition-all group shadow-xl shadow-zinc-900/10"
                    >
                      Connect Power Port
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <button
                        onClick={() => setPaymentMethod('upi')}
                        className={`flex flex-col items-center justify-center gap-6 p-12 rounded-[3.5rem] border-2 transition-all group relative overflow-hidden ${
                          paymentMethod === 'upi' 
                            ? 'border-trust-green bg-trust-green/5' 
                            : 'border-zinc-100 bg-white hover:border-zinc-200'
                        }`}
                      >
                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all ${paymentMethod === 'upi' ? 'bg-trust-green text-zinc-950 shadow-2xl shadow-trust-green/20' : 'bg-zinc-50 text-zinc-400'}`}>
                          <Zap className="w-10 h-10" />
                        </div>
                        <div className="text-center">
                          <p className="font-display font-black text-xl text-zinc-900 mb-1">UPI Transmit</p>
                          <p className="font-sans text-xs text-zinc-500 font-bold">Standard Network</p>
                        </div>
                      </button>

                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`flex flex-col items-center justify-center gap-6 p-12 rounded-[3.5rem] border-2 transition-all group relative overflow-hidden ${
                          paymentMethod === 'card' 
                            ? 'border-trust-green bg-trust-green/5' 
                            : 'border-zinc-100 bg-white hover:border-zinc-200'
                        }`}
                      >
                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all ${paymentMethod === 'card' ? 'bg-trust-green text-zinc-950 shadow-2xl shadow-trust-green/20' : 'bg-zinc-50 text-zinc-400'}`}>
                          <CreditCard className="w-10 h-10" />
                        </div>
                        <div className="text-center">
                          <p className="font-display font-black text-xl text-zinc-900 mb-1">Direct Card</p>
                          <p className="font-sans text-xs text-zinc-500 font-bold">Encrypted Tunnel</p>
                        </div>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      <button 
                        onClick={() => setStep(1)} 
                        className="h-20 px-8 border-2 border-zinc-100 rounded-[1.5rem] font-display font-bold text-xs uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all sm:w-auto w-full"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        className="flex-1 h-20 bg-zinc-950 text-white rounded-[1.5rem] font-display font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-trust-green hover:text-zinc-950 transition-all group"
                      >
                        Proceed to Archive
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
                    <div className="p-12 bg-zinc-50 rounded-[3.5rem] border border-zinc-100 relative overflow-hidden">
                       <div className="flex items-center gap-4 mb-10">
                          <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center text-trust-green">
                             <ShieldCheck className="w-5 h-5" />
                          </div>
                          <h3 className="font-display font-bold text-xl text-zinc-900">Final Secure Signature</h3>
                       </div>

                       {paymentMethod === 'upi' ? (
                         <div className="space-y-6">
                            <label className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest block">Virtual Private Address (UPI ID)</label>
                            <input 
                              type="text"
                              value={vpa}
                              onChange={(e) => setVpa(e.target.value)}
                              placeholder="identity@vpa"
                              className="w-full h-20 bg-white border border-zinc-200 rounded-2xl px-8 font-display text-2xl font-bold text-zinc-950 focus:border-trust-green focus:outline-none transition-all"
                            />
                            <div className="p-4 bg-zinc-100 rounded-xl flex gap-3">
                               <Info className="w-4 h-4 text-zinc-400 mt-0.5" />
                               <p className="font-sans text-[10px] text-zinc-500 leading-relaxed font-bold">
                                  Your UPI application will receive a collect request verified by TechCore Protocols.
                               </p>
                            </div>
                         </div>
                       ) : (
                         <div className="space-y-6">
                            <div className="space-y-2">
                               <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase">Card Number</label>
                               <input type="text" placeholder="•••• •••• •••• ••••" className="w-full h-16 bg-white border border-zinc-200 rounded-xl px-6 font-mono text-lg focus:border-trust-green outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase">Expiry</label>
                                  <input type="text" placeholder="MM / YY" className="w-full h-16 bg-white border border-zinc-200 rounded-xl px-6 font-mono text-lg focus:border-trust-green outline-none" />
                               </div>
                               <div className="space-y-2">
                                  <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase">CVV</label>
                                  <input type="password" placeholder="•••" className="w-full h-16 bg-white border border-zinc-200 rounded-xl px-6 font-mono text-lg focus:border-trust-green outline-none" />
                               </div>
                            </div>
                            <p className="font-sans text-[10px] text-zinc-400 italic">Note: Card data is processed via secure frame injection. TechCore never persists sensitive strings.</p>
                         </div>
                       )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      <button 
                        onClick={() => setStep(2)} 
                        className="h-20 px-8 border-2 border-zinc-100 rounded-[1.5rem] font-display font-bold text-xs uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 transition-all sm:w-auto w-full"
                      >
                        Back
                      </button>
                      <button
                        onClick={handlePurchase}
                        disabled={isProcessing}
                        className="flex-1 h-20 bg-trust-green text-zinc-950 rounded-[1.5rem] font-display font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-zinc-950 hover:text-white transition-all group shadow-2xl shadow-trust-green/20 disabled:opacity-50"
                      >
                        {isProcessing ? 'Transmitting...' : 'Confirm Injection'}
                        <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Side Intel Panel */}
            <div className="lg:w-[380px] space-y-8">
              <div className="p-10 bg-zinc-950 rounded-[3.5rem] sticky top-8 text-white relative overflow-hidden border border-zinc-800">
                <div className="absolute top-0 left-0 w-full h-1 bg-trust-green/30" />
                
                <div className="flex items-center gap-3 mb-12">
                  <Sparkles className="w-6 h-6 text-trust-green" />
                  <h3 className="font-display font-bold text-xl">Core Manifest</h3>
                </div>

                <div className="mb-12 space-y-6">
                   <div className="p-8 bg-zinc-900/50 rounded-[2rem] border border-zinc-800/50 text-center">
                      <p className="font-mono text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-4">Projected Energy Yield</p>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="font-display font-black text-6xl">{totalCredits.toLocaleString()}</span>
                        <span className="font-mono text-xs text-trust-green font-bold uppercase tracking-widest">Units</span>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-zinc-800/50">
                        <span className="font-sans text-xs text-zinc-400 font-bold">Recharge Volume</span>
                        <span className="font-display font-bold text-lg text-white">₹{amount}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-zinc-800/50">
                        <span className="font-sans text-xs text-zinc-400 font-bold">Transfer Gateway</span>
                        <span className="font-mono text-[10px] text-trust-green font-bold uppercase tracking-widest">{paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="font-sans text-xs text-zinc-400 font-bold">Protocol Tax</span>
                        <span className="font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-widest">0.00 INCL.</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-5">
                  <span className="font-mono text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Computational Capacity</span>
                  {[
                    { label: 'Hashes', cost: COSTS.HASH, icon: Zap },
                    { label: 'Uploads', cost: COSTS.REGISTRY, icon: ShieldCheck },
                    { label: 'Verifies', cost: COSTS.VERIFY, icon: CheckCircle2 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl group hover:border-trust-green/30 transition-all">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-zinc-500 group-hover:text-trust-green transition-colors" />
                        <span className="font-display font-bold text-sm text-zinc-200">{item.label}</span>
                      </div>
                      <span className="font-display font-black text-lg text-white">{Math.floor(totalCredits / item.cost)}x</span>
                    </div>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-zinc-800 flex gap-4">
                   <ShieldAlert className="w-5 h-5 text-zinc-600 shrink-0" />
                   <p className="font-sans text-[10px] text-zinc-500 leading-relaxed italic">
                     Stored energy remains active across all TechCore nodes. 
                     No expiration. Instant atomic delivery.
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
