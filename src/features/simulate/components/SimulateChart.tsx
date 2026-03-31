import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

type SimulateDimension = 'payment' | 'remaining' | 'cumulative-interest';

const DIMENSION_LABELS: Record<SimulateDimension, string> = {
  payment: '月供',
  remaining: '剩余贷款',
  'cumulative-interest': '累计利息',
};

interface SimulateChartProps {
  originalSchedule: PaymentScheduleItem[];
  simulatedSchedule: PaymentScheduleItem[];
  startPeriod: number;
}

function buildCumulativeInterest(
  schedule: PaymentScheduleItem[],
): Map<number, number> {
  const map = new Map<number, number>();
  let cum = 0;
  for (const item of schedule) {
    cum += item.interest;
    if (item.period > 0) {
      map.set(item.period, cum);
    }
  }
  return map;
}

export function SimulateChart({
  originalSchedule,
  simulatedSchedule,
  startPeriod,
}: SimulateChartProps) {
  const { resolved } = useTheme();
  const [dimension, setDimension] = useState<SimulateDimension>('payment');

  const option = useMemo(() => {
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    const origRegular = originalSchedule.filter((s) => s.period > 0);
    const simRegular = simulatedSchedule.filter((s) => s.period > 0);

    const maxPeriod = Math.max(
      origRegular.length > 0 ? origRegular[origRegular.length - 1].period : 0,
      simRegular.length > 0 ? simRegular[simRegular.length - 1].period : 0,
    );
    const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

    const origMap = new Map(origRegular.map((item) => [item.period, item]));
    const simMap = new Map(simRegular.map((item) => [item.period, item]));

    const fmtAmt = (v: number) =>
      `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    let origData: (number | null)[];
    let simData: (number | null)[];

    if (dimension === 'payment') {
      origData = periods.map((p) => origMap.get(p)?.monthlyPayment ?? null);
      simData = periods.map((p) => simMap.get(p)?.monthlyPayment ?? null);
    } else if (dimension === 'remaining') {
      origData = periods.map((p) => origMap.get(p)?.remainingLoan ?? null);
      simData = periods.map((p) => simMap.get(p)?.remainingLoan ?? null);
    } else {
      const origCum = buildCumulativeInterest(originalSchedule);
      const simCum = buildCumulativeInterest(simulatedSchedule);
      origData = periods.map((p) => origCum.get(p) ?? null);
      simData = periods.map((p) => simCum.get(p) ?? null);
    }

    // 找到模拟起始期在 X 轴中的索引
    const startIdx = periods.indexOf(startPeriod);

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          params: Array<{
            dataIndex: number;
            seriesName: string;
            value: number | null;
            color: string;
          }>,
        ) => {
          if (!params.length) return '';
          const idx = params[0].dataIndex;
          const period = periods[idx];
          let html = `<b>第 ${period} 期</b>`;
          for (const p of params) {
            if (p.value != null) {
              html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ${fmtAmt(Number(p.value))}`;
            }
          }
          // 差异
          const origVal = params.find(
            (p) => p.seriesName === '当前方案',
          )?.value;
          const simVal = params.find((p) => p.seriesName === '模拟方案')?.value;
          if (origVal != null && simVal != null) {
            const diff = Number(simVal) - Number(origVal);
            const sign = diff >= 0 ? '+' : '';
            html += `<br/><span style="color:#999">差异: ${sign}${fmtAmt(diff)}</span>`;
          }
          return html;
        },
      },
      legend: {
        bottom: 35,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: { top: 10, right: 20, bottom: 75, left: 60 },
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
        axisLabel: { fontSize: 10, color: textColor },
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
          name: '当前方案',
          type: 'line',
          data: origData,
          showSymbol: false,
          lineStyle: { width: 2, type: 'dashed', color: '#999' },
          itemStyle: { color: '#999' },
          connectNulls: false,
        },
        {
          name: '模拟方案',
          type: 'line',
          data: simData,
          showSymbol: false,
          lineStyle: { width: 2, color: '#4f8cff' },
          itemStyle: { color: '#4f8cff' },
          connectNulls: false,
          markLine:
            startIdx >= 0
              ? {
                  silent: true,
                  symbol: 'none',
                  lineStyle: { type: 'dashed', color: '#f43f5e', width: 1.5 },
                  label: {
                    show: true,
                    position: 'insideEndTop',
                    fontSize: 10,
                    color: '#f43f5e',
                    formatter: '模拟起点',
                  },
                  data: [{ xAxis: startIdx }],
                }
              : undefined,
        },
      ],
    };
  }, [originalSchedule, simulatedSchedule, startPeriod, dimension, resolved]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* 维度切换 */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(Object.keys(DIMENSION_LABELS) as SimulateDimension[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDimension(d)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              dimension === d
                ? 'bg-primary text-white'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {DIMENSION_LABELS[d]}
          </button>
        ))}
      </div>

      <ReactECharts option={option} notMerge style={{ height: 350 }} />
    </div>
  );
}
