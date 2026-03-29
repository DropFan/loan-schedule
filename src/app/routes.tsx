import { type RouteObject, useRoutes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { CalculatorPage } from '@/features/calculator';
import { RateTablePage } from '@/features/rate-table';
import { SettingsPage } from '@/features/settings';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground text-sm">开发中...</p>
    </div>
  );
}

export function AppRoutes() {
  return useRoutes(routes);
}

const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <CalculatorPage /> },
      { path: 'analysis', element: <PlaceholderPage title="数据分析" /> },
      { path: 'rates', element: <RateTablePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
];
