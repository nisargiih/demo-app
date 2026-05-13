'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { SecurityService } from '@/lib/security-service';

interface UserContextType {
  user: any | null;
  loading: boolean;
  role: string | null;
  permissions: string[];
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  role: null,
  permissions: [],
  refresh: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const fetchUser = useCallback(async (isInitial = false) => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) {
      setLoading(false);
      return;
    }

    if (isInitial) setLoading(true);

    try {
      const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        setUser(data);
      } else {
        localStorage.removeItem('authenticated_user_email');
        localStorage.removeItem('authenticated_user_id');
        localStorage.removeItem('current_session_id');
        localStorage.removeItem('user_first_name');
        setUser(null);
      }
    } catch (err) {
      console.error('Context Fetch Error:', err);
      setUser(null);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser(true);
    
    // Refresh on focus but don't show loading spinner
    const onFocus = () => fetchUser(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchUser]); 

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      role: user?.role || (loading ? null : null), 
      permissions: user?.permissions || (loading ? [] : []),
      refresh: fetchUser 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
