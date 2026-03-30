import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { calcScheduleSummary } from '@/core/calculator/LoanCalculator';
import type {
  LoanChangeRecord,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

const fmtAmt = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    const summaries: Array<{
      before: ReturnType<typeof calcScheduleSummary>;
      after: ReturnType<typeof calcScheduleSummary>;
      changeRecord?: LoanChangeRecord;
    }> = [];

    for (let i = 0; i < history.length; i++) {
      const beforeSchedule = history[i].schedule;
      const afterSchedule =
        i + 1 < history.length ? history[i + 1].schedule : schedule;

      const beforeSummary = calcScheduleSummary(beforeSchedule);
      const afterSummary = calcScheduleSummary(afterSchedule);
      const saved = beforeSummary.totalInterest - afterSummary.totalInterest;

      const changeRecord = changes[i + 1];
      categories.push(`第${i + 1}次`);
      beforeInterests.push(Math.round(beforeSummary.totalInterest));
      afterInterests.push(Math.round(afterSummary.totalInterest));
      savedInterests.push(Math.round(saved));
      summaries.push({
        before: beforeSummary,
        after: afterSummary,
        changeRecord,
      });
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
          const s = summaries[idx];
          const date =
            s?.changeRecord?.date instanceof Date
              ? s.changeRecord.date.toISOString().split('T')[0]
              : s?.changeRecord?.date
                ? String(s.changeRecord.date).split('T')[0]
                : '';
          let html = `<b>${categories[idx]}</b> ${date}`;
          if (s?.changeRecord?.comment) {
            html += `<br/>${s.changeRecord.comment}`;
          }
          for (const p of params) {
            html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ${fmtAmt(p.value)}`;
          }
          if (s) {
            html += '<br/>──────────';
            html += `<br/>变更前总还款: ${fmtAmt(s.before.totalPayment)}（${s.before.termMonths} 期）`;
            html += `<br/>变更后总还款: ${fmtAmt(s.after.totalPayment)}（${s.after.termMonths} 期）`;
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

  // 总计：初始方案 vs 最终方案
  const totalSummary = useMemo(() => {
    if (history.length === 0) return null;
    const initial = calcScheduleSummary(history[0].schedule);
    const final = calcScheduleSummary(schedule);
    return { initial, final };
  }, [history, schedule]);

  if (history.length === 0) {
    return (
      <EmptyState message="暂无变更记录，操作利率变更或提前还款后可查看利息对比" />
    );
  }

  return option ? (
    <div className="space-y-2">
      <ReactECharts option={option} style={{ height: 280 }} />
      {totalSummary && (
        <div className="grid grid-cols-3 gap-x-2 gap-y-1 px-1 pt-1 text-xs text-muted-foreground border-t border-border">
          <span>
            累计节省利息{' '}
            <b className="text-foreground">
              {fmtAmt(
                totalSummary.initial.totalInterest -
                  totalSummary.final.totalInterest,
              )}
            </b>
          </span>
          <span>
            累计节省还款{' '}
            <b className="text-foreground">
              {fmtAmt(
                totalSummary.initial.totalPayment -
                  totalSummary.final.totalPayment,
              )}
            </b>
          </span>
          <span>
            期数变化{' '}
            <b className="text-foreground">
              {totalSummary.final.termMonths - totalSummary.initial.termMonths}{' '}
              期
            </b>
          </span>
          <span>初始 {fmtAmt(totalSummary.initial.totalInterest)}</span>
          <span>初始 {fmtAmt(totalSummary.initial.totalPayment)}</span>
          <span>初始 {totalSummary.initial.termMonths} 期</span>
          <span>当前 {fmtAmt(totalSummary.final.totalInterest)}</span>
          <span>当前 {fmtAmt(totalSummary.final.totalPayment)}</span>
          <span>当前 {totalSummary.final.termMonths} 期</span>
        </div>
      )}
    </div>
  ) : null;
}
