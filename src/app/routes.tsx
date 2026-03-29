import { type RouteObject, useRoutes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { CalculatorPage } from '@/features/calculator';
import { AnalysisPage } from '@/features/charts';
import { RateTablePage } from '@/features/rate-table';
import { SettingsPage } from '@/features/settings';

export function AppRoutes() {
  return useRoutes(routes);
}

const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <CalculatorPage /> },
      { path: 'analysis', element: <AnalysisPage /> },
      { path: 'rates', element: <RateTablePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
];
