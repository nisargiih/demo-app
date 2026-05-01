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
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: 50, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto relative min-w-[360px] max-w-md bg-white border border-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-[1.5rem] p-5 flex items-start gap-4 group overflow-hidden"
            >
              <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                n.type === 'success' ? 'bg-trust-green/10 text-trust-green' :
                n.type === 'error' ? 'bg-red-50 text-red-500' :
                n.type === 'loading' ? 'bg-zinc-50 text-zinc-400' :
                'bg-zinc-50 text-zinc-950'
              }`}>
                {n.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                {n.type === 'error' && <AlertCircle className="w-6 h-6" />}
                {n.type === 'loading' && <Loader2 className="w-6 h-6 animate-spin" />}
                {n.type === 'info' && <Info className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 pt-1">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] mb-1 text-zinc-400">
                  {n.type === 'success' ? 'Protocol Success' : 
                   n.type === 'error' ? 'Security Alert' : 
                   n.type === 'loading' ? 'Processing' : 'System Intel'}
                </p>
                <p className="font-sans text-[13px] font-bold text-zinc-900 leading-relaxed pr-6">
                  {n.message}
                </p>
              </div>

              <button 
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="shrink-0 w-8 h-8 flex items-center justify-center hover:bg-zinc-50 rounded-lg transition-all"
              >
                <X className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600" />
              </button>

              {/* Progress Bar for Auto-dismiss */}
              {n.type !== 'loading' && (
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-1 ${
                    n.type === 'success' ? 'bg-trust-green' :
                    n.type === 'error' ? 'bg-red-500' :
                    'bg-zinc-950'
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
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 sm:p-12 shadow-[0_50px_100px_rgba(0,0,0,0.3)] border border-white overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-trust-green via-zinc-950 to-trust-green" />
              
              <div className="w-20 h-20 bg-zinc-950 rounded-[2rem] flex items-center justify-center mb-10 shadow-xl shadow-zinc-950/20">
                <CheckCircle2 className="w-10 h-10 text-trust-green" />
              </div>

              <div className="space-y-4 mb-12">
                <h3 className="font-display text-4xl font-black text-zinc-900 tracking-tight leading-none">
                  {confirmDialog.options.title}
                </h3>
                <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">Authorization Protocol Required</p>
                <div className="h-px bg-zinc-50 w-full" />
                <p className="font-sans text-base text-zinc-500 leading-relaxed">
                  {confirmDialog.options.message}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => handleConfirm(false)}
                  className="flex-1 h-16 bg-zinc-50 text-zinc-400 rounded-2xl font-display font-bold text-xs uppercase tracking-[0.2em] hover:bg-zinc-100 hover:text-zinc-600 transition-all"
                >
                  {confirmDialog.options.cancelText || 'Decline'}
                </button>
                <button 
                  onClick={() => handleConfirm(true)}
                  className="flex-1 h-16 bg-zinc-950 text-white rounded-2xl font-display font-bold text-xs uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-950/30"
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
