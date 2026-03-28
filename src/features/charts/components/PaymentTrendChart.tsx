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

    // 变更信息：key 是数组索引，value 是变更描述
    const changeDetailByIndex = new Map<number, string>();
    const changeMarks: Array<{ xAxis: number }> = [];
    for (let i = 0; i < regularItems.length; i++) {
      const item = regularItems[i];
      if (item.comment !== '') {
        const detail = item.comment.replace(/^[\s]*\d{4}-\d{2}-\d{2}/, '').trim();
        changeDetailByIndex.set(i, detail);
        changeMarks.push({ xAxis: i });
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (params: Array<{ dataIndex: number; axisValue: string; seriesName: string; value: number; color: string }>) => {
          if (!params.length) return '';
          const index = params[0].dataIndex;
          const period = params[0].axisValue;
          let html = `<b>第 ${period} 期</b>`;
          for (const p of params) {
            html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ¥${Number(p.value).toFixed(2)}`;
          }
          const detail = changeDetailByIndex.get(index);
          if (detail) {
            html += `<br/><span style="color:#ff6b6b">┃</span> <b>${detail}</b>`;
          }
          return html;
        },
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
                  label: {
                    show: true,
                    position: 'insideEndBottom',
                    fontSize: 8,
                    color: '#ff6b6b',
                    formatter: (params: { value: number }) => {
                      const period = periods[params.value] ?? params.value;
                      return `${period}期`;
                    },
                  },
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
