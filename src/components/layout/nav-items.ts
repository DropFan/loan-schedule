import {
  Calculator,
  ChartLine,
  FlaskConical,
  GitCompareArrows,
  Settings,
  TableProperties,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  path: string;
  label: string;
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
}

export const navItems: NavItem[] = [
  { path: '/', label: '贷款计算', shortLabel: '计算', icon: Calculator },
  { path: '/analysis', label: '数据分析', shortLabel: '分析', icon: ChartLine },
  {
    path: '/compare',
    label: '方案对比',
    shortLabel: '对比',
    icon: GitCompareArrows,
  },
  {
    path: '/simulate',
    label: '还款模拟',
    shortLabel: '模拟',
    icon: FlaskConical,
  },
  {
    path: '/rates',
    label: '利率表',
    shortLabel: '利率',
    icon: TableProperties,
  },
  { path: '/settings', label: '设置', icon: Settings },
];
