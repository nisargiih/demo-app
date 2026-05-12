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
  const isCompanyTabLocked = user?.entityType !== 'Company' && !isVerified;

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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 transition-colors duration-300">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-trust-green/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-trust-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen w-full bg-white dark:bg-zinc-950 selection:bg-trust-green/20 lg:pl-72 pt-16 lg:pt-0 pb-20 px-4 sm:px-6 transition-colors duration-300">
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
            <h1 className="font-display text-4xl font-bold text-zinc-900 dark:text-white">Verification Terminal</h1>
          </motion.div>
          <p className="font-sans text-sm text-zinc-500 dark:text-zinc-400">Secure your identity by uploading official notarization documents to the vault.</p>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
            <div className="lg:col-span-1 h-[200px] bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl" />
            <div className="lg:col-span-3 h-[500px] bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Nav */}
            <div className="lg:col-span-1 space-y-2">
              <button
                onClick={() => setActiveTab('individual')}
                className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all text-left ${
                  activeTab === 'individual' 
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xl shadow-zinc-900/10 dark:shadow-none' 
                    : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                }`}
              >
                <User className={`w-4 h-4 ${activeTab === 'individual' ? 'text-trust-green' : 'text-zinc-400 dark:text-zinc-600'}`} />
                <span className="font-display font-bold text-[10px] uppercase tracking-widest">Individual</span>
              </button>
              
              <div className="relative group">
                <button
                  disabled={isCompanyTabLocked}
                  onClick={() => setActiveTab('company')}
                  className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all text-left ${
                    activeTab === 'company' 
                      ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xl shadow-zinc-900/10 dark:shadow-none' 
                      : isCompanyTabLocked
                        ? 'opacity-50 cursor-not-allowed text-zinc-400 bg-zinc-50 dark:bg-zinc-900/30'
                        : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  }`}
                >
                  {isCompanyTabLocked ? (
                    <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                  ) : (
                    <Building2 className={`w-4 h-4 ${activeTab === 'company' ? 'text-trust-green' : 'text-zinc-400 dark:text-zinc-600'}`} />
                  )}
                  <span className="font-display font-bold text-[10px] uppercase tracking-widest">Company</span>
                </button>
                
                {isCompanyTabLocked && (
                  <div className="absolute left-0 lg:left-full lg:ml-4 top-full lg:top-0 mt-2 lg:mt-0 w-64 p-4 bg-zinc-950 dark:bg-zinc-900 text-white rounded-2xl text-[10px] opacity-0 pointer-events-none group-hover:opacity-100 transition-all z-50 shadow-2xl border border-zinc-800 dark:border-white/10 translate-y-2 group-hover:translate-y-0">
                    <div className="flex items-center gap-2 mb-2 text-trust-green">
                      <Lock className="w-3 h-3" />
                      <p className="font-display font-bold uppercase tracking-tighter">Access Restricted</p>
                    </div>
                    <p className="font-sans text-zinc-400 leading-relaxed font-medium">
                      Verify your individual identity first then you can upgrade to company profile.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-8 space-y-4">
                <div className="p-5 bg-zinc-950 dark:bg-zinc-900 rounded-2xl text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-trust-green/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-trust-green/20 transition-all" />
                  <Lock className="w-5 h-5 text-trust-green mb-3" />
                  <h4 className="font-display font-bold text-xs mb-1">Encrypted Vault</h4>
                  <p className="font-sans text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">All files are stored in an AES-256 encrypted S3 bucket.</p>
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
                    className="glass rounded-[2.5rem] p-12 text-center border border-zinc-100 dark:border-white/5 shadow-xl dark:shadow-none"
                  >
                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 relative ${
                      isVerified ? 'bg-trust-green/10' : 'bg-amber-50 dark:bg-amber-950/20'
                    }`}>
                      {isVerified ? (
                        <div className="relative">
                          {user?.entityType === 'Company' ? (
                            <Building2 className="w-12 h-12 text-trust-green" />
                          ) : (
                            <User className="w-12 h-12 text-trust-green" />
                          )}
                          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-trust-green rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-5 h-5 text-zinc-950" />
                          </div>
                        </div>
                      ) : (
                        <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <h2 className="font-display text-3xl font-bold text-zinc-950 dark:text-white">
                        {isVerified ? 'Identity Verified' : 'Review Active'}
                      </h2>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-white/5 mb-6">
                      {user?.entityType === 'Company' ? (
                        <Building2 className="w-3 h-3 text-zinc-400" />
                      ) : (
                        <User className="w-3 h-3 text-zinc-400" />
                      )}
                      <span className="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{user?.entityType || 'Individual'} Node</span>
                    </div>
                    <p className="font-sans text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm mx-auto leading-relaxed text-sm">
                      {isVerified 
                        ? 'Your identity and documents have been cryptographically notarized on our network.' 
                        : 'Your documents are currently under review. This protocol typically resolves in 2-5 business days.'}
                    </p>

                    {isVerified && user?.entityType === 'Company' && (
                      <div className="mb-8 p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-3xl max-w-md mx-auto text-left">
                        <p className="font-mono text-[8px] text-zinc-400 uppercase tracking-widest mb-3">Verified Organization Details</p>
                        <div className="space-y-3">
                          <div>
                            <p className="font-display font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-tight">{user.companyName}</p>
                            <p className="font-sans text-[10px] text-zinc-500">{user.companyEmail}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-100 dark:border-white/5">
                            <div>
                               <p className="font-mono text-[8px] text-zinc-400 uppercase tracking-widest mb-1">Registration ID</p>
                               <p className="font-sans text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">{user.companyRegistration || 'N/A'}</p>
                            </div>
                            <div>
                               <p className="font-mono text-[8px] text-zinc-400 uppercase tracking-widest mb-1">Location</p>
                               <p className="font-sans text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">{user.location || 'Global'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3 max-w-md mx-auto">
                      {uploadedDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-white/5">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                            <div className="text-left">
                              <p className="font-display font-bold text-[10px] text-zinc-900 dark:text-white uppercase tracking-wider">{doc.type}</p>
                              <p className="font-sans text-[10px] text-zinc-400 dark:text-zinc-500 truncate w-32">{doc.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] text-trust-green font-bold uppercase tracking-widest">SECURE</span>
                            <CheckCircle2 className="w-3 h-3 text-trust-green" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {!isVerified && (
                      <button 
                         onClick={() => router.push('/dashboard')}
                         className="mt-12 h-14 px-10 bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-white rounded-2xl font-display font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 dark:shadow-none"
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
                    <section className="glass rounded-[2.5rem] p-8 border border-zinc-100 dark:border-white/5 shadow-xl shadow-zinc-900/[0.02] dark:shadow-none">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="font-display font-bold text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                            <HardDrive className="w-5 h-5 text-trust-green" />
                            Document Selection
                          </h3>
                          <p className="font-sans text-xs text-zinc-400 dark:text-zinc-500 mt-1">Select and upload required identity tokens.</p>
                        </div>
                        <div className="px-3 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-full">
                          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-widest">{activeTab} node</span>
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
                                  ? 'bg-zinc-50 dark:bg-zinc-900/50 border-trust-green/20' 
                                  : 'bg-white dark:bg-zinc-900/30 border-zinc-100 dark:border-white/5 hover:border-zinc-200 dark:hover:border-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUploaded ? 'bg-trust-green/10 text-trust-green' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600'}`}>
                                  {isUploaded ? <CheckCircle2 className="w-5 h-5" /> : <FileDown className="w-5 h-5" />}
                                </div>
                                {isUploaded && (
                                   <button 
                                      onClick={() => removeDoc(uploadedDocs.find(d => d.type === type.id).id)}
                                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-300 dark:text-zinc-600 hover:text-red-500 rounded-lg transition-all"
                                   >
                                      <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                )}
                              </div>
                              <p className="font-display font-bold text-[11px] text-zinc-900 dark:text-white mb-1 uppercase tracking-wider leading-none">{type.label}</p>
                              <p className="font-sans text-[9px] text-zinc-400 dark:text-zinc-500 leading-tight mb-4">{type.desc}</p>
                              
                              <label className={`w-full h-9 rounded-xl flex items-center justify-center gap-2 font-display text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                                isUploaded 
                                  ? 'bg-trust-green text-zinc-950 shadow-lg shadow-trust-green/20' 
                                  : isUploading
                                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-wait'
                                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 shadow-xl shadow-zinc-950/10 dark:shadow-none border border-zinc-200 dark:border-white/5'
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
                        className="glass rounded-3xl p-6 border border-zinc-100 dark:border-white/5"
                      >
                        <h4 className="font-display font-bold text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Submission Queue</h4>
                        <div className="space-y-2">
                          {uploadedDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-white/5 group">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white dark:bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-100 dark:border-white/5">
                                  <FileText className="w-4 h-4 text-trust-green" />
                                </div>
                                <div>
                                  <p className="font-display font-bold text-[10px] text-zinc-900 dark:text-white uppercase tracking-wider">{doc.name}</p>
                                  <p className="font-sans text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mt-1">{doc.type} • Pending Review</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => removeDoc(doc.id)}
                                className="p-2 opacity-0 group-hover:opacity-100 transition-all text-zinc-400 dark:text-zinc-500 hover:text-red-500"
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
                        className="h-14 px-12 bg-zinc-100 dark:bg-trust-green text-zinc-900 dark:text-zinc-950 rounded-2xl font-display font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-200 dark:hover:bg-trust-green/90 transition-all shadow-2xl shadow-zinc-950/20 dark:shadow-none disabled:opacity-50"
                      >
                        {isSaving ? 'Finalizing...' : 'Submit Verification Request'}
                        <ArrowRight className="w-5 h-5 text-trust-green" />
                      </button>
                    </div>

                    <div className="p-6 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded-3xl flex gap-4">
                       <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                       <div className="space-y-1">
                          <p className="font-display font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wide tracking-widest">Review Timeline Protocol</p>
                          <p className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-semibold">
                             Submitted documents enter the review queue immediately. Manual validation by the compliance node typically takes <span className="font-bold text-zinc-900 dark:text-zinc-100">2-5 business days</span>. You will receive a network notification once the protocol resolves.
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
