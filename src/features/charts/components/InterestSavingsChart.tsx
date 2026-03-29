import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import {
  annualToMonthlyRate,
  calcScheduleSummary,
  calculateLoan,
} from '@/core/calculator/LoanCalculator';
import type {
  LoanChangeRecord,
  LoanParameters,
  LoanScheduleSummary,
} from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  params: LoanParameters;
  summary: LoanScheduleSummary;
  changes: LoanChangeRecord[];
}

export function InterestSavingsChart({ params, summary, changes }: Props) {
  const { resolved } = useTheme();

  const option = useMemo(() => {
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    // 原始计划的利息
    const monthlyRate = annualToMonthlyRate(params.annualInterestRate);
    const original = calculateLoan(
      params.loanAmount,
      params.loanTermMonths,
      monthlyRate,
      params.annualInterestRate,
      params.startDate,
      params.loanMethod,
    );
    const originalSummary = calcScheduleSummary(original.schedule);
    const saved = originalSummary.totalInterest - summary.totalInterest;

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          p: Array<{ seriesName: string; value: number; color: string }>,
        ) =>
          p
            .map(
              (item) =>
                `<span style="color:${item.color}">●</span> ${item.seriesName}: ¥${item.value.toFixed(2)}`,
            )
            .join('<br/>'),
      },
      grid: { top: 10, right: 10, bottom: 30, left: 55 },
      xAxis: {
        type: 'category',
        data: ['利息对比'],
        axisLabel: { color: textColor },
        axisLine: { lineStyle: { color: isDark ? '#444' : '#ddd' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: textColor },
        splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
      },
      series: [
        {
          name: '原始利息',
          type: 'bar',
          data: [Math.round(originalSummary.totalInterest)],
          itemStyle: { color: isDark ? '#666' : '#ccc' },
          barMaxWidth: 40,
        },
        {
          name: '实际利息',
          type: 'bar',
          data: [Math.round(summary.totalInterest)],
          itemStyle: { color: '#4f8cff' },
          barMaxWidth: 40,
        },
        ...(saved > 0
          ? [
              {
                name: '节省利息',
                type: 'bar',
                data: [Math.round(saved)],
                itemStyle: { color: '#4caf50' },
                barMaxWidth: 40,
              },
            ]
          : []),
      ],
    };
  }, [params, summary, changes, resolved]);

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
