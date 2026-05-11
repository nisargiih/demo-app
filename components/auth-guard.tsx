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
      if (email && sessionId && !isPublicRoute) {
        try {
          const res = await fetch(`/api/auth/sessions?email=${email}&checkSessionId=${sessionId}`);
          if (res.ok) {
            const body = await res.json();
            const data = SecurityService.processFromTransit(body);
            if (data.isValid === false) {
              // Session revoked!
              localStorage.clear();
              router.push('/login?message=session_revoked');
              window.location.reload();
            }
          }
        } catch (err) {
          console.error('Session verification failed', err);
        }
      }
    };

    if (!email && !isPublicRoute) {
      router.push('/login');
      return;
    } 

    if (email && isPublicRoute && pathname !== '/verify-otp' && pathname !== '/verify') {
      router.push('/dashboard');
      return;
    }

    // Verify session on route change if not a public route
    verifySession();

    // Check periodically (every 30 seconds)
    const interval = setInterval(verifySession, 30000);
    
    // Check on focus
    window.addEventListener('focus', verifySession);
    
    setIsAuthorized(true);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', verifySession);
    };
  }, [pathname, router, loading, role, permissions]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-[9999] flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-zinc-100 dark:border-white/5 border-t-trust-green rounded-full animate-spin" />
          <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-trust-green animate-pulse" />
        </div>
        <p className="font-display font-medium text-xs uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600">Synchronizing Node...</p>
      </div>
    );
  }

  return <>{children}</>;
}
