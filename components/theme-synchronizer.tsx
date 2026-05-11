'use client';

import { useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { useTheme } from '@/components/theme-provider';

export function ThemeSynchronizer() {
  const { user, loading } = useUser();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!loading && user?.theme) {
      if (user.theme !== theme) {
        setTheme(user.theme);
      }
    }
  }, [user?.theme, loading, theme, setTheme]);

  return null;
}
