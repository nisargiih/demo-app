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
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minus,
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { useNotification } from '@/hooks/use-notification';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Rnd } from 'react-rnd';

// --- Types & Interfaces ---

interface DocElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  content: string;
  style: {
    fontSize?: number;
    fontWeight?: string;
    fontFamily?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    opacity?: number;
    borderRadius?: string;
    borderWidth?: string;
    borderColor?: string;
    zIndex?: number;
    letterSpacing?: string;
    lineHeight?: string;
    italic?: boolean;
    underline?: boolean;
  };
  placeholder?: string;
}

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
  pageSize?: 'a4_landscape' | 'a4_portrait' | 'square' | 'us_letter';
  assets: Asset;
  elements?: DocElement[];
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

const PAGE_SIZES = {
  a4_landscape: { width: 1000, height: 707, label: 'A4 Landscape' },
  a4_portrait: { width: 707, height: 1000, label: 'A4 Portrait' },
  square: { width: 1000, height: 1000, label: 'Square (1:1)' },
  us_letter: { width: 1000, height: 773, label: 'US Letter' },
};

const PRESETS: Partial<TemplateConfig>[] = [
  {
    name: 'Corporate Elite',
    title: 'CERTIFICATE OF ACHIEVEMENT',
    companyName: 'GLOBAL SOLUTIONS CORP',
    bodyText: 'This is to certify that {{recipient_name}} has successfully completed the Advanced Management Protocol.',
    footerText: 'OFFICIAL CERTIFICATION DIVISION',
    primaryColor: '#0f172a',
    fontFamily: 'serif',
    layout: 'modern',
    pageSize: 'a4_landscape',
    elements: [
      { id: 'border-left', type: 'shape', x: 0, y: 0, width: 40, height: 707, content: '#0f172a', style: { zIndex: 1 } },
      { id: 'title-el', type: 'text', x: 100, y: 150, width: 800, height: 60, content: '{{certificate_title}}', style: { fontSize: 42, fontWeight: '900', color: '#0f172a', textAlign: 'center' } },
      { id: 'name-el', type: 'text', x: 100, y: 350, width: 800, height: 80, content: '{{recipient_name}}', style: { fontSize: 64, fontWeight: '900', color: '#0f172a', textAlign: 'center' } }
    ]
  },
  {
    name: 'Modern Mint',
    title: 'DEVELOPER ACCREDITATION',
    companyName: 'CODEFORGE SYSTEMS',
    bodyText: 'Validating that {{recipient_name}} has demonstrated mastery in Full-Stack Engineering.',
    footerText: 'VERIFIED ON BLOCKCHAIN',
    primaryColor: '#10b981',
    fontFamily: 'mono',
    layout: 'minimal',
    pageSize: 'a4_landscape',
    elements: [
      { id: 'bg-blob', type: 'shape', x: 600, y: -200, width: 600, height: 600, content: '#10b981', style: { borderRadius: '50%', opacity: 0.1, zIndex: 0 } },
      { id: 'title-el', type: 'text', x: 80, y: 100, width: 600, height: 60, content: '{{certificate_title}}', style: { fontSize: 36, fontWeight: '900', color: '#064e3b', textAlign: 'left' } },
      { id: 'name-el', type: 'text', x: 80, y: 250, width: 840, height: 100, content: '{{recipient_name}}', style: { fontSize: 72, fontWeight: '900', color: '#10b981', textAlign: 'left' } }
    ]
  },
  {
    name: 'Executive Portrait',
    title: 'OFFICIAL DIPLOMA',
    companyName: 'ACADEMY OF EXCELLENCE',
    bodyText: 'This diploma is awarded to {{recipient_name}} for outstanding performance in the field of Digital Arts.',
    footerText: 'BOARD OF DIRECTORS',
    primaryColor: '#4338ca',
    fontFamily: 'serif',
    layout: 'classic',
    pageSize: 'a4_portrait',
    elements: [
      { id: 'top-bar', type: 'shape', x: 0, y: 0, width: 707, height: 20, content: '#4338ca', style: { zIndex: 1 } },
      { id: 'title-el', type: 'text', x: 50, y: 150, width: 607, height: 60, content: '{{certificate_title}}', style: { fontSize: 40, fontWeight: '900', color: '#4338ca', textAlign: 'center' } },
      { id: 'name-el', type: 'text', x: 50, y: 450, width: 607, height: 100, content: '{{recipient_name}}', style: { fontSize: 48, fontWeight: '700', color: '#1e1b4b', textAlign: 'center' } }
    ]
  }
];

