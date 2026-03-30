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
    const payments = regularItems.map((item) => item.monthlyPayment);
    const remainingLoans = regularItems.map((item) => item.remainingLoan);

    // 累计已还（含 period=0 的提前还款行）
    const cumPrincipal: number[] = [];
    const cumInterest: number[] = [];
    let sumP = 0;
    let sumI = 0;
    let regIdx = 0;
    for (const row of schedule) {
      sumP += row.principal;
      sumI += row.interest;
      if (row.period > 0) {
        cumPrincipal[regIdx] = Math.round(sumP * 100) / 100;
        cumInterest[regIdx] = Math.round(sumI * 100) / 100;
        regIdx++;
      }
    }

    const fmtAmt = (v: number) =>
      `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 变更线（含提前还款 period=0 映射到下一常规期）
    const changeMarks: Array<{ xAxis: number }> = [];
    let pendingPrepay = false;
    for (const item of schedule) {
      if (item.period === 0 && item.comment !== '') {
        pendingPrepay = true;
        continue;
      }
      if (item.period > 0) {
        const idx = periods.indexOf(item.period);
        if (idx === -1) continue;
        if (pendingPrepay) {
          changeMarks.push({ xAxis: idx });
          pendingPrepay = false;
        } else if (item.comment !== '') {
          changeMarks.push({ xAxis: idx });
        }
      }
    }

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
          const item = regularItems[idx];
          if (!item) return '';
          let html = `<b>第 ${item.period} 期</b> ${item.paymentDate}`;
          html += `<br/><span style="color:#666">●</span> 月供: ${fmtAmt(item.monthlyPayment)}`;
          for (const p of params) {
            html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ${fmtAmt(Number(p.value))}`;
          }
          html += `<br/><span style="color:#999">●</span> 利率: ${item.annualInterestRate}%`;
          html += `<br/><span style="color:#999">●</span> 剩余期数: ${item.remainingTerm} 期`;
          html += '<br/>──────────';
          html += `<br/>累计已还本金: ${fmtAmt(cumPrincipal[idx] ?? 0)}`;
          html += `<br/>累计已还利息: ${fmtAmt(cumInterest[idx] ?? 0)}`;
          html += `<br/>累计已还总额: ${fmtAmt((cumPrincipal[idx] ?? 0) + (cumInterest[idx] ?? 0))}`;
          if (item.comment) {
            const detail = item.comment
              .replace(/^[\s]*\d{4}-\d{2}-\d{2}/, '')
              .trim();
            if (detail)
              html += `<br/><span style="color:#ff6b6b">●</span> <b>${detail}</b>`;
          }
          return html;
        },
      },
      legend: {
        bottom: 35,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: { top: 10, right: 55, bottom: 75, left: 55 },
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
        {
          name: '月供',
          type: 'line',
          data: payments,
          showSymbol: false,
          lineStyle: { width: 1.5 },
          itemStyle: { color: '#e040fb' },
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
