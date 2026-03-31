import ReactECharts from 'echarts-for-react';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';
import {
  type SimulateInput,
  simulateLumpSumOnce,
  simulateMonthlyAdjustOnce,
} from '../useSimulation';

interface Props {
  schedule: PaymentScheduleItem[];
  params: LoanParameters;
  input: SimulateInput;
  currentMonthlyPayment: number;
  onApply: (patch: Partial<SimulateInput>) => void;
}

interface SamplePoint {
  amount: number;
  interestSaved: number;
  termReduced: number;
}

interface Recommendation {
  label: string;
  description: string;
  patch: Partial<SimulateInput>;
}

function fmtWan(v: number): string {
  return `${(v / 10000).toFixed(1)}万`;
}

function fmtMoney(v: number): string {
  return `¥${Math.abs(v).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function findMarginalBest(pts: SamplePoint[]): SamplePoint | null {
  if (pts.length < 3) return null;
  let bestIdx = 1;
  let maxDrop = 0;
  for (let i = 2; i < pts.length; i++) {
    const prev = pts[i - 1].interestSaved - pts[i - 2].interestSaved;
    const curr = pts[i].interestSaved - pts[i - 1].interestSaved;
    const drop = prev - curr;
    if (drop > maxDrop) {
      maxDrop = drop;
      bestIdx = i - 1;
    }
  }
  return pts[bestIdx];
}

function useLumpSumAnalysis(
  schedule: PaymentScheduleItem[],
  params: LoanParameters,
  input: SimulateInput,
) {
  return useMemo(() => {
    const lumpSumPeriod = input.lumpSumPeriod ?? 1;
    const strategy = input.lumpSumStrategy ?? 'shorten-term';

    const regularItems = schedule.filter((s) => s.period > 0);
    const periodMap = new Map(regularItems.map((s) => [s.period, s]));
    const targetItem = periodMap.get(lumpSumPeriod);
    if (!targetItem) return { samples: [], recommendations: [] };

    const maxAmount = targetItem.remainingLoan * 0.8;
    const sampleCount = 20;
    const step = Math.floor(maxAmount / sampleCount / 10000) * 10000;
    if (step <= 0) return { samples: [], recommendations: [] };

    const pts: SamplePoint[] = [];
    for (let i = 1; i <= sampleCount; i++) {
      const amount = step * i;
      const r = simulateLumpSumOnce(
        schedule,
        params,
        amount,
        lumpSumPeriod,
        strategy,
      );
      if (r) pts.push({ amount, ...r });
    }

    const recs: Recommendation[] = [];

    const y1 = pts.find((p) => p.termReduced >= 12);
    if (y1) {
      recs.push({
        label: '缩短 1 年',
        description: `还 ${fmtWan(y1.amount)}，节省利息 ${fmtMoney(y1.interestSaved)}`,
        patch: { lumpSumAmount: y1.amount },
      });
    }

    const y3 = pts.find((p) => p.termReduced >= 36);
    if (y3) {
      recs.push({
        label: '缩短 3 年',
        description: `还 ${fmtWan(y3.amount)}，节省利息 ${fmtMoney(y3.interestSaved)}`,
        patch: { lumpSumAmount: y3.amount },
      });
    }

    const best = findMarginalBest(pts);
    if (best && !recs.some((r) => r.patch.lumpSumAmount === best.amount)) {
      recs.push({
        label: '边际最优',
        description: `还 ${fmtWan(best.amount)}，性价比最高`,
        patch: { lumpSumAmount: best.amount },
      });
    }

    return { samples: pts, recommendations: recs };
  }, [schedule, params, input.lumpSumPeriod, input.lumpSumStrategy]);
}

function useMonthlyAdjustAnalysis(
  schedule: PaymentScheduleItem[],
  input: SimulateInput,
  currentMonthlyPayment: number,
) {
  return useMemo(() => {
    const startPeriod = input.startPeriod ?? 1;

    // 采样范围：-50% ~ +200% 月供
    const negMax = Math.round(currentMonthlyPayment * 0.5);
    const posMax = Math.round(currentMonthlyPayment * 2);
    const step = Math.max(Math.floor(posMax / 15 / 100) * 100, 100);

    const pts: SamplePoint[] = [];

    // 负方向采样（减少月供）
    for (let amount = -negMax; amount < 0; amount += step) {
      if (amount === 0) continue;
      const r = simulateMonthlyAdjustOnce(schedule, amount, startPeriod);
      if (r) pts.push({ amount, ...r });
    }

    // 正方向采样（增加月供）
    for (let amount = step; amount <= posMax; amount += step) {
      const r = simulateMonthlyAdjustOnce(schedule, amount, startPeriod);
      if (r) pts.push({ amount, ...r });
    }

    // 按 amount 排序
    pts.sort((a, b) => a.amount - b.amount);

    const recs: Recommendation[] = [];

    // 增加方向推荐
    const positivePts = pts.filter((p) => p.amount > 0);
    const y1 = positivePts.find((p) => p.termReduced >= 12);
    if (y1) {
      recs.push({
        label: '提前 1 年',
        description: `月供 +${y1.amount}，节省 ${fmtMoney(y1.interestSaved)}`,
        patch: { monthlyAdjust: y1.amount },
      });
    }

    const y3 = positivePts.find((p) => p.termReduced >= 36);
    if (y3) {
      recs.push({
        label: '提前 3 年',
        description: `月供 +${y3.amount}，节省 ${fmtMoney(y3.interestSaved)}`,
        patch: { monthlyAdjust: y3.amount },
      });
    }

    // 减少方向推荐：找到一个合理的减少点
    const negativePts = pts.filter((p) => p.amount < 0);
    if (negativePts.length > 0) {
      // 取减少幅度最大但利息增加可控（<20%原利息）的点
      const origInterest =
        pts.length > 0 ? Math.abs(positivePts[0]?.interestSaved ?? 0) : 0;
      const moderate = [...negativePts]
        .reverse()
        .find((p) => Math.abs(p.interestSaved) < origInterest * 2);
      if (moderate) {
        recs.push({
          label: '减少月供',
          description: `月供 ${moderate.amount}，多付 ${fmtMoney(moderate.interestSaved)} 利息`,
          patch: { monthlyAdjust: moderate.amount },
        });
      }
    }

    return { samples: pts, recommendations: recs };
  }, [schedule, input.startPeriod, currentMonthlyPayment]);
}

export function SmartAnalysis({
  schedule,
  params,
  input,
  currentMonthlyPayment,
  onApply,
}: Props) {
  const [open, setOpen] = useState(true);
  const { resolved } = useTheme();

  const isLumpSum = input.mode === 'lump-sum';

  const lumpSumData = useLumpSumAnalysis(schedule, params, input);
  const monthlyAdjustData = useMonthlyAdjustAnalysis(
    schedule,
    input,
    currentMonthlyPayment,
  );

  const { samples, recommendations } = isLumpSum
    ? lumpSumData
    : monthlyAdjustData;

  const currentAmount = isLumpSum
    ? (input.lumpSumAmount ?? 0)
    : (input.monthlyAdjust ?? 0);

  const xAxisLabel = isLumpSum ? '提前还款金额' : '月供调整额';

  const option = useMemo(() => {
    if (samples.length === 0) return null;
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    const currentIdx = samples.findIndex((s) =>
      isLumpSum ? s.amount >= currentAmount : s.amount === currentAmount,
    );
    // 对于调整月供，找最近的采样点
    const nearestIdx =
      currentIdx >= 0
        ? currentIdx
        : samples.reduce(
            (best, s, i) =>
              Math.abs(s.amount - currentAmount) <
              Math.abs(samples[best].amount - currentAmount)
                ? i
                : best,
            0,
          );

    const xLabels = samples.map((s) =>
      isLumpSum ? fmtWan(s.amount) : `${s.amount > 0 ? '+' : ''}${s.amount}`,
    );

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          ps: Array<{
            seriesName: string;
            value: number;
            axisValue: string;
          }>,
        ) => {
          if (!ps.length) return '';
          let html = `<b>${xAxisLabel}: ${ps[0].axisValue}${isLumpSum ? '' : ' 元'}</b>`;
          for (const p of ps) {
            html += `<br/>${p.seriesName}: ${
              p.seriesName === '缩短期数'
                ? `${p.value} 期`
                : `¥${p.value.toLocaleString()}`
            }`;
          }
          return html;
        },
      },
      legend: {
        bottom: 5,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: { top: 10, right: 60, bottom: 40, left: 60 },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: {
          fontSize: 10,
          color: textColor,
          rotate: isLumpSum ? 30 : 30,
        },
        axisLine: { lineStyle: { color: isDark ? '#444' : '#ddd' } },
      },
      yAxis: [
        {
          type: 'value',
          name: '节省利息',
          nameTextStyle: { color: textColor, fontSize: 10 },
          axisLabel: { fontSize: 10, color: textColor },
          splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
        },
        {
          type: 'value',
          name: '缩短期数',
          nameTextStyle: { color: textColor, fontSize: 10 },
          axisLabel: { fontSize: 10, color: textColor },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '节省利息',
          type: 'line',
          data: samples.map((s) => s.interestSaved),
          showSymbol: false,
          lineStyle: { width: 2, color: '#4f8cff' },
          itemStyle: { color: '#4f8cff' },
          markLine:
            currentAmount !== 0 && nearestIdx >= 0
              ? {
                  silent: true,
                  symbol: 'none',
                  lineStyle: {
                    type: 'dashed',
                    color: '#f43f5e',
                    width: 1.5,
                  },
                  label: {
                    show: true,
                    position: 'insideEndTop',
                    fontSize: 10,
                    color: '#f43f5e',
                    formatter: '当前',
                  },
                  data: [{ xAxis: nearestIdx }],
                }
              : undefined,
        },
        {
          name: '缩短期数',
          type: 'line',
          yAxisIndex: 1,
          data: samples.map((s) => s.termReduced),
          showSymbol: false,
          lineStyle: { width: 2, color: '#ff9800' },
          itemStyle: { color: '#ff9800' },
        },
      ],
    };
  }, [samples, resolved, currentAmount, isLumpSum, xAxisLabel]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/20 transition-colors"
      >
        智能分析
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {option ? (
            <ReactECharts option={option} notMerge style={{ height: 300 }} />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {isLumpSum ? '请先选择还款期数' : '请先设置开始期数'}
            </p>
          )}

          {recommendations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {recommendations.map((rec) => (
                <button
                  key={rec.label}
                  type="button"
                  onClick={() => onApply(rec.patch)}
                  className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <p className="text-xs font-semibold text-primary">
                    {rec.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rec.description}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
