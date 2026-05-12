'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Share2, 
  Copy, 
  CheckCircle2, 
  Globe, 
  Shield, 
  ExternalLink,
  QrCode,
  Link as LinkIcon,
  MessageSquare,
  Share,
  Mail,
  X as CloseIcon
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useUser } from '@/hooks/use-user';
import { useNotification } from '@/hooks/use-notification';
import { QRCodeSVG } from 'qrcode.react';

export default function SharePage() {
  const { user } = useUser();
  const { notify } = useNotification();
  const [hasMounted, setHasMounted] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<{ url: string; title: string } | null>(null);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const baseUrl = hasMounted ? window.location.origin : '';
  const nodeUrl = `${baseUrl}/verify?node=${user?.email || ''}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    notify(`Copied ${type} to clipboard`, 'success');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const shareOptions = [
    {
      title: 'Public Verification Node',
      desc: 'Allow external parties to verify your documents directly against your node.',
      url: nodeUrl,
      icon: Globe,
      color: 'text-trust-green',
      bg: 'bg-trust-green/5'
    }
  ];

  return (
    <main className="relative min-h-screen w-full bg-white dark:bg-zinc-950 selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6 transition-colors duration-300">
      <Sidebar />
      <BackgroundAnimation />

      <div className="relative z-10 w-full max-w-5xl mx-auto py-8 sm:py-12 lg:py-16">
        <header className="mb-12">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex items-center gap-4 mb-4"
           >
             <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-white/10">
               <Share2 className="text-trust-green w-6 h-6" />
             </div>
             <div>
               <h1 className="font-display text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">Share Hub</h1>
               <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400">Distribute your cryptographic identity across the global network.</p>
             </div>
           </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {shareOptions.map((option, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
               className="glass rounded-[3rem] p-8 sm:p-10 border border-zinc-100 dark:border-white/5 shadow-xl shadow-zinc-950/5 dark:shadow-none flex flex-col justify-between"
             >
               <div>
                 <div className={`w-14 h-14 ${option.bg} rounded-2xl flex items-center justify-center mb-6`}>
                   <option.icon className={`w-7 h-7 ${option.color}`} />
                 </div>
                 <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white mb-2">{option.title}</h3>
                 <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8">{option.desc}</p>
               </div>
 
               <div className="space-y-4">
                 <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-white/5 rounded-2xl flex items-center justify-between gap-4">
                   <div className="font-mono text-[11px] text-zinc-400 dark:text-zinc-600 font-bold truncate">
                     {option.url}
                   </div>
                   <button 
                     onClick={() => copyToClipboard(option.url, option.title)}
                     className="p-2 hover:bg-white dark:hover:bg-zinc-900 rounded-lg transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 shrink-0"
                   >
                     {copiedType === option.title ? <CheckCircle2 className="w-4 h-4 text-trust-green" /> : <Copy className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />}
                   </button>
                 </div>
 
                 <div className="flex gap-2">
                    <button 
                     onClick={() => setShowQR({ url: option.url, title: option.title })}
                     className="flex-1 h-12 bg-zinc-100 dark:bg-trust-green text-zinc-950 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-trust-green/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-950/10 dark:shadow-trust-green/10"
                    >
                       <QrCode className="w-4 h-4" /> Generate QR
                    </button>
                    <a 
                      href={option.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-12 h-12 border border-zinc-100 dark:border-white/10 rounded-xl flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
                    >
                      <ExternalLink className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                    </a>
                 </div>
               </div>
            </motion.div>
          ))}
        </div>

        {/* QR Code Modal */}
        {showQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowQR(null)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white dark:bg-zinc-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center border border-zinc-100 dark:border-white/5"
            >
              <button 
                onClick={() => setShowQR(null)}
                className="absolute top-6 right-6 p-2 text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
              
              <div className="mb-6">
                 <h3 className="font-display text-2xl font-bold text-zinc-900 dark:text-white mb-2">{showQR.title}</h3>
                 <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400 lowercase">Scan to authenticate artifacts</p>
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] border border-zinc-100 dark:border-white/5 mb-8 inline-block mx-auto">
                 <QRCodeSVG 
                    value={showQR.url} 
                    size={200} 
                    includeMargin={true}
                    className="mx-auto"
                 />
              </div>

              <button 
                onClick={() => copyToClipboard(showQR.url, 'Link')}
                className="w-full h-12 bg-zinc-100 dark:bg-trust-green text-zinc-950 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-trust-green/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-950/10 dark:shadow-none"
              >
                <Copy className="w-4 h-4" /> Copy Verification Link
              </button>
            </motion.div>
          </div>
        )}

        <section className="glass rounded-[3rem] p-10 border border-zinc-100 dark:border-white/5 shadow-sm relative overflow-hidden">
           <div className="max-w-xl relative z-10">
              <h3 className="font-display text-3xl font-bold text-zinc-900 dark:text-white mb-4">Direct Signature</h3>
              <p className="font-sans text-zinc-500 dark:text-zinc-400 mb-8">Share your public profile or specific document sets with team members or third-party auditors.</p>
              
              <div className="flex flex-wrap gap-4">
                 <button className="h-12 px-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 hover:bg-zinc-950 dark:hover:bg-trust-green hover:text-white dark:hover:text-zinc-950 transition-all flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Twitter
                 </button>
                 <button className="h-12 px-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 hover:bg-zinc-950 dark:hover:bg-trust-green hover:text-white dark:hover:text-zinc-950 transition-all flex items-center gap-2">
                    <Share className="w-4 h-4" /> LinkedIn
                 </button>
                 <button className="h-12 px-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 hover:bg-zinc-950 dark:hover:bg-trust-green hover:text-white dark:hover:text-zinc-950 transition-all flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Node
                 </button>
              </div>
           </div>

           <div className="absolute right-[-5%] top-[-10%] w-64 h-64 bg-trust-green/5 blur-3xl rounded-full" />
        </section>
      </div>
    </main>
  );
}
