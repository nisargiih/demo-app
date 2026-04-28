'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Image as ImageIcon,
  Type,
  Palette,
  Layout,
  Eye,
  Save,
  ArrowRight,
  ArrowLeft,
  Stamp,
  PenTool,
  Copy,
  ChevronRight,
  AlertCircle,
  Clock,
  History,
  FileDown,
  ExternalLink
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// --- Types & Interfaces ---

interface Asset {
  logo?: string;
  signature?: string;
  stamp?: string;
  customImages: string[];
}

interface TemplateConfig {
  _id?: string;
  name: string;
  title: string;
  companyName: string;
  companyDetails: string;
  bodyText: string;
  footerText: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: 'serif' | 'sans' | 'mono';
  alignment: 'left' | 'center' | 'right';
  layout: 'classic' | 'modern' | 'minimal';
  assets: Asset;
}

interface IssuanceData {
  recipientName: string;
  description: string;
  issueDate: string;
  expiryDate: string;
  certificateId: string;
  customMessage: string;
}

// --- Constants ---

const DEFAULT_TEMPLATE: TemplateConfig = {
  name: 'Untitled Template',
  title: 'CERTIFICATE OF ACHIEVEMENT',
  companyName: 'TechCore Systems Inc.',
  companyDetails: '128 Network Relay Blvd, San Francisco, CA',
  bodyText: 'This document serves as official recognition that {{recipient_name}} has successfully demonstrated exceptional proficiency in {{description}}. This certification is valid until {{expiry_date}}.',
  footerText: 'Verified by TechCore Autonomous Relay Node',
  primaryColor: '#10b981', // trust-green
  accentColor: '#09090b', // zinc-950
  fontFamily: 'serif',
  alignment: 'center',
  layout: 'modern',
  assets: {
    customImages: []
  }
};

// --- Logic: Placeholder Replacement ---

const replacePlaceholders = (text: string, data: IssuanceData, template: TemplateConfig) => {
  let result = text;
  result = result.replace(/\{\{recipient_name\}\}/g, data.recipientName || '[RECIPIENT]');
  result = result.replace(/\{\{certificate_title\}\}/g, template.title || '[TITLE]');
  result = result.replace(/\{\{description\}\}/g, data.description || '[DESCRIPTION]');
  result = result.replace(/\{\{issue_date\}\}/g, data.issueDate || '[ISSUE_DATE]');
  result = result.replace(/\{\{expiry_date\}\}/g, data.expiryDate || '[NEVER]');
  result = result.replace(/\{\{certificate_id\}\}/g, data.certificateId || '[ID]');
  result = result.replace(/\{\{company_name\}\}/g, template.companyName || '[COMPANY]');
  return result;
};

// --- Sub-Components ---

