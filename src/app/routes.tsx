import { lazy, Suspense } from 'react';
import { type RouteObject, useRoutes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { CalculatorPage } from '@/features/calculator';
import { RateTablePage } from '@/features/rate-table';
import { SettingsPage } from '@/features/settings';

const AnalysisPage = lazy(() =>
  import('@/features/charts').then((m) => ({ default: m.AnalysisPage })),
);

export function AppRoutes() {
  return useRoutes(routes);
}

const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <CalculatorPage /> },
      {
        path: 'analysis',
        element: (
          <Suspense>
            <AnalysisPage />
          </Suspense>
        ),
      },
      { path: 'rates', element: <RateTablePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
];
