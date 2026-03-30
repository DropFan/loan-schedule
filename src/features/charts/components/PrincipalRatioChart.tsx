import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  schedule: PaymentScheduleItem[];
}

export function PrincipalRatioChart({ schedule }: Props) {
  const { resolved } = useTheme();

  const option = useMemo(() => {
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    const regularItems = schedule.filter((item) => item.period > 0);
    if (regularItems.length === 0) return null;

    const periods = regularItems.map((item) => item.period);
    const ratios = regularItems.map((item) =>
      item.monthlyPayment > 0
        ? Math.round((item.principal / item.monthlyPayment) * 10000) / 100
        : 0,
    );

    // 找交叉点：首个 ratio >= 50 的索引
    let crossIdx = -1;
    for (let i = 0; i < ratios.length; i++) {
      if (ratios[i] >= 50) {
        crossIdx = i;
        break;
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          params: Array<{
            dataIndex: number;
            value: number;
            color: string;
          }>,
        ) => {
          if (!params.length) return '';
          const idx = params[0].dataIndex;
          const item = regularItems[idx];
          if (!item) return '';
          const ratio = ratios[idx];
          return `<b>第 ${item.period} 期</b> ${item.paymentDate}<br/><span style="color:${params[0].color}">●</span> 本金占比: ${ratio.toFixed(2)}%<br/>月供: ¥${item.monthlyPayment.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>本金: ¥${item.principal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>利息: ¥${item.interest.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },
      },
      grid: { top: 20, right: 20, bottom: 60, left: 50 },
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
        min: 0,
        max: 100,
        axisLabel: {
          fontSize: 10,
          color: textColor,
          formatter: '{value}%',
        },
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
          name: '本金占比',
          type: 'line',
          data: ratios,
          showSymbol: false,
          lineStyle: { width: 2 },
          itemStyle: { color: '#4caf50' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: isDark ? 'rgba(76,175,80,0.3)' : 'rgba(76,175,80,0.2)',
                },
                { offset: 1, color: 'rgba(76,175,80,0)' },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: isDark ? '#888' : '#aaa' },
            label: {
              position: 'insideEndTop',
              fontSize: 10,
              color: textColor,
              formatter: '本息相等',
            },
            data: [{ yAxis: 50 }],
          },
          markPoint:
            crossIdx >= 0
              ? {
                  symbol: 'circle',
                  symbolSize: 10,
                  label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: textColor,
                    formatter: `第${periods[crossIdx]}期`,
                  },
                  itemStyle: { color: '#ff5722' },
                  data: [{ coord: [crossIdx, ratios[crossIdx]] }],
                }
              : undefined,
        },
      ],
    };
  }, [schedule, resolved]);

  if (!option) return null;

  return <ReactECharts option={option} style={{ height: 300 }} />;
}
