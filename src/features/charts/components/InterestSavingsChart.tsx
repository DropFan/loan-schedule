import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { calcScheduleSummary } from '@/core/calculator/LoanCalculator';
import type {
  LoanChangeRecord,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

interface Snapshot {
  schedule: PaymentScheduleItem[];
  changeList: LoanChangeRecord[];
}

interface Props {
  schedule: PaymentScheduleItem[];
  changes: LoanChangeRecord[];
  history: Snapshot[];
}

export function InterestSavingsChart({ schedule, changes, history }: Props) {
  const { resolved } = useTheme();

  const option = useMemo(() => {
    if (history.length === 0) return null;

    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    const categories: string[] = [];
    const beforeInterests: number[] = [];
    const afterInterests: number[] = [];
    const savedInterests: number[] = [];

    for (let i = 0; i < history.length; i++) {
      const beforeSchedule = history[i].schedule;
      const afterSchedule =
        i + 1 < history.length ? history[i + 1].schedule : schedule;

      const beforeSummary = calcScheduleSummary(beforeSchedule);
      const afterSummary = calcScheduleSummary(afterSchedule);
      const saved = beforeSummary.totalInterest - afterSummary.totalInterest;

      const changeRecord = changes[i + 1];
      const label = changeRecord?.comment ? `第${i + 1}次` : `第${i + 1}次`;
      categories.push(label);
      beforeInterests.push(Math.round(beforeSummary.totalInterest));
      afterInterests.push(Math.round(afterSummary.totalInterest));
      savedInterests.push(Math.round(saved));
    }

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          params: Array<{
            seriesName: string;
            value: number;
            color: string;
            dataIndex: number;
          }>,
        ) => {
          if (!params.length) return '';
          const idx = params[0].dataIndex;
          const changeRecord = changes[idx + 1];
          const date =
            changeRecord?.date instanceof Date
              ? changeRecord.date.toISOString().split('T')[0]
              : changeRecord?.date
                ? String(changeRecord.date).split('T')[0]
                : '';
          let html = `<b>${categories[idx]}</b> ${date}`;
          if (changeRecord?.comment) {
            html += `<br/>${changeRecord.comment}`;
          }
          for (const p of params) {
            html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ¥${p.value.toLocaleString()}`;
          }
          return html;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: { top: 10, right: 10, bottom: 40, left: 55 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: textColor, fontSize: 10 },
        axisLine: { lineStyle: { color: isDark ? '#444' : '#ddd' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: textColor },
        splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
      },
      series: [
        {
          name: '变更前利息',
          type: 'bar',
          data: beforeInterests,
          itemStyle: { color: isDark ? '#666' : '#ccc' },
          barMaxWidth: 50,
        },
        {
          name: '变更后利息',
          type: 'bar',
          data: afterInterests,
          itemStyle: { color: '#4f8cff' },
          barMaxWidth: 50,
        },
        {
          name: '节省利息',
          type: 'bar',
          data: savedInterests.map((v) => ({
            value: v,
            itemStyle: v < 0 ? { color: '#ff6b6b' } : undefined,
          })),
          itemStyle: { color: '#4caf50' },
          barMaxWidth: 50,
        },
      ],
    };
  }, [schedule, changes, history, resolved]);

  if (history.length === 0) {
    return (
      <EmptyState message="暂无变更记录，操作利率变更或提前还款后可查看利息对比" />
    );
  }

  return option ? (
    <ReactECharts option={option} style={{ height: 280 }} />
  ) : null;
}
