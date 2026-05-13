'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { SecurityService } from '@/lib/security-service';

const PUBLIC_ROUTES = ['/', '/login', '/verify-otp', '/verify'];

const PERMISSION_MAP: Record<string, string> = {
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

  useEffect(() => {
    if (loading) return;

    const email = localStorage.getItem('authenticated_user_email');
    const sessionId = localStorage.getItem('current_session_id');
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    const clearAuthState = () => {
      localStorage.removeItem('authenticated_user_email');
      localStorage.removeItem('authenticated_user_id');
      localStorage.removeItem('current_session_id');
      localStorage.removeItem('user_first_name');
    };

    const verifySession = async () => {
      if (!email || !sessionId || isPublicRoute) {
        return { checked: false, isValid: false };
      }

      try {
        const res = await fetch(`/api/auth/sessions?email=${encodeURIComponent(email)}&checkSessionId=${sessionId}`);
        if (!res.ok) {
          return { checked: true, isValid: false };
        }

        const body = await res.json();
        const data = SecurityService.processFromTransit(body);

        if (!data || data.isValid === false) {
          clearAuthState();
          router.replace('/login?message=session_revoked');
          return { checked: true, isValid: false };
        }

        return { checked: true, isValid: true };
      } catch (err) {
        console.error('Session verification failed', err);
        return { checked: true, isValid: false };
      }
    };

    const initialize = async () => {
      if (!email || !sessionId) {
        if (!isPublicRoute) {
          clearAuthState();
          router.replace('/login');
        }
        return;
      }

      if (email && (pathname === '/login' || pathname === '/')) {
        const session = await verifySession();
        if (session.isValid) {
          router.replace('/dashboard');
        }
        return;
      }

      if (!isPublicRoute) {
        await verifySession();
      }
    };

    initialize();

    const interval = setInterval(verifySession, 60000);
    window.addEventListener('focus', verifySession);

    setIsAuthorized(true);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', verifySession);
    };
  }, [pathname, router, loading]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-[9999] flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-zinc-100 dark:border-white/5 border-t-trust-green rounded-full animate-spin" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
             <div className="w-6 h-6 text-trust-green animate-pulse bg-trust-green rounded-full opacity-20" />
          </div>
        </div>
        <p className="font-display font-medium text-xs uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600">Synchronizing Node...</p>
      </div>
    );
  }

  return <>{children}</>;
}