const DEFAULT_TEMPLATE: TemplateConfig = {
  name: 'Elite Recognition Protocol',
  title: 'CERTIFICATE OF SUPREME ACHIEVEMENT',
  companyName: 'GLOBAL INNOVATION NODE',
  companyDetails: 'Encrypted Distributed Network | Sector 7-G',
  bodyText: 'This is to certify that {{recipient_name}} has reached the Zenith of proficiency in {{description}}, demonstrating excellence across all core evaluation protocols.',
  footerText: 'GENUINE DIGITAL ASSET CERTIFICATE',
  primaryColor: '#10b981',
  accentColor: '#09090b',
  fontFamily: 'serif',
  alignment: 'center',
  layout: 'modern',
  pageSize: 'a4_landscape',
  assets: {
    customImages: []
  },
  elements: [
    {
      id: 'bg-acc-1',
      type: 'shape',
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      content: '#10b981',
      style: { opacity: 0.05, borderRadius: '50%', zIndex: 0 }
    },
    {
      id: 'header-title',
      type: 'text',
      x: 100,
      y: 180,
      width: 800,
      height: 70,
      content: '{{certificate_title}}',
      style: { fontSize: 42, fontWeight: '900', color: '#09090b', textAlign: 'center', letterSpacing: '0.1em' }
    },
    {
      id: 'body-pre',
      type: 'text',
      x: 100,
      y: 280,
      width: 800,
      height: 40,
      content: 'This document serves as formal recognition for',
      style: { fontSize: 18, color: '#71717a', textAlign: 'center', italic: true }
    },
    {
      id: 'recipient-name',
      type: 'text',
      x: 100,
      y: 340,
      width: 800,
      height: 100,
      content: '{{recipient_name}}',
      style: { fontSize: 72, fontWeight: '900', color: '#10b981', textAlign: 'center' }
    },
    {
      id: 'body-main',
      type: 'text',
      x: 200,
      y: 460,
      width: 600,
      height: 100,
      content: '{{body_text}}',
      style: { fontSize: 16, color: '#3f3f46', textAlign: 'center', lineHeight: '1.6' }
    }
  ]
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
  previewRef,
  editing = false,
  onElementUpdate,
  selectedElementId,
  onElementSelect,
  scale
}: { 
  template: TemplateConfig, 
  data: IssuanceData, 
  isFinal?: boolean,
  previewRef?: React.RefObject<HTMLDivElement | null>,
  editing?: boolean,
  onElementUpdate?: (elements: DocElement[]) => void,
  selectedElementId?: string | null,
  onElementSelect?: (id: string | null) => void,
  scale?: number
}) => {
  const alignClass = 
    template.alignment === 'center' ? 'text-center items-center' : 
    template.alignment === 'right' ? 'text-right items-end' : 'text-left items-start';

  const fontClass = 
    template.fontFamily === 'serif' ? 'font-serif' : 
    template.fontFamily === 'mono' ? 'font-mono' : 'font-sans';

  const handleDragStop = (id: string, d: { x: number; y: number }) => {
    if (!onElementUpdate || !template.elements) return;
    const newElements = template.elements.map(el => 
      el.id === id ? { ...el, x: d.x, y: d.y } : el
    );
    onElementUpdate(newElements);
  };

  const handleResizeStop = (id: string, ref: any, position: any) => {
    if (!onElementUpdate || !template.elements) return;
    const newElements = template.elements.map(el => 
      el.id === id ? { ...el, width: ref.offsetWidth, height: ref.offsetHeight, ...position } : el
    );
    onElementUpdate(newElements);
  };

  // The canvas should always think it is internal units wide for pixel-perfect positioning
  const dims = template.pageSize ? PAGE_SIZES[template.pageSize] : PAGE_SIZES.a4_landscape;
  const BASE_WIDTH = dims.width;
  const BASE_HEIGHT = dims.height;
  const actualScale = scale || 1;

  return (
    <div 
      className={`relative shrink-0 ${editing ? 'shadow-2xl' : ''}`}
      style={{ 
        width: `${BASE_WIDTH * actualScale}px`, 
        height: `${BASE_HEIGHT * actualScale}px`,
        transition: 'width 0.2s ease-out, height 0.2s ease-out'
      }}
    >
      <div 
        ref={isFinal ? previewRef : null}
        id={isFinal ? "final-canvas" : "certificate-canvas"}
        className={`bg-white relative border-zinc-200 shrink-0 overflow-hidden ${fontClass}`}
        style={{ 
          width: `${BASE_WIDTH}px`, 
          height: `${BASE_HEIGHT}px`,
          padding: '80px', 
          border: editing ? `16px solid ${template.primaryColor}20` : 'none',
          transform: `scale(${actualScale})`,
          transformOrigin: 'top left',
        }}
        onClick={() => onElementSelect?.(null)}
      >
      {/* Decorative Border */}
      <div className="absolute inset-4 border border-zinc-100 pointer-events-none" />
      <div className="absolute inset-8 border-4 border-zinc-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-50/50 -translate-y-1/2 translate-x-1/2 rotate-45 pointer-events-none" />

      {/* Render Custom Elements */}
      {template.elements?.map((el) => {
        const content = replacePlaceholders(el.content, data, template);
        const isSelected = selectedElementId === el.id;

        if (editing) {
          return (
            <Rnd
              key={el.id}
              size={{ width: el.width, height: el.height }}
              position={{ x: el.x, y: el.y }}
              onDragStop={(e: any, d: any) => handleDragStop(el.id, d)}
              onResizeStop={(e: any, dir: any, ref: any, delta: any, pos: any) => handleResizeStop(el.id, ref, pos)}
              bounds="parent"
              onClick={(e: any) => {
                e.stopPropagation();
                onElementSelect?.(el.id);
              }}
              className={`flex items-center justify-center border-2 transition-colors ${isSelected ? 'border-trust-green ring-4 ring-trust-green/10' : 'border-transparent hover:border-zinc-200'}`}
            >
              <div 
                className="w-full h-full overflow-hidden"
                style={{
                  ...el.style,
                  fontSize: typeof el.style.fontSize === 'number' ? `${el.style.fontSize}px` : el.style.fontSize,
                  textDecoration: el.style.underline ? 'underline' : 'none',
                  fontStyle: el.style.italic ? 'italic' : 'normal',
                  letterSpacing: el.style.letterSpacing,
                  lineHeight: el.style.lineHeight,
                  opacity: el.style.opacity,
                }}
              >
                {el.type === 'text' && content}
                {el.type === 'image' && <img src={el.content} className="w-full h-full object-contain pointer-events-none" alt="" />}
                {el.type === 'shape' && (
                  <div 
                    className="w-full h-full" 
                    style={{ 
                      backgroundColor: el.style.color,
                      borderRadius: el.style.borderRadius,
                      border: `${el.style.borderWidth || '0px'} solid ${el.style.borderColor || 'transparent'}`,
                      opacity: el.style.opacity,
                    }} 
                  />
                )}
              </div>
            </Rnd>
          );
        }

        return (
          <div
            key={el.id}
            className="absolute overflow-hidden"
            style={{
              left: `${el.x}px`,
              top: `${el.y}px`,
              width: `${el.width}px`,
              height: `${el.height}px`,
              zIndex: el.style.zIndex,
              ...el.style,
              fontSize: typeof el.style.fontSize === 'number' ? `${el.style.fontSize}px` : el.style.fontSize,
              textDecoration: el.style.underline ? 'underline' : 'none',
              fontStyle: el.style.italic ? 'italic' : 'normal',
              letterSpacing: el.style.letterSpacing,
              lineHeight: el.style.lineHeight,
              opacity: el.style.opacity,
            }}
          >
            {el.type === 'text' && content}
            {el.type === 'image' && <img src={el.content} className="w-full h-full object-contain" alt="" />}
            {el.type === 'shape' && (
              <div 
                className="w-full h-full" 
                style={{ 
                  backgroundColor: el.style.color,
                  borderRadius: el.style.borderRadius,
                  border: `${el.style.borderWidth || '0px'} solid ${el.style.borderColor || 'transparent'}`,
                  opacity: el.style.opacity,
                }} 
              />
            )}
          </div>
        );
      })}

      {/* Default Layout (only if no elements or explicitly requested to show) */}
      {(!template.elements || template.elements.length === 0) && (
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
      )}
    </div>
  </div>
);
};

