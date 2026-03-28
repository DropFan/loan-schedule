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
      .map((item) => {
        const shortComment = item.comment
          .replace(/^[\s]*\d{4}-\d{2}-\d{2}/, '')
          .replace(/，.*$/, '')
          .trim();
        return {
          xAxis: item.period,
          label: {
            formatter: shortComment,
            fontSize: 9,
            color: '#ff6b6b',
          },
        };
      });

    return {
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        top: 24,
        right: 10,
        bottom: 40,
        left: 50,
      },
      xAxis: {
        type: 'category',
        data: periods,
        boundaryGap: false,
        axisLabel: {
          fontSize: 10,
          interval: (index: number) => {
            if (index === 0 || index === periods.length - 1) return true;
            const step = Math.ceil(periods.length / 15);
            return index % step === 0;
          },
        },
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
