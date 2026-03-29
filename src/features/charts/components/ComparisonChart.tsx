import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import {
  annualToMonthlyRate,
  calculateLoan,
} from '@/core/calculator/LoanCalculator';
import type {
  LoanChangeRecord,
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  params: LoanParameters;
  schedule: PaymentScheduleItem[];
  changes: LoanChangeRecord[];
}

export function ComparisonChart({ params, schedule, changes }: Props) {
  const { resolved } = useTheme();

  const option = useMemo(() => {
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    const currentItems = schedule.filter((item) => item.period > 0);
    const currentPeriods = currentItems.map((item) => item.period);
    const currentPayments = currentItems.map((item) => item.monthlyPayment);

    // 生成原始计划（无任何变更）
    const monthlyRate = annualToMonthlyRate(params.annualInterestRate);
    const original = calculateLoan(
      params.loanAmount,
      params.loanTermMonths,
      monthlyRate,
      params.annualInterestRate,
      params.startDate,
      params.loanMethod,
    );
    const originalPayments = original.schedule.map(
      (item) => item.monthlyPayment,
    );

    const hasChanges = changes.length > 1;

    const series: Array<Record<string, unknown>> = [];

    if (hasChanges) {
      series.push({
        name: '原始计划',
        type: 'line',
        data: originalPayments,
        lineStyle: { type: 'dashed', width: 1.5 },
        showSymbol: false,
        itemStyle: { color: isDark ? '#888' : '#aaa' },
      });
    }

    series.push({
      name: hasChanges ? '变更后' : '当前计划',
      type: 'line',
      data: currentPayments,
      showSymbol: false,
      lineStyle: { width: 2 },
      itemStyle: { color: '#4caf50' },
    });

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
      },
      legend: {
        bottom: 0,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: { top: 10, right: 10, bottom: 40, left: 55 },
      xAxis: {
        type: 'category',
        data:
          currentPeriods.length >= originalPayments.length
            ? currentPeriods
            : original.schedule.map((_, i) => i + 1),
        axisLabel: { fontSize: 10, color: textColor },
        axisLine: { lineStyle: { color: isDark ? '#444' : '#ddd' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: textColor },
        splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
      },
      dataZoom: [{ type: 'inside' }],
      series,
    };
  }, [params, schedule, changes, resolved]);

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
