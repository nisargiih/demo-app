'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const fetchUser = useCallback(async () => {
    const email = localStorage.getItem('authenticated_user_email');
    if (!email) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/auth/me?email=${email}`);
      if (res.ok) {
        const body = await res.json();
        const data = SecurityService.processFromTransit(body);
        setUser(data);
      }
    } catch (err) {
      console.error('Context Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUser();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      role: user?.role || (loading ? null : 'member'), 
      permissions: user?.permissions || (loading ? [] : ['dashboard']),
      refresh: fetchUser 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
