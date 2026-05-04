'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useUser } from '@/hooks/use-user';

const PUBLIC_ROUTES = ['/', '/login', '/verify-otp'];

const PERMISSION_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/notarize': 'notarize',
  '/registry': 'registry',
  '/verify': 'verify',
  '/analytics': 'analytics',
  '/settings': 'settings',
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, role, permissions } = useUser();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    if (loading) return;

    const email = localStorage.getItem('authenticated_user_email');
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!email && !isPublicRoute) {
      router.push('/login');
      return;
    } 

    if (email && isPublicRoute && pathname !== '/verify-otp') {
      router.push('/dashboard');
      return;
    }

    // Permission Check
    let hasPermissionError = false;
    if (email && !isPublicRoute) {
      const requiredModule = Object.keys(PERMISSION_MAP).find(path => pathname.startsWith(path));
      
      if (requiredModule) {
        const moduleKey = PERMISSION_MAP[requiredModule];
        const hasPermission = role === 'admin' || permissions.includes(moduleKey);
        
        if (!hasPermission) {
          hasPermissionError = true;
        }
      }

      // Special check for Team Management
      if (pathname.startsWith('/settings/team') && role !== 'admin') {
        hasPermissionError = true;
      }
    }

    if (hasPermissionError) {
      const timer = setTimeout(() => setPermissionError(true), 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setPermissionError(false);
        setIsAuthorized(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, router, loading, role, permissions]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-zinc-100 border-t-trust-green rounded-full animate-spin" />
          <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-trust-green animate-pulse" />
        </div>
        <p className="font-display font-medium text-xs uppercase tracking-[0.3em] text-zinc-400">Synchronizing Node...</p>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="font-display text-3xl font-bold text-zinc-900">Access Denied</h2>
          <p className="font-sans text-zinc-500 leading-relaxed">
            Your current digital identity does not have sufficient clearance to access this protocol. 
            Please contact your system administrator to provision module access.
          </p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="h-12 px-8 bg-zinc-950 text-white rounded-xl font-display font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
