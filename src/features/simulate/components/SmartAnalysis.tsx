import ReactECharts from 'echarts-for-react';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calcScheduleSummary } from '@/core/calculator/LoanCalculator';
import type {
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { roundTo2 } from '@/core/utils/formatHelper';
import { useTheme } from '@/hooks/useTheme';
import {
  type SimulateInput,
  simulateLumpSumFast,
  simulateNewMonthlyOnce,
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

interface TimePointAnalysis {
  period: number;
  paymentDate: string;
  remainingLoan: number;
  annualInterestRate: number;
  bestAmount: number;
  bestInterestSaved: number;
  bestTermReduced: number;
  samples: SamplePoint[];
}

interface Recommendation {
  type: 'global-best' | 'best-ratio' | 'easy';
  label: string;
  description: string;
  patch: Partial<SimulateInput>;
}

interface AnalysisMatrix {
  timePoints: TimePointAnalysis[];
  recommendations: Recommendation[];
}

function fmtWan(v: number): string {
  return `${(v / 10000).toFixed(1)}万`;
}

function fmtMoney(v: number): string {
  return `¥${Math.abs(v).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** 在采样序列中找到边际收益递减的拐点（二阶差分最大下降处） */
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

/** 生成等间隔时间点采样序列（从用户选定的起始期开始，10-15 个点） */
function sampleTimePeriods(
  schedule: PaymentScheduleItem[],
  startPeriod: number,
): number[] {
  const regular = schedule.filter(
    (s) => s.period > 0 && s.period >= startPeriod,
  );
  if (regular.length === 0) return [];

  const first = regular[0].period;
  const last = regular[regular.length - 1].period;
  const total = last - first + 1;
  if (total <= 15) return regular.map((s) => s.period);

  const count = 12;
  const step = Math.max(Math.floor(total / count), 1);
  const periods: number[] = [];
  for (let p = first; p <= last; p += step) {
    periods.push(p);
  }
  if (periods[periods.length - 1] !== last) {
    periods.push(last);
  }
  return periods;
}

function buildRecommendations(
  timePoints: TimePointAnalysis[],
  isLumpSum: boolean,
  periodMap: Map<number, PaymentScheduleItem>,
): Recommendation[] {
  if (timePoints.length === 0) return [];

  const recs: Recommendation[] = [];

  // 1. 全局最优：节省利息最大
  let globalBest: { tp: TimePointAnalysis; sp: SamplePoint } | null = null;
  for (const tp of timePoints) {
    for (const sp of tp.samples) {
      if (!globalBest || sp.interestSaved > globalBest.sp.interestSaved) {
        globalBest = { tp, sp };
      }
    }
  }
  if (globalBest && globalBest.sp.interestSaved > 0) {
    const { tp, sp } = globalBest;
    recs.push({
      type: 'global-best',
      label: '全局最优',
      description: isLumpSum
        ? `第${tp.period}期还${fmtWan(sp.amount)}，节省${fmtMoney(sp.interestSaved)}利息，缩短${sp.termReduced}期`
        : `第${tp.period}期起月供${sp.amount}，节省${fmtMoney(sp.interestSaved)}`,
      patch: isLumpSum
        ? { lumpSumPeriod: tp.period, lumpSumAmount: sp.amount }
        : { startPeriod: tp.period, newMonthly: sp.amount },
    });
  }

  // 2. 性价比最优：各时间点边际最优金额中，ratio 最高的
  let bestRatio: {
    tp: TimePointAnalysis;
    ratio: number;
  } | null = null;
  for (const tp of timePoints) {
    if (tp.bestInterestSaved <= 0 || tp.bestAmount <= 0) continue;
    const ratio = tp.bestInterestSaved / tp.bestAmount;
    if (!bestRatio || ratio > bestRatio.ratio) {
      bestRatio = { tp, ratio };
    }
  }
  if (bestRatio) {
    const { tp, ratio } = bestRatio;
    const per10k = Math.round(ratio * 10000);
    const dupGlobal =
      globalBest &&
      tp.period === globalBest.tp.period &&
      tp.bestAmount === globalBest.sp.amount;
    if (!dupGlobal) {
      recs.push({
        type: 'best-ratio',
        label: '性价比最优',
        description: isLumpSum
          ? `第${tp.period}期还${fmtWan(tp.bestAmount)}，每万元节省${fmtMoney(per10k)}利息`
          : `第${tp.period}期起月供${tp.bestAmount}，每万元增量节省${fmtMoney(per10k)}`,
        patch: isLumpSum
          ? { lumpSumPeriod: tp.period, lumpSumAmount: tp.bestAmount }
          : { startPeriod: tp.period, newMonthly: tp.bestAmount },
      });
    }
  }

  // 3. 轻松方案：金额 ≤ 剩余本金 20%（一次性）或增幅 ≤ 20%（月供），节省最大
  let easyBest: { tp: TimePointAnalysis; sp: SamplePoint } | null = null;
  for (const tp of timePoints) {
    const item = periodMap.get(tp.period);
    if (!item) continue;
    for (const sp of tp.samples) {
      if (sp.interestSaved <= 0) continue;
      const withinLimit = isLumpSum
        ? sp.amount <= item.remainingLoan * 0.2
        : sp.amount <= item.monthlyPayment * 1.2;
      if (!withinLimit) continue;
      if (!easyBest || sp.interestSaved > easyBest.sp.interestSaved) {
        easyBest = { tp, sp };
      }
    }
  }
  if (easyBest) {
    const { tp, sp } = easyBest;
    const dupPrev = recs.some((r) =>
      isLumpSum
        ? r.patch.lumpSumPeriod === tp.period &&
          r.patch.lumpSumAmount === sp.amount
        : r.patch.startPeriod === tp.period && r.patch.newMonthly === sp.amount,
    );
    if (!dupPrev) {
      recs.push({
        type: 'easy',
        label: '轻松方案',
        description: isLumpSum
          ? `第${tp.period}期还${fmtWan(sp.amount)}，节省${fmtMoney(sp.interestSaved)}，压力小`
          : `第${tp.period}期起月供${sp.amount}，节省${fmtMoney(sp.interestSaved)}`,
        patch: isLumpSum
          ? { lumpSumPeriod: tp.period, lumpSumAmount: sp.amount }
          : { startPeriod: tp.period, newMonthly: sp.amount },
      });
    }
  }

  return recs;
}

function useAnalysisMatrix(
  schedule: PaymentScheduleItem[],
  _params: LoanParameters,
  input: SimulateInput,
  currentMonthlyPayment: number,
): AnalysisMatrix {
  return useMemo(() => {
    const isLumpSum = input.mode === 'lump-sum';
    const userPeriod = isLumpSum
      ? (input.lumpSumPeriod ?? 1)
      : (input.startPeriod ?? 1);
    const periods = sampleTimePeriods(schedule, userPeriod);
    if (periods.length === 0) return { timePoints: [], recommendations: [] };

    const regularItems = schedule.filter((s) => s.period > 0);
    const periodMap = new Map(regularItems.map((s) => [s.period, s]));
    const originalSummary = calcScheduleSummary(schedule);
    const precomputed = { periodMap, originalSummary };

    const timePoints: TimePointAnalysis[] = [];

    for (const period of periods) {
      const item = periodMap.get(period);
      if (!item) continue;

      let samples: SamplePoint[];

      if (isLumpSum) {
        const maxAmount = item.remainingLoan * 0.8;
        const sampleCount = 12;
        const step = Math.floor(maxAmount / sampleCount / 10000) * 10000;
        if (step <= 0) continue;

        samples = [];
        for (let i = 1; i <= sampleCount; i++) {
          const amount = step * i;
          const r = simulateLumpSumFast(schedule, amount, period, precomputed);
          if (r) samples.push({ amount, ...r });
        }
      } else {
        const cur = roundTo2(currentMonthlyPayment);
        const sampleMin = Math.max(roundTo2(cur * 0.5), 1);
        const sampleMax = roundTo2(cur * 3);
        const step = Math.max(
          Math.floor((sampleMax - sampleMin) / 12 / 100) * 100,
          100,
        );

        samples = [];
        for (let amount = sampleMin; amount <= sampleMax; amount += step) {
          if (amount === cur) continue;
          const r = simulateNewMonthlyOnce(schedule, amount, period);
          if (r) samples.push({ amount, ...r });
        }
      }

      if (samples.length === 0) continue;

      const best = findMarginalBest(samples) ?? samples[samples.length - 1];
      timePoints.push({
        period,
        paymentDate: item.paymentDate,
        remainingLoan: item.remainingLoan,
        annualInterestRate: item.annualInterestRate,
        bestAmount: best.amount,
        bestInterestSaved: best.interestSaved,
        bestTermReduced: best.termReduced,
        samples,
      });
    }

    const recommendations = buildRecommendations(
      timePoints,
      isLumpSum,
      periodMap,
    );

    return { timePoints, recommendations };
  }, [
    schedule,
    input.mode,
    input.lumpSumPeriod,
    input.startPeriod,
    currentMonthlyPayment,
  ]);
}

const recColors: Record<string, string> = {
  'global-best': 'text-blue-600 dark:text-blue-400',
  'best-ratio': 'text-amber-600 dark:text-amber-400',
  easy: 'text-green-600 dark:text-green-400',
};

export function SmartAnalysis({
  schedule,
  params,
  input,
  currentMonthlyPayment,
  onApply,
}: Props) {
  const [open, setOpen] = useState(true);
  const { resolved } = useTheme();

  const { timePoints, recommendations } = useAnalysisMatrix(
    schedule,
    params,
    input,
    currentMonthlyPayment,
  );

  const isLumpSum = input.mode === 'lump-sum';

  // 当前表单期数对应的图 1 高亮 index（找不到时取第一个）
  const activePeriod = isLumpSum
    ? (input.lumpSumPeriod ?? 0)
    : (input.startPeriod ?? 0);
  const rawIdx = timePoints.findIndex((t) => t.period === activePeriod);
  const activeTimeIdx = rawIdx >= 0 ? rawIdx : 0;
  const selectedTP = timePoints[activeTimeIdx] ?? null;

  // 图 1：最佳时间点分析
  const timeChartOption = useMemo(() => {
    if (timePoints.length === 0) return null;
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          ps: Array<{
            seriesName: string;
            value: number;
            dataIndex: number;
          }>,
        ) => {
          if (!ps.length) return '';
          const tp = timePoints[ps[0].dataIndex];
          if (!tp) return '';
          let html = `<b>第 ${tp.period} 期（${tp.paymentDate}）</b>`;
          html += `<br/>剩余本金: ${fmtMoney(tp.remainingLoan)}`;
          html += `<br/>当前利率: ${tp.annualInterestRate}%`;
          for (const p of ps) {
            html += `<br/>${p.seriesName}: ${
              p.seriesName === '缩短期数' ? `${p.value} 期` : fmtMoney(p.value)
            }`;
          }
          html += `<br/>最优${isLumpSum ? '金额' : '月供'}: ${isLumpSum ? fmtWan(tp.bestAmount) : `${tp.bestAmount}元`}`;
          return html;
        },
      },
      legend: {
        bottom: 5,
        textStyle: { color: textColor, fontSize: 11 },
      },
      grid: { top: 30, right: 60, bottom: 40, left: 60 },
      xAxis: {
        type: 'category',
        data: timePoints.map((t) => t.paymentDate.slice(0, 7)),
        axisLabel: { fontSize: 10, color: textColor, rotate: 30 },
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
          type: 'bar',
          data: timePoints.map((t) => t.bestInterestSaved),
          itemStyle: {
            color: (p: { dataIndex: number }) =>
              p.dataIndex === activeTimeIdx ? '#2563eb' : '#93c5fd',
            borderRadius: [4, 4, 0, 0],
          },
          barMaxWidth: 32,
        },
        {
          name: '缩短期数',
          type: 'line',
          yAxisIndex: 1,
          data: timePoints.map((t) => t.bestTermReduced),
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { width: 2, color: '#ff9800' },
          itemStyle: { color: '#ff9800' },
        },
      ],
    };
  }, [timePoints, resolved, activeTimeIdx, isLumpSum]);

  // 图 2：当前选中时间点的金额分析
  const amountChartOption = useMemo(() => {
    if (!selectedTP || selectedTP.samples.length === 0) return null;
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';
    const samples = selectedTP.samples;

    const currentAmount = isLumpSum
      ? (input.lumpSumAmount ?? 0)
      : (input.newMonthly ?? currentMonthlyPayment);

    const nearestIdx = samples.reduce(
      (best, s, i) =>
        Math.abs(s.amount - currentAmount) <
        Math.abs(samples[best].amount - currentAmount)
          ? i
          : best,
      0,
    );

    const xLabels = samples.map((s) =>
      isLumpSum ? fmtWan(s.amount) : `${s.amount}`,
    );

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          ps: Array<{
            seriesName: string;
            value: number;
            dataIndex: number;
          }>,
        ) => {
          if (!ps.length) return '';
          const sp = samples[ps[0].dataIndex];
          let html = `<b>第 ${selectedTP.period} 期（${selectedTP.paymentDate}）</b>`;
          html += `<br/>剩余本金: ${fmtMoney(selectedTP.remainingLoan)} | 利率: ${selectedTP.annualInterestRate}%`;
          if (sp) {
            html += `<br/>${isLumpSum ? '还款金额' : '月供'}: ${isLumpSum ? fmtWan(sp.amount) : `${sp.amount} 元`}`;
          }
          for (const p of ps) {
            html += `<br/>${p.seriesName}: ${
              p.seriesName === '缩短期数' ? `${p.value} 期` : fmtMoney(p.value)
            }`;
          }
          html +=
            '<br/><span style="color:#999;font-size:11px">点击选择此方案</span>';
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
        axisLabel: { fontSize: 10, color: textColor, rotate: 30 },
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
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { width: 2, color: '#4f8cff' },
          itemStyle: { color: '#4f8cff' },
          markLine:
            currentAmount !== 0
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
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { width: 2, color: '#ff9800' },
          itemStyle: { color: '#ff9800' },
        },
      ],
    };
  }, [
    selectedTP,
    resolved,
    input.lumpSumAmount,
    input.newMonthly,
    currentMonthlyPayment,
    isLumpSum,
  ]);

  // 图 1 点击：同步期数 + 该时间点的最优金额（两个维度都设置才能触发完整计算）
  const handleTimeChartClick = (p: { dataIndex?: number }) => {
    if (p.dataIndex == null) return;
    const tp = timePoints[p.dataIndex];
    if (!tp) return;
    onApply(
      isLumpSum
        ? { lumpSumPeriod: tp.period, lumpSumAmount: tp.bestAmount }
        : { startPeriod: tp.period, newMonthly: tp.bestAmount },
    );
  };

  // 图 2 点击：同步金额 + 当前选中时间点的期数
  const handleAmountChartClick = (p: { dataIndex?: number }) => {
    if (p.dataIndex == null || !selectedTP) return;
    const sp = selectedTP.samples[p.dataIndex];
    if (!sp) return;
    onApply(
      isLumpSum
        ? { lumpSumPeriod: selectedTP.period, lumpSumAmount: sp.amount }
        : { startPeriod: selectedTP.period, newMonthly: sp.amount },
    );
  };

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
          {/* 推荐方案 */}
          {recommendations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {recommendations.map((rec) => (
                <button
                  key={rec.type}
                  type="button"
                  onClick={() => onApply(rec.patch)}
                  className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <p
                    className={`text-xs font-semibold ${recColors[rec.type] ?? 'text-primary'}`}
                  >
                    {rec.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rec.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* 图 1：最佳时间点 */}
          {timeChartOption ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                各时间点最优方案对比（点击柱子查看详情）
              </p>
              <ReactECharts
                option={timeChartOption}
                notMerge
                style={{ height: 260 }}
                onEvents={{ click: handleTimeChartClick }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              暂无分析数据
            </p>
          )}

          {/* 图 2：选中时间点的金额分析 */}
          {amountChartOption && selectedTP && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                第 {selectedTP.period} 期（{selectedTP.paymentDate}） —{' '}
                {isLumpSum ? '还款金额' : '月供'}与收益关系
              </p>
              <ReactECharts
                option={amountChartOption}
                notMerge
                style={{ height: 260 }}
                onEvents={{ click: handleAmountChartClick }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
