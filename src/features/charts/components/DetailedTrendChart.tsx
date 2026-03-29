import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  schedule: PaymentScheduleItem[];
}

export function DetailedTrendChart({ schedule }: Props) {
  const { resolved } = useTheme();

  const option = useMemo(() => {
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    const regularItems = schedule.filter((item) => item.period > 0);
    const periods = regularItems.map((item) => item.period);
    const principals = regularItems.map((item) => item.principal);
    const interests = regularItems.map((item) => item.interest);
    const remainingLoans = regularItems.map((item) => item.remainingLoan);

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
      },
      legend: {
        bottom: 35,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: { top: 10, right: 55, bottom: 75, left: 55 },
      xAxis: {
        type: 'category',
        data: periods,
        axisLabel: { fontSize: 10, color: textColor },
        axisLine: { lineStyle: { color: isDark ? '#444' : '#ddd' } },
      },
      yAxis: [
        {
          type: 'value',
          name: '月供构成',
          nameTextStyle: { color: textColor, fontSize: 10 },
          axisLabel: { fontSize: 10, color: textColor },
          splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
        },
        {
          type: 'value',
          name: '剩余本金',
          nameTextStyle: { color: textColor, fontSize: 10 },
          axisLabel: { fontSize: 10, color: textColor },
          splitLine: { show: false },
        },
      ],
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
          name: '本金',
          type: 'line',
          stack: 'payment',
          areaStyle: { opacity: 0.6 },
          data: principals,
          showSymbol: false,
          lineStyle: { width: 1 },
          itemStyle: { color: '#4caf50' },
        },
        {
          name: '利息',
          type: 'line',
          stack: 'payment',
          areaStyle: { opacity: 0.6 },
          data: interests,
          showSymbol: false,
          lineStyle: { width: 1 },
          itemStyle: { color: '#4f8cff' },
        },
        {
          name: '剩余本金',
          type: 'line',
          yAxisIndex: 1,
          data: remainingLoans,
          showSymbol: false,
          lineStyle: { width: 1.5, type: 'dashed' },
          itemStyle: { color: '#ff9800' },
        },
      ],
    };
  }, [schedule, resolved]);

  return <ReactECharts option={option} style={{ height: 320 }} />;
}
