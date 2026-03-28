import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useLoanStore } from '@/stores/useLoanStore';

export function PaymentTrendChart() {
  const schedule = useLoanStore((s) => s.schedule);

  const option = useMemo(() => {
    const regularItems = schedule.filter((item) => item.period > 0);

    const periods = regularItems.map((item) => item.period);
    const principals = regularItems.map((item) => item.principal);
    const interests = regularItems.map((item) => item.interest);

    const changeMarks = regularItems
      .filter((item) => item.comment !== '')
      .map((item) => ({ xAxis: item.period }));

    return {
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        top: 10,
        right: 10,
        bottom: 40,
        left: 50,
      },
      xAxis: {
        type: 'category',
        data: periods,
        axisLabel: { fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
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
          markLine:
            changeMarks.length > 0
              ? {
                  silent: true,
                  symbol: 'none',
                  lineStyle: { type: 'dashed', color: '#ff6b6b' },
                  data: changeMarks,
                }
              : undefined,
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
      ],
    };
  }, [schedule]);

  if (schedule.length === 0) return null;

  return (
    <ReactECharts
      option={option}
      style={{ height: 200 }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
