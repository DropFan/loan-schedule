import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  schedule: PaymentScheduleItem[];
}

const fmtAmt = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface AnnualData {
  year: string;
  totalPrincipal: number;
  totalInterest: number;
  endBalance: number;
}

function aggregateByYear(schedule: PaymentScheduleItem[]): AnnualData[] {
  const regularItems = schedule.filter((item) => item.period > 0);
  const yearMap = new Map<
    string,
    { principal: number; interest: number; endBalance: number }
  >();

  for (const item of regularItems) {
    const year = item.paymentDate.slice(0, 4);
    const existing = yearMap.get(year);
    if (existing) {
      existing.principal += item.principal;
      existing.interest += item.interest;
      existing.endBalance = item.remainingLoan;
    } else {
      yearMap.set(year, {
        principal: item.principal,
        interest: item.interest,
        endBalance: item.remainingLoan,
      });
    }
  }

  return Array.from(yearMap.entries()).map(([year, data]) => ({
    year,
    totalPrincipal: Math.round(data.principal * 100) / 100,
    totalInterest: Math.round(data.interest * 100) / 100,
    endBalance: Math.round(data.endBalance * 100) / 100,
  }));
}

export function AnnualSummaryChart({ schedule }: Props) {
  const { resolved } = useTheme();

  const option = useMemo(() => {
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';
    const annualData = aggregateByYear(schedule);
    if (annualData.length === 0) return null;

    const years = annualData.map((d) => d.year);
    const principals = annualData.map((d) => d.totalPrincipal);
    const interests = annualData.map((d) => d.totalInterest);
    const balances = annualData.map((d) => d.endBalance);

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          params: Array<{
            dataIndex: number;
            seriesName: string;
            value: number;
            color: string;
          }>,
        ) => {
          if (!params.length) return '';
          const idx = params[0].dataIndex;
          const d = annualData[idx];
          if (!d) return '';
          let html = `<b>${d.year} 年</b>`;
          html += `<br/>还款总额: ${fmtAmt(d.totalPrincipal + d.totalInterest)}`;
          for (const p of params) {
            html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ${fmtAmt(p.value)}`;
          }
          return html;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: { top: 10, right: 55, bottom: 40, left: 55 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { fontSize: 10, color: textColor },
        axisLine: { lineStyle: { color: isDark ? '#444' : '#ddd' } },
      },
      yAxis: [
        {
          type: 'value',
          name: '还款额',
          nameTextStyle: { color: textColor, fontSize: 10 },
          axisLabel: { fontSize: 10, color: textColor },
          splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
        },
        {
          type: 'value',
          name: '余额',
          nameTextStyle: { color: textColor, fontSize: 10 },
          axisLabel: { fontSize: 10, color: textColor },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '本金',
          type: 'bar',
          stack: 'repayment',
          data: principals,
          itemStyle: { color: '#4caf50' },
          barMaxWidth: 40,
        },
        {
          name: '利息',
          type: 'bar',
          stack: 'repayment',
          data: interests,
          itemStyle: { color: '#4f8cff' },
          barMaxWidth: 40,
        },
        {
          name: '年末余额',
          type: 'line',
          yAxisIndex: 1,
          data: balances,
          showSymbol: false,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: '#ff9800' },
        },
      ],
    };
  }, [schedule, resolved]);

  if (!option) return null;

  return <ReactECharts option={option} style={{ height: 300 }} />;
}
