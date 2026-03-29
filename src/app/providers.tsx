import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router';
import { type Theme, ThemeContext } from '@/hooks/useTheme';

const STORAGE_KEY = 'loan-app-theme';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as Theme) || 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(
    getSystemTheme,
  );
  const resolved = theme === 'system' ? systemTheme : theme;

  // 监听系统主题变化
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // 应用主题到 <html>
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  const value = useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider>{children}</ThemeProvider>
    </BrowserRouter>
  );
}
