import { useEffect } from 'react';
import { Outlet } from 'react-router';
import {
  APP_AUTHOR_LINK,
  APP_NAME,
  APP_VERSION,
} from '@/constants/app.constants';
import { BottomTabs } from './BottomTabs';
import { Sidebar } from './Sidebar';

const DEV_TIME = import.meta.env.DEV
  ? new Date().toLocaleTimeString('zh-CN', { hour12: false })
  : '';

function usePwaInstallPrompt() {
  useEffect(() => {
    const popupCount = Number(localStorage.getItem('pwaPopupCount') || '0');
    if (popupCount >= 2) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator &&
        (navigator as { standalone?: boolean }).standalone);
    if (isStandalone) return;

    const timer = setTimeout(() => {
      const el = document.querySelector('pwa-install') as HTMLElement & {
        isInstallAvailable?: boolean;
        isAppleMobilePlatform?: boolean;
        isAppleDesktopPlatform?: boolean;
        showDialog?: (force?: boolean) => void;
      };
      if (!el?.showDialog) return;

      const ua = navigator.userAgent;
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isMacSafari =
        /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua);

      el.isAppleMobilePlatform = isIOS;
      el.isAppleDesktopPlatform = isMacSafari;

      if (el.isInstallAvailable || isIOS || isMacSafari) {
        el.showDialog(true);
        localStorage.setItem('pwaPopupCount', String(popupCount + 1));
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, []);
}

export function AppShell() {
  usePwaInstallPrompt();
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* 移动端顶部 header */}
        <header className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
          <img src="/logo-128.png" alt={APP_NAME} className="w-6 h-6 rounded" />
          <span className="text-sm font-bold truncate">{APP_NAME}</span>
          <span className="text-xs text-muted-foreground">
            v{APP_VERSION}
            {DEV_TIME && <span className="ml-1 opacity-50">{DEV_TIME}</span>}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            By{' '}
            <a
              href={APP_AUTHOR_LINK}
              className="hover:text-primary"
              target="_blank"
              rel="noreferrer"
            >
              Tiger
            </a>
          </span>
        </header>
        <main className="flex-1 pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
