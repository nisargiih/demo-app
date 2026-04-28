'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Layers, 
  Zap, 
  Settings2, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Download, 
  ShieldCheck, 
  Users,
  Copy,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { jsPDF } from 'jspdf';

interface Template {
  id: string;
  title: string;
  body: string;
  footer: string;
  createdAt: string;
}

export default function GeneratePage() {
  const [activeTab, setActiveTab] = useState<'template' | 'bulk'>('template');
  const [template, setTemplate] = useState<Template>({
    id: 'def-001',
    title: 'Certificate of Authenticity',
    body: 'This document certifies that {{name}} has successfully completed the digital verification protocol.',
    footer: 'Verified by TechCore Relay Node #42',
    createdAt: ''
  });

  const [bulkList, setBulkList] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const calculateHash = async (content: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const handleBulkGenerate = async () => {
    const names = bulkList.split('\n').filter(name => name.trim().length > 0);
    if (names.length === 0) {
      setNotification({ message: 'Please provide at least one entity name.', type: 'error' });
      return;
    }

    setIsGenerating(true);
    setGeneratedCount(0);
    const email = localStorage.getItem('authenticated_user_email');

    try {
      for (const name of names) {
        // 1. Prepare Content
        const content = `
          TITLE: ${template.title}
          ENTITY: ${name.trim()}
          MESSAGE: ${template.body.replace('{{name}}', name.trim())}
          FOOTER: ${template.footer}
          TIMESTAMP: ${new Date().toISOString()}
        `;

        // 2. Generate PDF (Simulation for metadata, real PDF usually generated for user)
        const doc = new jsPDF();
        doc.setFont('helvetica', 'bold');
        doc.text(template.title, 105, 40, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(template.body.replace('{{name}}', name.trim()), 20, 80);
        doc.text(template.footer, 105, 200, { align: 'center' });
        
        // 3. Calculate Hash
        const hash = await calculateHash(content);

        // 4. Store in Ledger
        await fetch('/api/hashes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hash,
            fileName: `${name.trim()}_Certification.pdf`,
            userEmail: email,
            expiryDate: null // Perpetual by default for bulk gen
          }),
        });

        setGeneratedCount(prev => prev + 1);
      }

      setNotification({ message: `Successfully generated and indexed ${names.length} documents.`, type: 'success' });
      setBulkList('');
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Generation protocol interrupted.', type: 'error' });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-6xl mx-auto py-12 lg:py-20">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-trust-green/10 rounded-xl flex items-center justify-center text-trust-green">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="font-display text-4xl font-bold text-zinc-900">Batch Generation</h1>
          </div>
          <p className="font-sans text-zinc-500">Design templates and bulk-issue verifiable cryptographic documents.</p>
        </header>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${
                notification.type === 'success' 
                  ? 'bg-trust-green/5 border-trust-green/20 text-trust-green' 
                  : 'bg-red-50 border-red-100 text-red-600'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-display font-bold text-sm">{notification.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('template')}
            className={`flex-1 md:flex-none h-12 px-8 rounded-xl font-display font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'template' ? 'bg-zinc-950 text-white shadow-xl shadow-zinc-200' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Template Design
          </button>
          <button 
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 md:flex-none h-12 px-8 rounded-xl font-display font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'bulk' ? 'bg-zinc-950 text-white shadow-xl shadow-zinc-200' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Bulk Generation
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Template Section */}
          <section className={`space-y-6 ${activeTab === 'bulk' ? 'hidden lg:block opacity-40 grayscale pointer-events-none' : ''}`}>
            <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="font-display font-bold text-xl text-zinc-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-zinc-400" />
                Structure Definition
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Document Header</label>
                  <input 
                    type="text"
                    value={template.title}
                    onChange={(e) => setTemplate({...template, title: e.target.value})}
                    className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl font-display font-bold text-zinc-900 focus:outline-none focus:border-trust-green transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">
  Body Text (use {'{{'}name{'}}'} placeholder)
</label>
                  <textarea 
                    rows={4}
                    value={template.body}
                    onChange={(e) => setTemplate({...template, body: e.target.value})}
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-sans text-sm text-zinc-600 focus:outline-none focus:border-trust-green transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Verification Footer</label>
                  <input 
                    type="text"
                    value={template.footer}
                    onChange={(e) => setTemplate({...template, footer: e.target.value})}
                    className="w-full h-12 px-4 bg-zinc-50 border border-zinc-100 rounded-xl font-sans text-sm font-bold text-zinc-500 focus:outline-none focus:border-trust-green transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-100 rounded-[2rem] p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-trust-green shadow-sm ring-4 ring-zinc-50">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-bold text-zinc-900 text-sm">Security Invariant</h4>
                <p className="font-sans text-[11px] text-zinc-500">Every bulk generation initiates a unique cryptographic signature in the ledger.</p>
              </div>
            </div>
          </section>

          {/* Bulk Generation Section */}
          <section className={`space-y-6 ${activeTab === 'template' ? 'hidden lg:block opacity-40 grayscale pointer-events-none' : ''}`}>
            <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm">
              <h3 className="font-display font-bold text-xl text-zinc-900 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-zinc-400" />
                Entity Ingestion
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">List Names (One per line)</label>
                  <textarea 
                    rows={8}
                    value={bulkList}
                    onChange={(e) => setBulkList(e.target.value)}
                    placeholder="John Doe&#10;Jane Smith&#10;Node_8829"
                    className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-xl font-mono text-xs text-zinc-600 focus:outline-none focus:border-trust-green transition-all resize-none h-64"
                  />
                </div>

                <button 
                  onClick={handleBulkGenerate}
                  disabled={isGenerating || bulkList.trim().length === 0}
                  className="w-full h-16 bg-trust-green text-white rounded-[1.25rem] font-display font-bold text-lg flex items-center justify-center gap-3 hover:bg-trust-green/90 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all shadow-xl shadow-trust-green/20"
                >
                  {isGenerating ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <RefreshCw className="w-6 h-6" />
                      </motion.div>
                      Processing {generatedCount} Documents...
                    </>
                  ) : (
                    <>
                      Execute Bulk Process
                      <Zap className="w-5 h-5 fill-white" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm ring-4 ring-amber-50">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-bold text-amber-900 text-sm">Ledger Limits</h4>
                <p className="font-sans text-[11px] text-amber-600">Batch processing is limited to 50 entries per protocol cycle for stability.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
