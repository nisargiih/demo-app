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

    const verifySession = async () => {
      // Don't verify if we don't have enough data or if it's already clearing
      if (!email || !sessionId || isPublicRoute) return;

      try {
        const res = await fetch(`/api/auth/sessions?email=${encodeURIComponent(email)}&checkSessionId=${sessionId}`);
        if (res.ok) {
          const body = await res.json();
          const data = SecurityService.processFromTransit(body);
          if (data && data.isValid === false) {
            // Session revoked!
            localStorage.clear();
            router.replace('/login?message=session_revoked');
          }
        }
      } catch (err) {
        console.error('Session verification failed', err);
      }
    };

    if (!email && !isPublicRoute) {
      router.replace('/login');
      return;
    } 

    // Only redirect from login/home if NOT sub-paths or special routes
    if (email && (pathname === '/login' || pathname === '/')) {
      router.replace('/dashboard');
      return;
    }

    // Verify session on route change if not a public route
    if (!isPublicRoute) {
      verifySession();
    }

    // Check periodically (every 60 seconds instead of 30 to be less aggressive)
    const interval = setInterval(verifySession, 60000);
    
    // Check on focus
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
