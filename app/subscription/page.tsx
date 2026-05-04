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
    <main className="min-h-screen bg-zinc-50 overflow-x-hidden selection:bg-trust-green/30">
      <BackgroundAnimation />
      <Sidebar />
      
      <div className="lg:pl-72 min-h-screen relative z-10">
        <div className="max-w-5xl mx-auto p-4 md:p-10 lg:p-12 xl:p-16">
          
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-16">
            {/* Main Processor */}
            <div className="flex-1 w-full space-y-8">
              <header className="space-y-4">
                <div className="flex gap-2">
                  {[1, 2, 3].map((s) => (
                    <div 
                      key={s}
                      className={`h-1.5 rounded-full transition-all duration-700 ${
                        step === s ? 'w-12 bg-trust-green' : 'w-4 bg-zinc-200'
                      } ${step > s ? 'bg-zinc-900 w-4' : ''}`}
                    />
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-zinc-200 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-trust-green animate-pulse" />
                  <span className="font-mono text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Live Node Connection</span>
                </div>
                <h1 className="font-display text-4xl md:text-6xl font-black text-zinc-950 tracking-tight leading-[0.9]">
                   {step === 1 && "Select Your Fuel"}
                   {step === 2 && "Payment Method"}
                   {step === 3 && "Authorization"}
                </h1>
              </header>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {PRICING_TIERS.map((tier) => (
                        <button
                          key={tier.id}
                          onClick={() => setAmount(tier.amount)}
                          className={`group p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden flex flex-col min-h-[160px] ${
                            amount === tier.amount 
                              ? 'border-zinc-950 bg-zinc-950 text-white shadow-xl scale-[1.02]' 
                              : 'border-white bg-white/60 backdrop-blur-sm hover:border-zinc-200 text-zinc-950'
                          }`}
                        >
                          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest mb-1 ${amount === tier.amount ? 'text-trust-green' : 'text-zinc-400'}`}>
                            {tier.label}
                          </span>
                          <span className="font-display font-black text-3xl mb-auto">₹{tier.amount}</span>
                          <p className={`font-sans text-[11px] leading-tight mt-4 ${amount === tier.amount ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {tier.desc}
                          </p>
                          {tier.recommended && amount !== tier.amount && (
                            <Sparkles className="absolute top-4 right-4 w-4 h-4 text-trust-green" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="p-8 bg-white border-2 border-white rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                      <label className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] block mb-6 text-center">Precise Calibration (INR)</label>
                      <div className="flex items-center justify-center gap-2 mb-6">
                        <span className="font-display text-4xl font-black text-zinc-200">₹</span>
                        <input 
                          type="number" 
                          value={amount}
                          onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-40 bg-transparent font-display text-6xl font-black focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-zinc-950"
                        />
                      </div>
                      <input 
                        type="range" 
                        min="200" 
                        max="10000" 
                        step="100"
                        value={amount}
                        onChange={(e) => setAmount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-950 mb-4"
                      />
                      <div className="flex justify-between font-mono text-[9px] text-zinc-400 font-bold uppercase">
                        <span>200 (Min)</span>
                        <span>10,000 (Limit)</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => setStep(2)}
                        className="w-full h-20 bg-zinc-950 text-white rounded-2xl font-display font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-trust-green hover:text-zinc-950 transition-all active:scale-[0.98] shadow-lg shadow-zinc-900/20"
                      >
                        Interface Connection
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => { setPaymentMethod('upi'); setStep(3); }}
                        className="flex items-center gap-6 p-8 rounded-3xl bg-white border-2 border-white hover:border-zinc-200 transition-all text-left shadow-sm group active:scale-[0.98]"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center group-hover:bg-trust-green/10 transition-colors">
                          <Zap className="w-8 h-8 text-zinc-400 group-hover:text-trust-green" />
                        </div>
                        <div>
                          <p className="font-display font-black text-lg text-zinc-950">UPI Transmission</p>
                          <p className="font-sans text-xs text-zinc-500 font-bold">VPA / Google Pay / PhonePe</p>
                        </div>
                      </button>

                      <button
                        onClick={() => { setPaymentMethod('card'); setStep(3); }}
                        className="flex items-center gap-6 p-8 rounded-3xl bg-white border-2 border-white hover:border-zinc-200 transition-all text-left shadow-sm group active:scale-[0.98]"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center group-hover:bg-trust-green/10 transition-colors">
                          <CreditCard className="w-8 h-8 text-zinc-400 group-hover:text-trust-green" />
                        </div>
                        <div>
                          <p className="font-display font-black text-lg text-zinc-950">Secure Card</p>
                          <p className="font-sans text-xs text-zinc-500 font-bold">Visa / Master / RuPay</p>
                        </div>
                      </button>
                    </div>

                    <button 
                      onClick={() => setStep(1)} 
                      className="w-full py-4 font-display font-bold text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      &larr; Switch Magnitude
                    </button>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="p-8 md:p-12 bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-200/40 relative overflow-hidden">
                       <div className="flex items-center gap-4 mb-10">
                          <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center text-trust-green">
                             <ShieldCheck className="w-5 h-5" />
                          </div>
                          <h3 className="font-display font-bold text-xl text-zinc-900">Atomic Encryption</h3>
                       </div>

                       {paymentMethod === 'upi' ? (
                         <div className="space-y-6">
                            <div className="space-y-2">
                              <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-2">Verification ID</label>
                              <input 
                                type="text"
                                value={vpa}
                                onChange={(e) => setVpa(e.target.value)}
                                placeholder="identity@vpa"
                                className="w-full h-20 bg-zinc-50 border-2 border-transparent rounded-2xl px-8 font-display text-2xl font-black text-zinc-950 focus:bg-white focus:border-trust-green outline-none transition-all placeholder:text-zinc-200"
                              />
                            </div>
                            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 flex gap-4">
                               <Info className="w-5 h-5 text-zinc-300 shrink-0 mt-0.5" />
                               <p className="font-sans text-[11px] text-zinc-500 leading-relaxed font-bold">
                                  Submit VPA to initialize parallel verification. Ensure your node matches the authenticated signature.
                               </p>
                            </div>
                         </div>
                       ) : (
                         <div className="space-y-6">
                            <div className="space-y-2">
                               <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase ml-2">Protocol Key (Card Number)</label>
                               <input 
                                  type="text" 
                                  placeholder="4242 4242 4242 4242"
                                  maxLength={19}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                                    const formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                                    e.target.value = formattedValue;
                                  }}
                                  className="w-full h-16 bg-zinc-50 border-transparent border-2 rounded-2xl px-6 font-mono text-lg focus:bg-white focus:border-trust-green outline-none transition-all placeholder:text-zinc-200" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase ml-2">Temporal Limit</label>
                                  <input 
                                    type="text" 
                                    placeholder="MM / YY" 
                                    maxLength={5}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                                      if (value.length >= 3) {
                                        e.target.value = value.slice(0, 2) + ' / ' + value.slice(2, 4);
                                      }
                                    }}
                                    className="w-full h-16 bg-zinc-50 border-transparent border-2 rounded-2xl px-6 font-mono text-lg focus:bg-white focus:border-trust-green outline-none transition-all placeholder:text-zinc-200" 
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="font-mono text-[9px] text-zinc-400 font-bold uppercase ml-2">Ciphers</label>
                                  <input 
                                    type="password" 
                                    placeholder="•••" 
                                    maxLength={4}
                                    className="w-full h-16 bg-zinc-50 border-transparent border-2 rounded-2xl px-6 font-mono text-lg focus:bg-white focus:border-trust-green outline-none transition-all placeholder:text-zinc-200" 
                                  />
                               </div>
                            </div>
                            <p className="font-sans text-[10px] text-zinc-400 italic text-center">TechCore protocols never persist sensitive strings directly into the primary vault.</p>
                         </div>
                       )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <button 
                        onClick={() => setStep(2)} 
                        className="h-20 px-8 rounded-2xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-400 hover:bg-white hover:text-zinc-600 transition-all border border-transparent hover:border-zinc-200"
                      >
                        Back to Port
                      </button>
                      <button
                        onClick={handlePurchase}
                        disabled={isProcessing}
                        className="flex-1 h-20 bg-trust-green text-zinc-950 rounded-2xl font-display font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-zinc-950 hover:text-white transition-all group shadow-xl shadow-trust-green/20 disabled:opacity-50 active:scale-[0.98]"
                      >
                        {isProcessing ? 'Synchronizing...' : 'Authorize Injection'}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Side Info - Sticky on Desktop, Static below flow on Mobile */}
            <div className="w-full lg:w-[360px] flex flex-col gap-6">
              <div className="p-10 bg-zinc-950 rounded-[2.5rem] lg:sticky lg:top-8 text-white relative overflow-hidden border border-zinc-800 shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-trust-green/10 blur-[60px] rounded-full -mr-16 -mt-16" />
                
                <div className="flex items-center gap-3 mb-10">
                  <Sparkles className="w-5 h-5 text-trust-green" />
                  <h3 className="font-display font-bold text-lg uppercase tracking-tight">Node Summary</h3>
                </div>

                <div className="space-y-8">
                   <div className="space-y-2">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-display font-black text-4xl leading-none">{totalCredits.toLocaleString()}</span>
                        <span className="font-mono text-[10px] text-trust-green font-bold uppercase tracking-widest">Units</span>
                      </div>
                      <p className="font-mono text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Projected Energy Yield</p>
                   </div>

                   <div className="space-y-4 pt-6 border-t border-zinc-800/50">
                      <div className="flex justify-between items-center group">
                        <span className="font-sans text-xs text-zinc-500 font-bold group-hover:text-zinc-400 transition-colors">Recharge Volume</span>
                        <span className="font-display font-bold text-lg text-white">₹{amount}</span>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="font-sans text-xs text-zinc-500 font-bold group-hover:text-zinc-400 transition-colors">Network Route</span>
                        <span className="font-mono text-[10px] text-trust-green font-bold uppercase tracking-widest px-2 py-0.5 bg-trust-green/5 rounded">{paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center opacity-40">
                        <span className="font-sans text-xs text-zinc-500 font-bold">Audit Tax</span>
                        <span className="font-mono text-[10px] text-white font-bold uppercase tracking-widest">0.00</span>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-zinc-800/50 space-y-4">
                      <p className="font-mono text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Capacity Metrics</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { icon: Zap, val: Math.floor(totalCredits / COSTS.HASH) },
                          { icon: ShieldCheck, val: Math.floor(totalCredits / COSTS.REGISTRY) },
                          { icon: CheckCircle2, val: Math.floor(totalCredits / COSTS.VERIFY) },
                        ].map((m, i) => (
                          <div key={i} className="bg-zinc-900 border border-zinc-800/50 p-3 rounded-xl flex flex-col items-center gap-1">
                            <m.icon className="w-3 h-3 text-zinc-500" />
                            <span className="font-display font-bold text-xs">{m.val}x</span>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800 flex gap-3">
                   <Info className="w-4 h-4 text-zinc-600 shrink-0" />
                   <p className="font-sans text-[10px] text-zinc-600 leading-relaxed italic">
                     Syncing with {user?.email || 'Anonymous'}
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
