import ReactECharts from 'echarts-for-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

import type { SimulateResult } from '../useSimulation';

type SimulateDimension =
  | 'payment'
  | 'remaining'
  | 'cumulative-interest'
  | 'opportunity-cost';

const DIMENSION_LABELS: Record<SimulateDimension, string> = {
  payment: '月供',
  remaining: '剩余贷款',
  'cumulative-interest': '累计利息',
  'opportunity-cost': '机会成本',
};

interface SimulateChartProps {
  originalSchedule: PaymentScheduleItem[];
  simulatedSchedule: PaymentScheduleItem[];
  startPeriod: number;
  onPeriodChange?: (period: number) => void;
  /** 传入模拟结果以绘制机会成本曲线 */
  result?: SimulateResult | null;
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
  onPeriodChange,
  result,
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

    const startIdx = periods.indexOf(startPeriod);
    const isOppCost = dimension === 'opportunity-cost';

    // 机会成本维度：累计利息节省 vs 理财收益 vs 净收益
    if (isOppCost && result?.isValid) {
      const origCum = buildCumulativeInterest(originalSchedule);
      const simCum = buildCumulativeInterest(simulatedSchedule);
      const rate = result.investmentRate / 100 / 12;
      const isMonthly =
        result.monthlyExtraPayment != null && result.monthlyExtraPayment !== 0;
      const monthlyAmt = Math.abs(result.monthlyExtraPayment ?? 0);
      const lumpSum = Math.abs(result.totalInvestment);
      // 较短方案的存续月数（用于月供模式投入期计算）
      const origEnd =
        origRegular.length > 0 ? origRegular[origRegular.length - 1].period : 0;
      const simEnd =
        simRegular.length > 0 ? simRegular[simRegular.length - 1].period : 0;
      const contributionEnd = Math.min(origEnd, simEnd);

      const savedData: number[] = [];
      const investData: number[] = [];
      const netData: number[] = [];
      let cumInvestFV = 0;
      let cumContributions = 0;

      for (const p of periods) {
        const origI = origCum.get(p) ?? origCum.get(p - 1) ?? 0;
        const simI = simCum.get(p) ?? simCum.get(p - 1) ?? 0;
        const saved = Math.round((origI - simI) * 100) / 100;
        savedData.push(saved);

        // 理财收益逐期计算
        if (isMonthly) {
          if (p <= contributionEnd) {
            cumInvestFV = (cumInvestFV + monthlyAmt) * (1 + rate);
            cumContributions += monthlyAmt;
          } else {
            cumInvestFV = cumInvestFV * (1 + rate);
          }
        } else {
          cumInvestFV = lumpSum * ((1 + rate) ** p - 1);
        }
        const investReturn =
          Math.round((cumInvestFV - cumContributions) * 100) / 100;
        investData.push(
          isMonthly ? investReturn : Math.round(cumInvestFV - lumpSum),
        );
        netData.push(
          Math.round(
            (saved - (isMonthly ? investReturn : cumInvestFV - lumpSum)) * 100,
          ) / 100,
        );
      }

      // 交叉点：净收益首次从正变负（理财开始比还贷划算）
      let crossIdx = -1;
      for (let i = 1; i < netData.length; i++) {
        if (netData[i - 1] > 0 && netData[i] <= 0) {
          crossIdx = i;
          break;
        }
      }

      // 构建竖线标记
      const verticalMarks: Array<Record<string, unknown>> = [];
      if (startIdx >= 0) {
        verticalMarks.push({
          xAxis: startIdx,
          lineStyle: { type: 'dashed', color: '#f43f5e', width: 1.5 },
          label: {
            show: true,
            position: 'insideEndTop',
            fontSize: 10,
            color: '#f43f5e',
            formatter: '模拟起点',
          },
        });
      }
      // 回本点
      if (result.paybackMonths != null) {
        const paybackIdx = periods.indexOf(result.paybackMonths);
        if (paybackIdx >= 0) {
          verticalMarks.push({
            xAxis: paybackIdx,
            lineStyle: { type: 'dashed', color: '#4caf50', width: 1.5 },
            label: {
              show: true,
              position: 'insideEndTop',
              fontSize: 10,
              color: '#4caf50',
              formatter: `回本 第${result.paybackMonths}期`,
            },
          });
        }
      }
      // 模拟方案结清
      if (simEnd > 0 && simEnd < origEnd) {
        const simEndIdx = periods.indexOf(simEnd);
        if (simEndIdx >= 0) {
          verticalMarks.push({
            xAxis: simEndIdx,
            lineStyle: { type: 'dashed', color: '#ff9800', width: 1.5 },
            label: {
              show: true,
              position: 'insideEndBottom',
              fontSize: 10,
              color: '#ff9800',
              formatter: '贷款结清',
            },
          });
        }
      }
      // 交叉点
      if (crossIdx >= 0) {
        verticalMarks.push({
          xAxis: crossIdx,
          lineStyle: { type: 'solid', color: '#e040fb', width: 1.5 },
          label: {
            show: true,
            position: 'insideEndBottom',
            fontSize: 10,
            color: '#e040fb',
            formatter: `交叉 第${periods[crossIdx]}期`,
          },
        });
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
            const period = periods[params[0].dataIndex];
            const date = origMap.get(period)?.paymentDate ?? '';
            let html = `<b>第 ${period} 期</b> ${date}`;
            for (const p of params) {
              html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ${fmtAmt(p.value)}`;
            }
            return html;
          },
        },
        legend: { bottom: 35, textStyle: { color: textColor, fontSize: 11 } },
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
            name: '累计利息节省',
            type: 'line',
            data: savedData,
            showSymbol: false,
            lineStyle: { width: 2, color: '#4caf50' },
            itemStyle: { color: '#4caf50' },
            markLine:
              verticalMarks.length > 0
                ? {
                    silent: true,
                    symbol: 'none',
                    data: verticalMarks,
                  }
                : undefined,
          },
          {
            name: '理财预期收益',
            type: 'line',
            data: investData,
            showSymbol: false,
            lineStyle: { width: 2, color: '#ff9800' },
            itemStyle: { color: '#ff9800' },
          },
          {
            name: '净收益（还贷-理财）',
            type: 'line',
            data: netData,
            showSymbol: false,
            lineStyle: { width: 2, type: 'dashed', color: '#4f8cff' },
            itemStyle: { color: '#4f8cff' },
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { type: 'solid', color: isDark ? '#555' : '#ccc' },
              label: { show: false },
              data: [{ yAxis: 0 }],
            },
          },
        ],
      };
    }

    // 常规维度
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
          const origItem = origMap.get(period);
          const simItem = simMap.get(period);

          let html = `<b>第 ${period} 期`;
          if (origItem) html += `（${origItem.paymentDate}）`;
          html += '</b>';

          if (origItem) {
            html += `<br/>剩余本金: ${fmtAmt(origItem.remainingLoan)}`;
            html += ` | 利率: ${origItem.annualInterestRate}%`;
          }

          for (const p of params) {
            if (p.value != null) {
              html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ${fmtAmt(Number(p.value))}`;
            }
          }
          const origVal = params.find(
            (p) => p.seriesName === '当前方案',
          )?.value;
          const simVal = params.find((p) => p.seriesName === '模拟方案')?.value;
          if (origVal != null && simVal != null) {
            const diff = Number(simVal) - Number(origVal);
            const sign = diff >= 0 ? '+' : '';
            html += `<br/><span style="color:#999">差异: ${sign}${fmtAmt(diff)}</span>`;
          }
          if (origItem && !simItem) {
            html += '<br/><span style="color:#4f8cff">模拟方案已还清</span>';
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
  }, [
    originalSchedule,
    simulatedSchedule,
    startPeriod,
    dimension,
    resolved,
    result,
  ]);