const CertificatePreview = ({ 
  template, 
  data, 
  isFinal = false, 
  previewRef 
}: { 
  template: TemplateConfig, 
  data: IssuanceData, 
  isFinal?: boolean,
  previewRef?: React.RefObject<HTMLDivElement | null>
}) => {
  const alignClass = 
    template.alignment === 'center' ? 'text-center items-center' : 
    template.alignment === 'right' ? 'text-right items-end' : 'text-left items-start';

  const fontClass = 
    template.fontFamily === 'serif' ? 'font-serif' : 
    template.fontFamily === 'mono' ? 'font-mono' : 'font-sans';

  return (
    <div 
      ref={isFinal ? previewRef : null}
      className={`bg-white relative overflow-hidden shadow-2xl border-zinc-200 transition-all ${isFinal ? 'w-[1000px] aspect-[1.414/1]' : 'w-full aspect-[1.414/1] scale-100'} ${fontClass}`}
      style={{ padding: '80px', border: `20px solid ${template.primaryColor}20` }}
    >
      {/* Decorative Border */}
      <div className="absolute inset-4 border border-zinc-100" />
      <div className="absolute inset-8 border-4 border-zinc-50" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-50/50 -translate-y-1/2 translate-x-1/2 rotate-45" />

      <div className={`relative h-full flex flex-col justify-between ${alignClass}`}>
        {/* Header Area */}
        <div className="w-full flex flex-col items-center">
          {template.assets.logo ? (
            <img src={template.assets.logo} className="h-16 mb-6 object-contain" alt="Logo" />
          ) : (
            <ShieldCheck className="w-16 h-16 text-trust-green mb-6" />
          )}
          <h4 className="font-mono text-[10px] tracking-[0.4em] font-bold text-zinc-400 mb-2">{template.companyName.toUpperCase()}</h4>
          <div className="h-px w-20 bg-trust-green/20 mb-8" />
        </div>

        {/* Main Content */}
        <div className={`space-y-8 ${alignClass} w-full`}>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-950 tracking-tighter" style={{ color: template.accentColor }}>
            {template.title}
          </h1>
          
          <div className="space-y-4">
            <p className="font-display font-medium text-zinc-400 italic">This is to certify that</p>
            <h2 className="text-5xl md:text-6xl font-black text-trust-green decoration-trust-green/20 underline-offset-8" style={{ color: template.primaryColor }}>
              {data.recipientName || 'RECIPIENT_NAME'}
            </h2>
          </div>

          <div className="max-w-2xl text-lg text-zinc-600 leading-relaxed font-medium">
            {replacePlaceholders(template.bodyText, data, template)}
          </div>
        </div>

        {/* Footer Area */}
        <div className="w-full grid grid-cols-3 items-end mt-12 gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-full h-px bg-zinc-100 mb-4" />
            <div className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider mb-1">Issue Date</div>
            <p className="font-display font-bold text-sm text-zinc-900">{data.issueDate}</p>
          </div>

          <div className="flex flex-col items-center relative gap-2">
            <div className="absolute -top-16 opacity-30">
              {template.assets.stamp && <img src={template.assets.stamp} className="w-32 h-32 object-contain grayscale" alt="Stamp" />}
            </div>
            <p className="font-sans text-[10px] text-zinc-300 text-center uppercase tracking-widest mb-1">{template.footerText}</p>
            <div className="font-mono text-[9px] font-bold text-trust-green">#ID {data.certificateId}</div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-full h-px bg-zinc-100 mb-2" />
            {template.assets.signature && <img src={template.assets.signature} className="h-10 object-contain mb-2 mix-blend-multiply" alt="Signature" />}
            <div className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider">Authorized Registry</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---

export default function GeneratePage() {
  // State: Workflow
  const [activeTab, setActiveTab] = useState<'create' | 'issue' | 'history'>('create');
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Design, 2: Preview, 3: Issue
  
  // State: Templates
  const [currentTemplate, setCurrentTemplate] = useState<TemplateConfig>(DEFAULT_TEMPLATE);
  const [savedTemplates, setSavedTemplates] = useState<TemplateConfig[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // State: Issuance
  const [issuance, setIssuance] = useState<IssuanceData>({
    recipientName: '',
    description: '',
    issueDate: '',
    expiryDate: '',
    certificateId: '',
    customMessage: ''
  });

  // State: UI & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // --- Fetching & Persistence ---

  const fetchTemplates = useCallback(async () => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) return;
    try {
      const res = await fetch(`/api/templates?email=${email}`);
      if (res.ok) {
        const data = await res.json();
        setSavedTemplates(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // --- Effects ---

  useEffect(() => {
    const init = async () => {
      await fetchTemplates();
      setIssuance(prev => ({
        ...prev,
        issueDate: new Date().toISOString().split('T')[0],
        certificateId: `TC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      }));
    };
    init();
  }, [fetchTemplates]);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveTemplate = async () => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) return;
    
    setIsLoading(true);
    try {
      const method = currentTemplate._id ? 'PATCH' : 'POST';
      const body = currentTemplate._id 
        ? { ...currentTemplate, id: currentTemplate._id } 
        : { ...currentTemplate, userEmail: email };

      const res = await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        notify('Template saved successfully.');
        fetchTemplates();
      } else {
        notify('Failed to preserve template.', 'error');
      }
    } catch (err) {
      notify('Network error.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Permanent deletion requested. Confirm?')) return;
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify('Template purged.');
        fetchTemplates();
        if (selectedTemplateId === id) setSelectedTemplateId('');
      }
    } catch (err) {
      notify('Deletion failed.', 'error');
    }
  };


  // --- Logic: PDF Generation ---

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setIsLoading(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 3, // High quality
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Store in ledger as well
      const email = localStorage.getItem('authenticated_user_email');
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imgData));
      const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      await fetch('/api/hashes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash: hashHex,
          fileName: `${issuance.recipientName || 'CERT'}_${issuance.certificateId}.pdf`,
          userEmail: email,
          expiryDate: issuance.expiryDate || null
        }),
      });

      pdf.save(`${issuance.recipientName || 'Certificate'}_${issuance.certificateId}.pdf`);
      notify('Protocol successfully issued and indexed.');
    } catch (err) {
      console.error(err);
      notify('PDF rendering error.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Asset Upload Helpers ---

  const handleAssetUpload = (type: keyof Asset, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'customImages') {
        setCurrentTemplate({
          ...currentTemplate,
          assets: { ...currentTemplate.assets, customImages: [...currentTemplate.assets.customImages, base64] }
        });
      } else {
        setCurrentTemplate({
          ...currentTemplate,
          assets: { ...currentTemplate.assets, [type]: base64 }
        });
      }
    };
    reader.readAsDataURL(file);
  };






  // --- Render Sections ---

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-12 lg:pt-0 pb-20 px-6">
      <BackgroundAnimation />
      <Sidebar />

      <div className="relative z-10 w-full max-w-7xl mx-auto py-12 lg:py-20">
        {/* Top Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-3xl flex items-center gap-3 border shadow-2xl backdrop-blur-xl ${
                notification.type === 'success' 
                  ? 'bg-zinc-950/90 border-trust-green/20 text-white' 
                  : 'bg-red-500/90 border-red-400/20 text-white'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-trust-green" /> : <AlertCircle className="w-5 h-5" />}
              <p className="font-display font-bold text-sm">{notification.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-trust-green/10 rounded-[1.25rem] flex items-center justify-center text-trust-green shadow-sm ring-4 ring-trust-green/5">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-display text-4xl font-black text-zinc-900 tracking-tighter uppercase">DocEngine v2</h1>
                <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Advanced Document Generation Protocol</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-1.5 bg-zinc-50 border border-zinc-100 rounded-2xl shadow-sm">
            {['create', 'issue', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-8 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? 'bg-zinc-950 text-white shadow-xl shadow-zinc-200' 
                    : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-12">
          {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Creator Controls (Left) */}
              <div className="lg:col-span-5 space-y-8">
                <section className="bg-zinc-50/50 border border-zinc-100 rounded-[2.5rem] p-8 space-y-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-display font-black text-xl text-zinc-900 flex items-center gap-3">
                      <Layout className="w-5 h-5 text-zinc-400" />
                      BUILDER
                    </h3>
                    <button 
                      onClick={handleSaveTemplate}
                      disabled={isLoading}
                      className="h-10 px-6 bg-zinc-950 text-white rounded-xl font-display font-extrabold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 disabled:opacity-50"
                    >
                      {isLoading ? 'SYNCING...' : 'SAVE DRAFT'}
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* General Config */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] px-1">Template Name</label>
                       <input 
                         type="text"
                         value={currentTemplate.name}
                         onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                         className="w-full h-14 px-5 bg-white border border-zinc-100 rounded-2xl font-display font-bold text-sm focus:outline-none focus:border-trust-green shadow-sm text-zinc-900"
                         placeholder="Modern Certificate A"
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Major Header</label>
                          <input 
                            type="text"
                            value={currentTemplate.title}
                            onChange={(e) => setCurrentTemplate({...currentTemplate, title: e.target.value})}
                            className="w-full h-12 px-4 bg-white border border-zinc-100 rounded-xl font-display font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Organization</label>
                          <input 
                            type="text"
                            value={currentTemplate.companyName}
                            onChange={(e) => setCurrentTemplate({...currentTemplate, companyName: e.target.value})}
                            className="w-full h-12 px-4 bg-white border border-zinc-100 rounded-xl font-display font-bold text-xs"
                          />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Body Protocol (Use placeholders)</label>
                        <textarea 
                          rows={4}
                          value={currentTemplate.bodyText}
                          onChange={(e) => setCurrentTemplate({...currentTemplate, bodyText: e.target.value})}
                          className="w-full p-4 bg-white border border-zinc-100 rounded-2xl font-sans text-xs text-zinc-600 focus:outline-none focus:border-trust-green shadow-sm resize-none"
                        />
                         <div className="flex flex-wrap gap-2 pt-2">
                            {['recipient_name', 'description', 'issue_date', 'expiry_date', 'certificate_id'].map(p => (
                              <button key={p} className="px-3 py-1.5 bg-zinc-100 border border-zinc-200 rounded-lg font-mono text-[8px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase">
                                {'{{'}{p}{'}}'}
                              </button>
                            ))}
                         </div>
                    </div>
                  </div>

                  {/* Visuals */}
                  <div className="pt-8 border-t border-zinc-100 space-y-6">
                     <h4 className="font-mono text-[10px] font-black text-zinc-950 uppercase tracking-[0.3em]">Visual Parameters</h4>
                     
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Brand Ink</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={currentTemplate.primaryColor}
                              onChange={(e) => setCurrentTemplate({...currentTemplate, primaryColor: e.target.value})}
                              className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 overflow-hidden"
                            />
                            <span className="font-mono text-[10px] font-bold text-zinc-900">{currentTemplate.primaryColor.toUpperCase()}</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Typography</label>
                          <select 
                            value={currentTemplate.fontFamily}
                            onChange={(e) => setCurrentTemplate({...currentTemplate, fontFamily: e.target.value as any})}
                            className="w-full h-12 px-4 bg-white border border-zinc-100 rounded-xl font-display font-extrabold text-[10px] uppercase tracking-widest"
                          >
                            <option value="serif">Classic Serif</option>
                            <option value="sans">Modern Sans</option>
                            <option value="mono">Technical Mono</option>
                          </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-3">
                        {['classic', 'modern', 'minimal'].map(l => (
                          <button
                            key={l}
                            onClick={() => setCurrentTemplate({...currentTemplate, layout: l as any})}
                            className={`h-11 rounded-xl font-display font-extrabold text-[9px] uppercase tracking-widest transition-all ${
                              currentTemplate.layout === l ? 'bg-zinc-950 text-white shadow-lg' : 'bg-white border border-zinc-100 text-zinc-400 hover:border-zinc-300'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                     </div>
                  </div>

                  {/* Asset Manager */}
                  <div className="pt-8 border-t border-zinc-100 space-y-6">
                    <h4 className="font-mono text-[10px] font-black text-zinc-950 uppercase tracking-[0.3em]">Asset Protocol</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { id: 'logo', icon: ImageIcon, label: 'Logo' },
                        { id: 'signature', icon: PenTool, label: 'Sign' },
                        { id: 'stamp', icon: Stamp, label: 'Stamp' }
                      ].map((asset) => (
                        <div key={asset.id} className="relative group p-4 bg-white border border-zinc-100 rounded-2xl hover:border-trust-green/20 transition-all">
                          <input 
                            type="file" 
                            onChange={(e) => handleAssetUpload(asset.id as any, e)}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <asset.icon className="w-4 h-4 text-zinc-400" />
                              <span className="font-display font-bold text-xs text-zinc-900">{asset.label}</span>
                            </div>
                            {(currentTemplate.assets as any)[asset.id] && <CheckCircle2 className="w-4 h-4 text-trust-green" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {/* Creator Preview (Right) */}
              <div className="lg:col-span-7 space-y-8">
                 <div className="sticky top-20">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-display font-black text-xl text-zinc-950 flex items-center gap-3">
                        <Eye className="w-5 h-5 text-zinc-400" />
                        LIVESTREAM PREVIEW
                      </h3>
                      <div className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 bg-trust-green rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,1)]" />
                         <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-[0.1em]">Encrypted Stream</span>
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-8 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)]">
                       <CertificatePreview template={currentTemplate} data={issuance} previewRef={previewRef} />
                    </div>

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-[2.5rem]">
                          <h4 className="font-display font-bold text-zinc-950 mb-4 flex items-center gap-2">
                             <Copy className="w-4 h-4 text-zinc-400" />
                             Saved Blueprints
                          </h4>
                          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {savedTemplates.length > 0 ? savedTemplates.map((t) => (
                              <div 
                                key={t._id} 
                                onClick={() => setCurrentTemplate(t)}
                                className="group p-4 bg-white border border-zinc-100 rounded-2xl hover:border-trust-green/20 hover:shadow-xl cursor-pointer transition-all flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-display font-bold text-xs text-zinc-900 group-hover:text-trust-green transition-colors">{t.name}</p>
                                  <p className="font-mono text-[8px] text-zinc-400 uppercase mt-1">ID: {t._id?.slice(-8)}</p>
                                </div>
                                <button 
                                  onClick={(e) => handleDeleteTemplate(t._id!, e)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )) : (
                              <p className="font-sans text-[10px] text-zinc-400 py-8 text-center italic">No blueprints indexed.</p>
                            )}
                          </div>
                       </div>

                       <div className="p-8 bg-trust-green/5 border border-trust-green/10 rounded-[2.5rem] flex flex-col justify-center items-center text-center">
                          <Zap className="w-10 h-10 text-trust-green mb-4 fill-trust-green/10" />
                          <h4 className="font-display font-bold text-zinc-950 mb-2">Ready for Issuance?</h4>
                          <p className="font-sans text-xs text-zinc-500 mb-6">Transition to the issuance protocol once your design is finalized.</p>
                          <button 
                            onClick={() => setActiveTab('issue')}
                            className="h-12 w-full bg-zinc-950 text-white rounded-xl font-display font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:translate-x-1 transition-all"
                          >
                            START ISSUANCE
                            <ArrowRight className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'issue' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto">
              {/* Issuance Form */}
              <div className="lg:col-span-5 space-y-8">
                 <section className="bg-white border border-zinc-100 rounded-[3rem] p-10 shadow-2xl shadow-zinc-100/50 space-y-8">
                   <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center text-trust-green">
                       <ShieldCheck className="w-6 h-6" />
                     </div>
                     <h3 className="font-display font-black text-2xl text-zinc-950 tracking-tight">ISSUANCE</h3>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Source Blueprint</label>
                        <select 
                          value={selectedTemplateId}
                          onChange={(e) => {
                            const t = savedTemplates.find(x => x._id === e.target.value);
                            if (t) {
                              setCurrentTemplate(t);
                              setSelectedTemplateId(t._id!);
                            }
                          }}
                          className="w-full h-14 px-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-display font-bold text-sm text-zinc-900"
                        >
                          <option value="">Select Protocol</option>
                          {savedTemplates.map(t => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Recipient Name</label>
                        <input 
                          type="text"
                          value={issuance.recipientName}
                          onChange={(e) => setIssuance({...issuance, recipientName: e.target.value})}
                          className="w-full h-14 px-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-display font-bold text-sm text-zinc-950 focus:outline-none focus:border-trust-green"
                          placeholder="Full Network Identity"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Major Achievement/Role</label>
                        <input 
                          type="text"
                          value={issuance.description}
                          onChange={(e) => setIssuance({...issuance, description: e.target.value})}
                          className="w-full h-14 px-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-display font-bold text-sm text-zinc-950"
                          placeholder="Master of Systems"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Issue Date</label>
                          <input 
                            type="date"
                            value={issuance.issueDate}
                            onChange={(e) => setIssuance({...issuance, issueDate: e.target.value})}
                            className="w-full h-14 px-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-display font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">Expiry Date</label>
                          <input 
                            type="date"
                            value={issuance.expiryDate}
                            onChange={(e) => setIssuance({...issuance, expiryDate: e.target.value})}
                            className="w-full h-14 px-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-display font-bold text-xs"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={handleDownloadPDF}
                        disabled={isLoading || !issuance.recipientName}
                        className="w-full h-16 bg-trust-green text-white rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-3 hover:bg-trust-green/90 transition-all shadow-xl shadow-trust-green/20 disabled:opacity-50"
                      >
                         EXECUTE & INDEX
                         <Download className="w-5 h-5 shadow-[0_4px_12px_rgba(255,255,255,0.4)]" />
                      </button>
                   </div>
                 </section>

                 <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-trust-green shadow-sm ring-6 ring-zinc-50">
                       <Zap className="w-6 h-6 fill-trust-green/20" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-zinc-950 text-sm italic">Automated Indexing</p>
                      <p className="font-sans text-[11px] text-zinc-500">Every issued signature is automatically verified and stored on the immutable ledger.</p>
                    </div>
                 </div>
              </div>

              {/* Final Preview (Right) - Off Screen Rendering Container or Visible Preview */}
              <div className="lg:col-span-7 space-y-8 flex flex-col items-center">
                 <h3 className="font-display font-black text-xl text-zinc-950 flex items-center gap-3 self-start">
                   <Eyedropper className="w-5 h-5 text-zinc-400" />
                   AUTHENTICATION VIEW
                 </h3>
                 
                 <div className="w-full flex-1 flex items-center justify-center bg-zinc-50 rounded-[4rem] border border-zinc-100 p-8 overflow-hidden">
                    <motion.div 
                       layoutId="final-preview-card"
                       className="w-full max-w-2xl transform hover:scale-[1.02] transition-transform"
                    >
                       <CertificatePreview template={currentTemplate} data={issuance} isFinal={true} previewRef={previewRef} />
                    </motion.div>
                 </div>

                 <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => setActiveTab('create')}
                      className="flex-1 h-14 border border-zinc-200 rounded-2xl font-display font-bold text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      MODIFY BLUEPRINT
                    </button>
                    <div className="flex-1 p-4 bg-zinc-950 rounded-2xl flex items-center justify-between">
                       <span className="font-mono text-[9px] font-bold text-white/40 uppercase tracking-widest">Protocol Integrity</span>
                       <span className="font-mono text-[9px] font-bold text-trust-green">LOCKED</span>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-6xl mx-auto space-y-8">
               <div className="flex items-center justify-between">
                  <h3 className="font-display font-black text-2xl text-zinc-950 tracking-tight uppercase">Issuance Log</h3>
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-zinc-400" />
                    <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">Archive Node Sync</span>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Reuse Hash Registry Item design but filtered for issued certs if possible or just general list */}
                  <div className="lg:col-span-3 bg-zinc-50 border border-dashed border-zinc-200 rounded-[3rem] p-20 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <FileDown className="w-6 h-6 text-zinc-200" />
                    </div>
                    <h4 className="font-display font-bold text-xl text-zinc-900 mb-2">Relay Connection Pending</h4>
                    <p className="font-sans text-sm text-zinc-500 max-w-sm mx-auto mb-8">Detailed issuance history is currently migrating to the primary ledger. View general hash registry in Archive.</p>
                    <button 
                      onClick={() => window.location.href = '/archive'}
                    className="px-8 py-3 bg-zinc-950 text-white rounded-xl font-display font-bold text-xs uppercase tracking-widest hover:translate-y-[-2px] transition-all flex items-center gap-2 mx-auto">
                      ACCESS MAIN LEDGER
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Support Icon
function Eyedropper(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m2 22 7.5-7.5" />
      <path d="M21 7c0-1.1-.9-2-2-2a2 2 0 0 0-2-2c-1.1 0-2 .9-2 2a2 2 0 0 0-2 2c0 1.1.9 2 2 2a2 2 0 0 0 2 2c1.1 0 2-.9 2-2a2 2 0 0 0 2-2Z" />
      <path d="M8 8l4 4" />
    </svg>
  );
}
