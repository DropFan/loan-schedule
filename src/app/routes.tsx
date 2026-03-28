import type { RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { CalculatorPage } from '@/features/calculator';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-muted text-sm">开发中...</p>
    </div>
  );
}

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <CalculatorPage /> },
      { path: 'analysis', element: <PlaceholderPage title="数据分析" /> },
      { path: 'rates', element: <PlaceholderPage title="利率表" /> },
      { path: 'settings', element: <PlaceholderPage title="设置" /> },
    ],
  },
];