// --- Main Page Component ---

export default function GeneratePage() {
  const { notify, confirm } = useNotification();
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
  const previewRef = useRef<HTMLDivElement>(null);

  // State: Advanced Editor
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const selectedElement = currentTemplate.elements?.find(el => el.id === selectedElementId);
  const [previewScale, setPreviewScale] = useState(0.6);
  const [isAutoFit, setIsAutoFit] = useState(true);

  const updateScale = useCallback(() => {
    if (!isAutoFit) return;
    const container = document.getElementById('canvas-workbench');
    const dims = currentTemplate.pageSize ? PAGE_SIZES[currentTemplate.pageSize] : PAGE_SIZES.a4_landscape;
    
    if (container) {
      const padding = 80;
      const availableWidth = container.offsetWidth - padding;
      const availableHeight = container.offsetHeight - padding;
      
      const scaleX = availableWidth / dims.width;
      const scaleY = availableHeight / dims.height;
      
      setPreviewScale(Math.min(scaleX, scaleY, 1)); // Max scale 1 for auto-fit
    }
  }, [isAutoFit, currentTemplate.pageSize]);

  useEffect(() => {
    updateScale();
    const timer = setTimeout(updateScale, 100); // Small delay to ensure layout is ready
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      clearTimeout(timer);
    };
  }, [updateScale, activeTab]); // Re-calculate on tab change too

  const resetScale = () => {
    setIsAutoFit(true);
    setTimeout(updateScale, 0);
  };

  // --- Fetching & Persistence ---

  const addElement = (type: 'text' | 'image' | 'shape') => {
    const newEl: DocElement = {
      id: `el-${Math.random().toString(36).substring(2, 9)}`,
      type,
      x: 300,
      y: 300,
      width: type === 'text' ? 400 : 100,
      height: type === 'text' ? 50 : 100,
      content: type === 'text' ? 'Double Click to Edit Text' : type === 'image' ? 'https://picsum.photos/200' : '#10b981',
      style: {
        fontSize: 24,
        color: '#000000',
        textAlign: 'center',
        zIndex: (currentTemplate.elements?.length || 0) + 1,
        fontFamily: 'sans'
      }
    };
    setCurrentTemplate(prev => ({
      ...prev,
      elements: [...(prev.elements || []), newEl]
    }));
    setSelectedElementId(newEl.id);
  };

  const removeElement = (id: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      elements: prev.elements?.filter(el => el.id !== id)
    }));
    setSelectedElementId(null);
  };

  const updateElement = (id: string, updates: Partial<DocElement>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      elements: prev.elements?.map(el => el.id === id ? { ...el, ...updates } : el)
    }));
  };

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

  const handleNewTemplate = async () => {
    const ok = await confirm({
      title: 'Initialize New Blueprint',
      message: 'Are you sure you want to initialize a new blueprint protocol? Current unsaved state will be purged.',
      confirmText: 'Purge & Start',
      cancelText: 'Resume Session'
    });

    if (ok) {
      setCurrentTemplate({ ...DEFAULT_TEMPLATE, _id: undefined, pageSize: 'a4_landscape' });
      setSelectedElementId(null);
      notify('New blueprint environment ready.', 'success');
    }
  };

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
    const ok = await confirm({
      title: 'Purge Template',
      message: 'Permanent deletion requested. Are you sure you want to purge this template archive?',
      confirmText: 'Purge Archive',
      cancelText: 'Retain'
    });

    if (!ok) return;
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify('Template purged.', 'success');
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

  const addAssetToCanvas = (type: keyof Asset) => {
    const assetUrl = (currentTemplate.assets as any)[type];
    if (!assetUrl) {
      notify(`Please upload a ${type} first.`, 'error');
      return;
    }
    
    const newEl: DocElement = {
      id: `el-${type}-${Math.random().toString(36).substring(2, 5)}`,
      type: 'image',
      x: 400,
      y: 400,
      width: type === 'logo' ? 120 : 150,
      height: type === 'logo' ? 120 : 80,
      content: assetUrl,
      style: {
        zIndex: (currentTemplate.elements?.length || 0) + 1,
        opacity: 1
      }
    };
    setCurrentTemplate(prev => ({
      ...prev,
      elements: [...(prev.elements || []), newEl]
    }));
    setSelectedElementId(newEl.id);
  };

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
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[calc(100vh-16rem)] min-h-[700px]">
              {/* 1. Global Controls (Left) */}
              <div className="xl:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <section className="bg-zinc-50 border border-zinc-100 rounded-[2rem] p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-black text-sm text-zinc-900 flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-trust-green" />
                      BLUEPRINT
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleNewTemplate}
                        className="h-8 w-8 bg-zinc-100 text-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-200 transition-colors"
                        title="New Blueprint"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleSaveTemplate}
                        disabled={isLoading}
                        className="h-8 px-4 bg-zinc-950 text-white rounded-lg font-display font-extrabold text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {isLoading ? 'SYNCING...' : 'SAVE'}
                        <Save className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">Identity</label>
                       <input 
                         type="text"
                         value={currentTemplate.name}
                         onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                         className="w-full h-11 px-4 bg-white border border-zinc-100 rounded-xl font-display font-bold text-xs focus:ring-1 focus:ring-trust-green focus:outline-none"
                         placeholder="Template Name"
                       />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">Major Header</label>
                      <input 
                        type="text"
                        value={currentTemplate.title}
                        onChange={(e) => setCurrentTemplate({...currentTemplate, title: e.target.value})}
                        className="w-full h-11 px-4 bg-white border border-zinc-100 rounded-xl font-display font-bold text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">Organization</label>
                      <input 
                        type="text"
                        value={currentTemplate.companyName}
                        onChange={(e) => setCurrentTemplate({...currentTemplate, companyName: e.target.value})}
                        className="w-full h-11 px-4 bg-white border border-zinc-100 rounded-xl font-display font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-100 space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">Page Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(PAGE_SIZES).map(([key, size]) => (
                          <button
                            key={key}
                            onClick={() => setCurrentTemplate({...currentTemplate, pageSize: key as any})}
                            className={`p-2 rounded-lg border font-display font-bold text-[9px] uppercase tracking-tighter transition-all ${
                              currentTemplate.pageSize === key ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200'
                            }`}
                          >
                            {size.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Brand Ink</label>
                       <div className="flex items-center gap-2">
                         <input 
                           type="color" 
                           value={currentTemplate.primaryColor}
                           onChange={(e) => setCurrentTemplate({...currentTemplate, primaryColor: e.target.value})}
                           className="w-8 h-8 rounded-lg cursor-pointer border-none p-0 overflow-hidden bg-transparent"
                         />
                         <span className="font-mono text-[9px] font-bold text-zinc-900">{currentTemplate.primaryColor}</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Typography</label>
                      <select 
                        value={currentTemplate.fontFamily}
                        onChange={(e) => setCurrentTemplate({...currentTemplate, fontFamily: e.target.value as any})}
                        className="w-full h-8 px-2 bg-white border border-zinc-100 rounded-lg font-display font-bold text-[10px]"
                      >
                        <option value="serif">Serif</option>
                        <option value="sans">Sans</option>
                        <option value="mono">Mono</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

                <section className="bg-zinc-50 border border-zinc-100 rounded-[2rem] p-6">
                  <h4 className="font-mono text-[9px] font-black text-zinc-950 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5" />
                    ASSET BANK
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'logo', icon: ImageIcon, label: 'Logo' },
                      { id: 'signature', icon: PenTool, label: 'Sign' },
                      { id: 'stamp', icon: Stamp, label: 'Stamp' }
                    ].map((asset) => (
                      <div key={asset.id} className="relative group p-3 bg-white border border-zinc-100 rounded-xl hover:border-trust-green/20 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <asset.icon className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-display font-bold text-[11px] text-zinc-900">{asset.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(currentTemplate.assets as any)[asset.id] ? (
                            <button 
                              onClick={() => addAssetToCanvas(asset.id as any)}
                              className="p-1 px-2.5 bg-zinc-950 text-white rounded-md hover:bg-trust-green transition-colors font-mono text-[9px] font-bold"
                            >
                              ADD
                            </button>
                          ) : (
                            <label className="p-1 px-2.5 bg-zinc-100 text-zinc-400 rounded-md hover:bg-zinc-200 cursor-pointer font-mono text-[9px] font-bold">
                              UP
                              <input type="file" onChange={(e) => handleAssetUpload(asset.id as any, e)} className="hidden" />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-zinc-50 border border-zinc-100 rounded-[2rem] p-6">
                  <h4 className="font-mono text-[9px] font-black text-zinc-950 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-trust-green" />
                    PRESETS
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Apply Preset',
                            message: 'This will overwrite your current canvas layers with the selected preset. Proceed?',
                            confirmText: 'Apply Layer Preset',
                            cancelText: 'Cancel'
                          });

                          if(ok) {
                            setCurrentTemplate({
                              ...currentTemplate,
                              ...preset,
                              _id: undefined // Don't preserve preset ID
                            } as TemplateConfig);
                            notify('Preset configuration applied.', 'success');
                          }
                        }}
                        className="w-full p-3 bg-white border border-zinc-100 rounded-xl hover:border-trust-green/20 transition-all flex items-center justify-between group"
                      >
                        <span className="font-display font-bold text-[10px] text-zinc-900 group-hover:text-trust-green">{preset.name}</span>
                        <Copy className="w-3 h-3 text-zinc-300" />
                      </button>
                    ))}
                  </div>
                </section>

                <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-[2rem]">
                  <h4 className="font-display font-bold text-xs text-zinc-950 mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-zinc-400" />
                    ARCHIVE
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {savedTemplates.map((t) => (
                      <div 
                        key={t._id} 
                        onClick={() => setCurrentTemplate(t)}
                        className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${currentTemplate._id === t._id ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-100'}`}
                      >
                        <span className="font-display font-bold text-[10px] truncate pr-2">{t.name}</span>
                        <Trash2 
                          className="w-3 h-3 text-zinc-400 hover:text-red-500" 
                          onClick={(e) => handleDeleteTemplate(t._id!, e)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Main Workbench (Center) */}
              <div className="xl:col-span-6 flex flex-col gap-4">
                {/* Workbench Toolbar */}
                <div className="flex items-center justify-between px-6 h-14 bg-zinc-900 text-white rounded-2xl shadow-xl">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-trust-green rounded-full animate-pulse" />
                      <span className="font-mono text-[10px] font-bold text-white/50 tracking-widest uppercase">Live Workbench</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                      <button 
                        onClick={() => addElement('text')} 
                        className="p-1.5 hover:bg-white/10 text-white transition-colors rounded-md"
                        title="Add Text"
                      >
                        <Type className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => addElement('image')} 
                        className="p-1.5 hover:bg-white/10 text-white transition-colors rounded-md"
                        title="Add Image"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => addElement('shape')} 
                        className="p-1.5 hover:bg-white/10 text-white transition-colors rounded-md"
                        title="Add Shape"
                      >
                        <Layout className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
                      <button 
                        onClick={() => { setIsAutoFit(false); setPreviewScale(s => Math.max(0.1, s - 0.1)); }}
                        className="p-1 hover:text-trust-green transition-colors"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-[10px] font-bold w-12 text-center text-white/70">
                        {Math.round(previewScale * 100)}%
                      </span>
                      <button 
                        onClick={() => { setIsAutoFit(false); setPreviewScale(s => Math.min(2, s + 0.1)); }}
                        className="p-1 hover:text-trust-green transition-colors"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-3 bg-white/10 mx-1" />
                      <button 
                        onClick={resetScale}
                        className={`p-1 hover:text-trust-green transition-colors ${isAutoFit ? 'text-trust-green' : 'text-white/40'}`}
                        title="Fit to Screen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Canvas Container */}
                <div 
                  id="canvas-workbench" 
                  className="flex-1 bg-zinc-950 rounded-[3rem] shadow-inner relative overflow-hidden group"
                >
                  {/* Checkerboard Backdrop */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                  
                  <div className="absolute inset-0 flex items-center justify-center overflow-auto custom-scrollbar p-12">
                    <CertificatePreview 
                      template={currentTemplate} 
                      data={issuance} 
                      previewRef={previewRef}
                      editing={true}
                      onElementUpdate={(els) => setCurrentTemplate({...currentTemplate, elements: els})}
                      selectedElementId={selectedElementId}
                      onElementSelect={setSelectedElementId}
                      scale={previewScale}
                    />
                  </div>

                  {/* Corner Label */}
                  <div className="absolute bottom-6 right-8 pointer-events-none">
                     <span className="font-mono text-[8px] font-bold text-white/20 tracking-[0.4em] uppercase">Vector Core v2.0 | Encrypted Canvas</span>
                  </div>
                </div>
              </div>

              {/* 3. Object Parameters (Right) */}
              <div className="xl:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {selectedElement ? (
                  <section className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-xl shadow-zinc-200/50 space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                      <h4 className="font-display font-black text-xs text-zinc-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-trust-green" />
                        PROPERTIES
                      </h4>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateElement(selectedElement.id, { style: { ...selectedElement.style, zIndex: (selectedElement.style.zIndex || 1) + 1 }})} className="p-1.5 hover:bg-zinc-100 rounded">
                           <Plus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-[9px] font-bold text-zinc-400">LAYER {selectedElement.style.zIndex}</span>
                        <button onClick={() => updateElement(selectedElement.id, { style: { ...selectedElement.style, zIndex: Math.max(0, (selectedElement.style.zIndex || 1) - 1) }})} className="p-1.5 hover:bg-zinc-100 rounded">
                           <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">Raw Content</label>
                        <textarea 
                          value={selectedElement.content}
                          onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                          className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-sans text-[11px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-trust-green h-24 resize-none"
                        />
                      </div>

                      {selectedElement.type === 'text' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Size</label>
                            <input 
                              type="number"
                              value={selectedElement.style.fontSize}
                              onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, fontSize: parseInt(e.target.value) }})}
                              className="w-full h-9 px-3 bg-zinc-50 border border-zinc-100 rounded-lg font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Color</label>
                            <input 
                              type="color"
                              value={selectedElement.style.color}
                              onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, color: e.target.value }})}
                              className="w-full h-9 p-1 bg-zinc-50 border border-zinc-100 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Opacity</label>
                          <input 
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={selectedElement.style.opacity ?? 1}
                            onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, opacity: parseFloat(e.target.value) }})}
                            className="w-full h-9 px-3 bg-zinc-50 border border-zinc-100 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-mono text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Radius</label>
                          <input 
                            type="text"
                            placeholder="0px"
                            value={selectedElement.style.borderRadius}
                            onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, borderRadius: e.target.value }})}
                            className="w-full h-9 px-3 bg-zinc-50 border border-zinc-100 rounded-lg font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-2">
                       <button 
                        onClick={() => updateElement(selectedElement.id, { x: 500 - (typeof selectedElement.width === 'number' ? selectedElement.width / 2 : 0) })}
                        className="w-full h-10 bg-zinc-950 text-white rounded-xl font-display font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all"
                      >
                        Center Component
                      </button>
                      <button 
                        onClick={() => removeElement(selectedElement.id)}
                        className="w-full h-10 border border-red-100 text-red-500 rounded-xl font-display font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Purge Object
                      </button>
                    </div>
                  </section>
                ) : (
                  <div className="h-full bg-zinc-50 border border-zinc-100 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white rounded-[2rem] flex items-center justify-center text-zinc-200 mb-6 shadow-sm ring-8 ring-zinc-50">
                       <Layers className="w-8 h-8" />
                    </div>
                    <h5 className="font-display font-bold text-zinc-900 mb-2 uppercase tracking-tight text-sm">Object Registry</h5>
                    <p className="font-sans text-[10px] text-zinc-400 leading-relaxed uppercase tracking-widest">Select an element on the canvas to override parameters.</p>
                  </div>
                )}

                {/* Layer Navigator */}
                <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] space-y-4">
                  <h4 className="font-mono text-[9px] font-black text-zinc-950 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Layout className="w-3.5 h-3.5" />
                    STACK HIERARCHY
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {[...(currentTemplate.elements || [])].sort((a, b) => (b.style.zIndex || 0) - (a.style.zIndex || 0)).map(el => (
                       <div 
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`p-2 px-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${selectedElementId === el.id ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-100 hover:border-zinc-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          {el.type === 'text' && <Type className="w-3 h-3 text-zinc-400" />}
                          {el.type === 'image' && <ImageIcon className="w-3 h-3 text-zinc-400" />}
                          {el.type === 'shape' && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: el.style.color }} />}
                          <span className="font-mono text-[9px] font-bold uppercase truncate max-w-[80px]">
                            {el.type === 'text' ? el.content : el.type.toUpperCase()}
                          </span>
                        </div>
                        <span className="font-mono text-[8px] text-zinc-400">Z-{el.style.zIndex || 0}</span>
                      </div>
                    ))}
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
                    <Palette className="w-5 h-5 text-zinc-400" />
                   AUTHENTICATION VIEW
                 </h3>
                 
                <div className="w-full flex-1 min-h-[400px] flex items-center justify-center bg-zinc-50 rounded-[4rem] border border-zinc-100 p-12 overflow-auto custom-scrollbar text-zinc-950">
                    <motion.div 
                       layoutId="final-preview-card"
                       className="shrink-0"
                    >
                       <CertificatePreview 
                         template={currentTemplate} 
                         data={issuance} 
                         isFinal={true} 
                         previewRef={previewRef} 
                         scale={0.5}
                       />
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


