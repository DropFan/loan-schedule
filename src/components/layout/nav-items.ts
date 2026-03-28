import { Calculator, ChartLine, Settings, TableProperties } from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const navItems: NavItem[] = [
  { path: '/', label: '贷款计算', icon: Calculator },
  { path: '/analysis', label: '数据分析', icon: ChartLine },
  { path: '/rates', label: '利率表', icon: TableProperties },
  { path: '/settings', label: '设置', icon: Settings },
];
