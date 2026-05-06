'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useUser } from '@/hooks/use-user';

const PUBLIC_ROUTES = ['/', '/login', '/verify-otp'];

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
    // We no longer redirect to /dashboard?error=unauthorized here
    // because the user wants content to be displayed based on permission
    // rather than a hard redirect.
    
    setIsAuthorized(true);
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

  return <>{children}</>;
}
