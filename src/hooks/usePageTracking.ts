import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { trackPageView } from '@/core/utils/analytics';

const pageTitles: Record<string, string> = {
  '/': '贷款计算',
  '/analysis': '数据分析',
  '/compare': '方案对比',
  '/simulate': '还款模拟',
  '/rates': '利率表',
  '/settings': '设置',
};

export function usePageTracking() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(pathname, pageTitles[pathname]);
  }, [pathname]);
}
