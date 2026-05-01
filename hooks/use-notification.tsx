'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, Info, Loader2 } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'loading';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    
    if (type !== 'loading') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    }
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({ options, resolve });
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(value);
      setConfirmDialog(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}
      
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="pointer-events-auto relative min-w-[340px] max-w-md bg-white/80 backdrop-blur-xl border border-zinc-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-3xl p-5 flex items-start gap-4 group overflow-hidden"
            >
              <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                n.type === 'success' ? 'bg-trust-green/10 text-trust-green ring-4 ring-trust-green/5' :
                n.type === 'error' ? 'bg-red-50 text-red-500 ring-4 ring-red-50/50' :
                n.type === 'loading' ? 'bg-zinc-100 text-zinc-400 ring-4 ring-zinc-50' :
                'bg-blue-50 text-blue-500 ring-4 ring-blue-50/50'
              }`}>
                {n.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                {n.type === 'error' && <AlertCircle className="w-6 h-6" />}
                {n.type === 'loading' && <Loader2 className="w-6 h-6 animate-spin" />}
                {n.type === 'info' && <Info className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 pt-1">
                <p className="font-display font-bold text-[10px] uppercase tracking-[0.2em] mb-1 opacity-40">
                  {n.type === 'success' ? 'Protocol Success' : 
                   n.type === 'error' ? 'Security Alert' : 
                   n.type === 'loading' ? 'Processing' : 'System Message'}
                </p>
                <p className="font-sans text-sm font-medium text-zinc-900 leading-relaxed pr-6">
                  {n.message}
                </p>
              </div>

              <button 
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="shrink-0 w-8 h-8 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-all"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>

              {/* Progress Bar for Auto-dismiss */}
              {n.type !== 'loading' && (
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-1 ${
                    n.type === 'success' ? 'bg-trust-green' :
                    n.type === 'error' ? 'bg-red-400' :
                    'bg-blue-400'
                  }`}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Premium Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 sm:p-24">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
              onClick={() => handleConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-lg bg-white rounded-[3.5rem] p-12 shadow-[0_50px_100px_rgba(0,0,0,0.3)] border border-zinc-100 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-zinc-950" />
              
              <div className="w-20 h-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-10 shadow-inner">
                <AlertCircle className="w-10 h-10 text-zinc-300" />
              </div>

              <div className="space-y-4 mb-12">
                <h3 className="font-display text-4xl font-bold text-zinc-900 tracking-tight">
                  {confirmDialog.options.title}
                </h3>
                <p className="font-sans text-lg text-zinc-500 leading-relaxed">
                  {confirmDialog.options.message}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => handleConfirm(false)}
                  className="flex-1 h-16 bg-zinc-50 text-zinc-500 rounded-2xl font-display font-bold text-xs uppercase tracking-[0.2em] hover:bg-zinc-100 transition-all border border-zinc-100"
                >
                  {confirmDialog.options.cancelText || 'Decline'}
                </button>
                <button 
                  onClick={() => handleConfirm(true)}
                  className="flex-1 h-16 bg-zinc-950 text-white rounded-2xl font-display font-bold text-xs uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-950/20"
                >
                  {confirmDialog.options.confirmText || 'Authorize'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