  // 画布级别点击：点击图表任意位置，将像素坐标转换为期数
  const chartRef = useRef<ReactECharts>(null);
  const onPeriodChangeRef = useRef(onPeriodChange);
  onPeriodChangeRef.current = onPeriodChange;

  const bindZrClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: ECharts instance type is complex
    (chart: any) => {
      if (!onPeriodChangeRef.current) return;
      chart.getZr().on('click', (e: { offsetX: number; offsetY: number }) => {
        // 只处理绘图区域内的点击，不拦截图例/dataZoom 等
        if (!chart.containPixel('grid', [e.offsetX, e.offsetY])) return;
        const point = chart.convertFromPixel({ seriesIndex: 0 }, [
          e.offsetX,
          e.offsetY,
        ]);
        if (!point) return;
        const period = Math.round(point[0]) + 1;
        if (period >= 1 && onPeriodChangeRef.current) {
          onPeriodChangeRef.current(period);
        }
      });
    },
    [],
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* 维度切换 */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(Object.keys(DIMENSION_LABELS) as SimulateDimension[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDimension(d)}
            className={`px-3 py-1 text-xs rounded-md border transition-colors ${
              dimension === d
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:bg-muted/10'
            }`}
          >
            {DIMENSION_LABELS[d]}
          </button>
        ))}
      </div>

      <ReactECharts
        ref={chartRef}
        option={option}
        notMerge
        style={{
          height: 350,
          cursor: onPeriodChange ? 'crosshair' : undefined,
        }}
        onChartReady={bindZrClick}
      />
    </div>
  );
}
