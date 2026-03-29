import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
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

export function ComparisonChart({ schedule, changes, history }: Props) {
  const { resolved } = useTheme();

  // 构造对比选项：每次变更 = history[i] (变更前) vs history[i+1] 或当前 (变更后)
  const comparisonOptions = useMemo(() => {
    if (history.length === 0) return [];

    const options: Array<{
      label: string;
      before: PaymentScheduleItem[];
      after: PaymentScheduleItem[];
    }> = [];

    for (let i = 0; i < history.length; i++) {
      const before = history[i].schedule;
      const after = i + 1 < history.length ? history[i + 1].schedule : schedule;
      const changeRecord = changes[i + 1];
      const label = changeRecord?.comment
        ? `第 ${i + 1} 次: ${changeRecord.comment}`
        : `第 ${i + 1} 次变更`;
      options.push({ label, before, after });
    }

    return options;
  }, [history, schedule, changes]);

  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, comparisonOptions.length - 1),
  );

  // 选中的对比被删除时回退
  const safeIndex = Math.min(
    selectedIndex,
    Math.max(0, comparisonOptions.length - 1),
  );

  const option = useMemo(() => {
    if (comparisonOptions.length === 0) return null;

    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';
    const subTextColor = isDark ? '#999' : '#999';

    const { before, after } = comparisonOptions[safeIndex];

    const beforeItems = before.filter((item) => item.period > 0);
    const afterItems = after.filter((item) => item.period > 0);

    const maxLen = Math.max(beforeItems.length, afterItems.length);
    const periods = Array.from({ length: maxLen }, (_, i) => i + 1);

    const beforePayments = beforeItems.map((item) => item.monthlyPayment);
    const afterPayments = afterItems.map((item) => item.monthlyPayment);

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
          const period = periods[idx];
          const bItem = beforeItems[idx];
          const aItem = afterItems[idx];
          const date = aItem?.paymentDate || bItem?.paymentDate || '';
          let html = `<b>第 ${period} 期</b> ${date}`;
          for (const p of params) {
            html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ¥${Number(p.value).toFixed(2)}`;
          }
          if (bItem && aItem) {
            const diff = aItem.monthlyPayment - bItem.monthlyPayment;
            if (Math.abs(diff) > 0.01) {
              const sign = diff > 0 ? '+' : '';
              html += `<br/><span style="color:${subTextColor}">●</span> 差额: ${sign}¥${diff.toFixed(2)}`;
            }
          }
          return html;
        },
      },
      legend: {
        bottom: 30,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: { top: 10, right: 10, bottom: 70, left: 55 },
      xAxis: {
        type: 'category',
        data: periods,
        axisLabel: {
          fontSize: 10,
          color: textColor,
          interval: (index: number) => {
            if (index === 0 || index === periods.length - 1) return true;
            const step = Math.ceil(periods.length / 12);
            return index % step === 0;
          },
        },
        axisLine: { lineStyle: { color: isDark ? '#444' : '#ddd' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: textColor },
        splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
      },
      dataZoom: [
        { type: 'inside' },
        {
          type: 'slider',
          bottom: 5,
          height: 20,
          textStyle: { color: textColor },
        },
      ],
      series: [
        {
          name: '变更前',
          type: 'line',
          data: beforePayments,
          lineStyle: { type: 'dashed', width: 1.5 },
          showSymbol: false,
          itemStyle: { color: isDark ? '#888' : '#aaa' },
        },
        {
          name: '变更后',
          type: 'line',
          data: afterPayments,
          showSymbol: false,
          lineStyle: { width: 2 },
          itemStyle: { color: '#4caf50' },
        },
      ],
    };
  }, [comparisonOptions, safeIndex, resolved]);

  if (comparisonOptions.length === 0) {
    return (
      <EmptyState message="暂无变更记录，操作利率变更或提前还款后可查看对比" />
    );
  }

  return (
    <div className="space-y-2">
      {comparisonOptions.length > 1 && (
        <select
          value={safeIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          className="w-full text-sm border border-border rounded-md px-2 py-1.5 bg-card text-foreground"
        >
          {comparisonOptions.map((opt, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 选项列表用 index 即可
            <option key={i} value={i}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      {option && <ReactECharts option={option} style={{ height: 260 }} />}
    </div>
  );
}
