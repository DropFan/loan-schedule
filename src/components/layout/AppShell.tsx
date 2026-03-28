import { Outlet } from 'react-router';
import { APP_AUTHOR_LINK, APP_NAME, APP_VERSION } from '@/constants/app.constants';
import { BottomTabs } from './BottomTabs';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* 移动端顶部 header */}
        <header className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
          <img src="/logo-128.png" alt={APP_NAME} className="w-6 h-6 rounded" />
          <span className="text-sm font-bold truncate">{APP_NAME}</span>
          <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            By <a href={APP_AUTHOR_LINK} className="hover:text-primary" target="_blank" rel="noreferrer">Tiger</a>
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
