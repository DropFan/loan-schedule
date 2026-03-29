import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useLoanStore } from '@/stores/useLoanStore';

export function PaymentTrendChart() {
  const schedule = useLoanStore((s) => s.schedule);
  const { resolved: themeMode } = useTheme();

  const option = useMemo(() => {
    const isDark = themeMode === 'dark';
    const textColor = isDark ? '#ccc' : '#666';
    const subTextColor = isDark ? '#999' : '#999';
    const tooltipBg = isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)';
    const tooltipBorder = isDark ? '#555' : '#ddd';
    const tooltipTextColor = isDark ? '#eee' : '#333';
    const axisLineColor = isDark ? '#444' : '#ddd';

    const regularItems = schedule.filter((item) => item.period > 0);

    const periods = regularItems.map((item) => item.period);
    const principals = regularItems.map((item) => item.principal);
    const interests = regularItems.map((item) => item.interest);

    // 收集变更信息（含 period=0 的提前还款行，标记到其下一个常规期）
    const changeDetailByIndex = new Map<number, string>();
    const changeMarks: Array<{ xAxis: number }> = [];
    let pendingPrepayComment = '';

    for (const item of schedule) {
      if (item.period === 0 && item.comment !== '') {
        pendingPrepayComment = item.comment
          .replace(/^[\s]*\d{4}-\d{2}-\d{2}/, '')
          .trim();
        continue;
      }
      if (item.period > 0) {
        const idx = periods.indexOf(item.period);
        if (idx === -1) continue;

        if (pendingPrepayComment) {
          changeDetailByIndex.set(idx, pendingPrepayComment);
          changeMarks.push({ xAxis: idx });
          pendingPrepayComment = '';
        } else if (item.comment !== '') {
          const detail = item.comment
            .replace(/^[\s]*\d{4}-\d{2}-\d{2}/, '')
            .trim();
          changeDetailByIndex.set(idx, detail);
          changeMarks.push({ xAxis: idx });
        }
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipTextColor, fontSize: 12 },
        formatter: (
          params: Array<{
            dataIndex: number;
            axisValue: string;
            seriesName: string;
            value: number;
            color: string;
          }>,
        ) => {
          if (!params.length) return '';
          const index = params[0].dataIndex;
          const item = regularItems[index];
          if (!item) return '';

          let html = `<b>第 ${item.period} 期</b> ${item.paymentDate}`;
          html += `<br/><span style="color:${subTextColor}">●</span> 月供: ¥${item.monthlyPayment.toFixed(2)}`;
          for (const p of params) {
            html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ¥${Number(p.value).toFixed(2)}`;
          }
          html += `<br/><span style="color:${subTextColor}">●</span> 剩余本金: ¥${item.remainingLoan.toFixed(2)}`;
          html += `<br/><span style="color:${subTextColor}">●</span> 利率: ${item.annualInterestRate}%`;
          const detail = changeDetailByIndex.get(index);
          if (detail) {
            html += `<br/><span style="color:#ff6b6b">●</span> <b>${detail}</b>`;
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
          color: textColor,
          interval: (index: number) => {
            if (index === 0 || index === periods.length - 1) return true;
            const step = Math.ceil(periods.length / 15);
            return index % step === 0;
          },
        },
        axisLine: { lineStyle: { color: axisLineColor } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: textColor },
        splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
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
  }, [schedule, themeMode]);

  if (schedule.length === 0) return null;

  return (
    <ReactECharts
      option={option}
      style={{ height: 200 }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
