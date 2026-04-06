import { lazy, Suspense } from 'react';
import { type RouteObject, useRoutes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { CalculatorPage } from '@/features/calculator';
import { RateTablePage } from '@/features/rate-table';
import { SettingsPage } from '@/features/settings';
import { usePageTracking } from '@/hooks/usePageTracking';

const AnalysisPage = lazy(() =>
  import('@/features/charts').then((m) => ({ default: m.AnalysisPage })),
);

const ComparePage = lazy(() => import('@/features/compare'));

const SimulatePage = lazy(() => import('@/features/simulate'));

export function AppRoutes() {
  usePageTracking();
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
      {
        path: 'compare',
        element: (
          <Suspense>
            <ComparePage />
          </Suspense>
        ),
      },
      {
        path: 'simulate',
        element: (
          <Suspense>
            <SimulatePage />
          </Suspense>
        ),
      },
      { path: 'rates', element: <RateTablePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
];
