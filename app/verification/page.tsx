'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  User, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Fingerprint,
  HardDrive,
  FileText,
  Clock,
  Briefcase,
  Network,
  Upload,
  Building2,
  Lock,
  ChevronRight,
  FileDown,
  Trash2,
  X
} from 'lucide-react';
import { Sidebar } from '@/components/navbar';
import { BackgroundAnimation } from '@/components/background-animation';
import { SecurityService } from '@/lib/security-service';
import { useNotification } from '@/hooks/use-notification';
import { AnimatePresence } from 'motion/react';

export default function VerificationPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'individual' | 'company'>('individual');
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);

  useEffect(() => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) {
      router.push('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const body = await res.json();
          const data = SecurityService.processFromTransit(body);
          setUser(data);
          setActiveTab(data.entityType?.toLowerCase() === 'company' ? 'company' : 'individual');
          setUploadedDocs(data.verificationDocs || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        setIsAuthLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      notify('Only PDF and Image files are supported.', 'error');
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      notify('File size must be less than 5MB.', 'error');
      return;
    }

    setUploadingFile(docType);
    try {
      // 1. Get Presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type
        })
      });

      if (!presignedRes.ok) throw new Error('Failed to get upload authorization');
      const { url, fileKey } = await presignedRes.json();

      // 2. Upload to S3
      const uploadRes = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadRes.ok) throw new Error('Upload to storage failed');

      // 3. Update Local State
      const newDoc = {
        id: Date.now().toString(),
        type: docType,
        name: file.name,
        key: fileKey,
        status: 'pending',
        timestamp: new Date().toISOString()
      };
      
      const newDocs = [...uploadedDocs, newDoc];
      setUploadedDocs(newDocs);
      notify(`${docType} uploaded successfully.`, 'success');
    } catch (err) {
      console.error(err);
      notify('Upload failed. Please try again.', 'error');
    } finally {
      setUploadingFile(null);
    }
  };

  const removeDoc = (id: string) => {
    setUploadedDocs(uploadedDocs.filter(d => d.id !== id));
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedDocs.length === 0) {
      notify('Please upload at least one document for verification.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = { 
        ...user, 
        verificationStatus: 'pending',
        verificationDocs: uploadedDocs,
        entityType: activeTab === 'company' ? 'Company' : 'Individual'
      };
      
      const payload = SecurityService.prepareForTransit(updatedUser);
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setUser(updatedUser);
        notify('Documents submitted for review. Review period: 2-5 business days.', 'success');
      } else {
        notify('Submission failed. Integrity check error.', 'error');
      }
    } catch (err) {
      notify('Network error during submission.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isVerified = user?.verificationStatus === 'verified';
  const isPending = user?.verificationStatus === 'pending';

  const docTypes = {
    individual: [
      { id: 'PAN', label: 'PAN Card', desc: 'Permanent Account Number' },
      { id: 'AADHAAR', label: 'Aadhaar Card', desc: 'UIDAI Identification' },
      { id: 'PASSPORT', label: 'Passport', desc: 'International Travel Document' }
    ],
    company: [
      { id: 'COI', label: 'Inc. Certificate', desc: 'Certificate of Incorporation' },
      { id: 'GST', label: 'GST Certificate', desc: 'Tax Registration' },
      { id: 'PAN_CORP', label: 'Corporate PAN', desc: 'Business Tax ID' }
    ]
  };

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

  return (
    <main className="relative min-h-screen w-full bg-white selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6">
      <BackgroundAnimation />
      <Sidebar />
 
      <div className="relative z-10 w-full max-w-5xl mx-auto py-8 sm:py-12 lg:py-16">
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-trust-green/10 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="text-trust-green w-6 h-6" />
            </div>
            <h1 className="font-display text-4xl font-bold text-zinc-900">Verification Terminal</h1>
          </motion.div>
          <p className="font-sans text-sm text-zinc-500">Secure your identity by uploading official notarization documents to the vault.</p>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
            <div className="lg:col-span-1 h-[200px] bg-zinc-50 rounded-2xl" />
            <div className="lg:col-span-3 h-[500px] bg-zinc-50 rounded-[2.5rem]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Nav */}
            <div className="lg:col-span-1 space-y-2">
              <button
                onClick={() => setActiveTab('individual')}
                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all text-left ${
                  activeTab === 'individual' 
                    ? 'bg-zinc-950 text-white shadow-xl shadow-zinc-900/10' 
                    : 'text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                <User className={`w-4 h-4 ${activeTab === 'individual' ? 'text-trust-green' : 'text-zinc-400'}`} />
                <span className="font-display font-bold text-[10px] uppercase tracking-widest">Individual</span>
              </button>
              <button
                onClick={() => setActiveTab('company')}
                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all text-left ${
                  activeTab === 'company' 
                    ? 'bg-zinc-950 text-white shadow-xl shadow-zinc-900/10' 
                    : 'text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                <Building2 className={`w-4 h-4 ${activeTab === 'company' ? 'text-trust-green' : 'text-zinc-400'}`} />
                <span className="font-display font-bold text-[10px] uppercase tracking-widest">Company</span>
              </button>

              <div className="pt-8 space-y-4">
                <div className="p-5 bg-zinc-950 rounded-2xl text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-trust-green/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-trust-green/20 transition-all" />
                  <Lock className="w-5 h-5 text-trust-green mb-3" />
                  <h4 className="font-display font-bold text-xs mb-1">Encrypted Vault</h4>
                  <p className="font-sans text-[10px] text-zinc-500 leading-relaxed">All files are stored in an AES-256 encrypted S3 bucket.</p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {isPending || isVerified ? (
                  <motion.div
                    key="status"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-[2.5rem] p-12 text-center border border-zinc-100 shadow-xl"
                  >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 relative ${
                      isVerified ? 'bg-trust-green/10' : 'bg-amber-50'
                    }`}>
                      {isVerified ? (
                        <CheckCircle2 className="w-10 h-10 text-trust-green" />
                      ) : (
                        <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
                      )}
                    </div>
                    <h2 className="font-display text-2xl font-bold text-zinc-950 mb-4">
                      {isVerified ? 'Verification Complete' : 'Verification Pending'}
                    </h2>
                    <p className="font-sans text-zinc-500 mb-10 max-w-sm mx-auto leading-relaxed text-sm">
                      {isVerified 
                        ? 'Your identity and documents have been cryptographically notarized on our network.' 
                        : 'Your documents are currently under review. This protocol typically resolves in 2-5 business days.'}
                    </p>
                    
                    <div className="space-y-3 max-w-md mx-auto">
                      {uploadedDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-zinc-300" />
                            <div className="text-left">
                              <p className="font-display font-bold text-[10px] text-zinc-900 uppercase">{doc.type}</p>
                              <p className="font-sans text-[10px] text-zinc-400 truncate w-32">{doc.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] text-trust-green font-bold uppercase">SECURE</span>
                            <CheckCircle2 className="w-3 h-3 text-trust-green" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {!isVerified && (
                      <button 
                         onClick={() => router.push('/dashboard')}
                         className="mt-12 h-14 px-10 bg-zinc-950 text-white rounded-2xl font-display font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20"
                      >
                         Return to Dashboard
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-8"
                  >
                    {/* Document Vault Section */}
                    <section className="glass rounded-[2.5rem] p-8 border border-zinc-100 shadow-xl shadow-zinc-900/[0.02]">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="font-display font-bold text-xl text-zinc-900 flex items-center gap-2">
                            <HardDrive className="w-5 h-5 text-trust-green" />
                            Document Selection
                          </h3>
                          <p className="font-sans text-xs text-zinc-400 mt-1">Select and upload required identity tokens.</p>
                        </div>
                        <div className="px-3 py-1 bg-zinc-50 rounded-full border border-zinc-100">
                          <span className="font-mono text-[10px] text-zinc-400 uppercase font-bold">{activeTab} node</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {docTypes[activeTab].map((type) => {
                          const isUploaded = uploadedDocs.some(d => d.type === type.id);
                          const isUploading = uploadingFile === type.id;

                          return (
                            <div 
                              key={type.id}
                              className={`p-4 rounded-2xl border transition-all relative ${
                                isUploaded 
                                  ? 'bg-zinc-50 border-trust-green/20' 
                                  : 'bg-white border-zinc-100 hover:border-zinc-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUploaded ? 'bg-trust-green/10 text-trust-green' : 'bg-zinc-50 text-zinc-400'}`}>
                                  {isUploaded ? <CheckCircle2 className="w-5 h-5" /> : <FileDown className="w-5 h-5" />}
                                </div>
                                {isUploaded && (
                                   <button 
                                      onClick={() => removeDoc(uploadedDocs.find(d => d.type === type.id).id)}
                                      className="p-1.5 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-lg transition-all"
                                   >
                                      <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                )}
                              </div>
                              <p className="font-display font-bold text-[11px] text-zinc-900 mb-1">{type.label}</p>
                              <p className="font-sans text-[9px] text-zinc-400 leading-tight mb-4">{type.desc}</p>
                              
                              <label className={`w-full h-9 rounded-xl flex items-center justify-center gap-2 font-display text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                isUploaded 
                                  ? 'bg-trust-green text-white shadow-lg shadow-trust-green/20' 
                                  : isUploading
                                    ? 'bg-zinc-200 text-zinc-400 cursor-wait'
                                    : 'bg-zinc-950 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-950/20'
                              }`}>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept=".pdf,image/*"
                                  disabled={isUploading}
                                  onChange={(e) => handleFileUpload(e, type.id)}
                                />
                                {isUploading ? 'Uploading...' : isUploaded ? 'Uploaded' : 'Select File'}
                                {!isUploading && !isUploaded && <Upload className="w-3 h-3" />}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {/* Uploaded Inventory */}
                    {uploadedDocs.length > 0 && (
                      <motion.section 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-3xl p-6 border border-zinc-100"
                      >
                        <h4 className="font-display font-bold text-[10px] text-zinc-400 uppercase tracking-widest mb-4">Submission Queue</h4>
                        <div className="space-y-2">
                          {uploadedDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-zinc-50/50 rounded-xl border border-zinc-100 group">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-zinc-100">
                                  <FileText className="w-4 h-4 text-trust-green" />
                                </div>
                                <div>
                                  <p className="font-display font-bold text-[10px] text-zinc-900">{doc.name}</p>
                                  <p className="font-sans text-[9px] text-zinc-400 uppercase">{doc.type} • Pending Review</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => removeDoc(doc.id)}
                                className="p-2 opacity-0 group-hover:opacity-100 transition-all text-zinc-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.section>
                    )}

                    <div className="flex justify-end pr-2">
                      <button
                        onClick={handleVerify}
                        disabled={isSaving || uploadedDocs.length === 0}
                        className="h-14 px-12 bg-zinc-950 text-white rounded-2xl font-display font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-950/20 disabled:opacity-50"
                      >
                        {isSaving ? 'Finalizing...' : 'Submit Verification Request'}
                        <ArrowRight className="w-5 h-5 text-trust-green" />
                      </button>
                    </div>

                    <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-3xl flex gap-4">
                       <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                       <div className="space-y-1">
                          <p className="font-display font-bold text-xs text-zinc-900 uppercase tracking-wide">Review Timeline Protocol</p>
                          <p className="font-sans text-[11px] text-zinc-600 leading-relaxed">
                             Submitted documents enter the review queue immediately. Manual validation by the compliance node typically takes <span className="font-bold text-zinc-900">2-5 business days</span>. You will receive a network notification once the protocol resolves.
                          </p>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
