'use client';

import { useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { useTheme } from '@/components/theme-provider';

export function ThemeSynchronizer() {
  const { user, loading } = useUser();
  const { theme, setTheme } = useTheme();

  // Only sync from server once when data arrives to prevent overriding local changes
  useEffect(() => {
    if (!loading && user?.theme) {
      const savedTheme = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
      if (user.theme !== theme && (!savedTheme || user.theme !== savedTheme)) {
        // Only override if the server has a newer/different intent or if no local preference exists
        setTheme(user.theme);
      }
    }
  }, [user?.theme, loading]);

  return null;
}
