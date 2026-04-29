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
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-auto min-w-[300px] bg-white border border-zinc-100 shadow-2xl shadow-zinc-200/50 rounded-2xl p-4 flex items-center gap-4 group"
            >
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                n.type === 'success' ? 'bg-trust-green/10 text-trust-green' :
                n.type === 'error' ? 'bg-red-50 text-red-500' :
                n.type === 'loading' ? 'bg-zinc-100 text-zinc-400' :
                'bg-blue-50 text-blue-500'
              }`}>
                {n.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {n.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {n.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                {n.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              <p className="flex-1 font-sans text-sm font-medium text-zinc-900 leading-tight">
                {n.message}
              </p>
              <button 
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-50 rounded-lg transition-all"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Premium Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
              onClick={() => handleConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-zinc-100"
            >
              <div className="w-16 h-16 bg-zinc-50 rounded-3xl flex items-center justify-center mb-8">
                <AlertCircle className="w-8 h-8 text-zinc-300" />
              </div>
              <h3 className="font-display text-2xl font-bold text-zinc-900 mb-2">
                {confirmDialog.options.title}
              </h3>
              <p className="font-sans text-zinc-500 mb-10 leading-relaxed">
                {confirmDialog.options.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleConfirm(false)}
                  className="flex-1 h-14 bg-zinc-50 text-zinc-600 rounded-2xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-100 transition-all"
                >
                  {confirmDialog.options.cancelText || 'Cancel'}
                </button>
                <button 
                  onClick={() => handleConfirm(true)}
                  className="flex-1 h-14 bg-zinc-950 text-white rounded-2xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20"
                >
                  {confirmDialog.options.confirmText || 'Proceed'}
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
