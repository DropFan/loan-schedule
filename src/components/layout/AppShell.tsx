import { Outlet } from 'react-router';
import { BottomTabs } from './BottomTabs';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}
