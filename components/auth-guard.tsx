'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/', '/login', '/verify-otp'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const email = localStorage.getItem('authenticated_user_email');
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

      if (!email && !isPublicRoute) {
        // Redirect to login if not authenticated and trying to access private route
        router.push('/login');
      } else if (email && isPublicRoute && pathname !== '/verify-otp') {
        // Redirect to dashboard if already authenticated and trying to access landing/login
        router.push('/dashboard');
      } else {
        setIsAuthorized(true);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (isLoading) {
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
