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
  calcAnnuityReturn,
  calcLumpSumReturn,
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
  score: number;
}

interface TimePointAnalysis {
  period: number;
  paymentDate: string;
  remainingLoan: number;
  annualInterestRate: number;
  bestAmount: number;
  bestInterestSaved: number;
  bestScore: number;
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

interface ScoreAdjustments {
  opportunityCost: boolean;
  inflation: boolean;
  investmentRate: number;
  inflationRate: number;
}

function fmtWan(v: number): string {
  return `${(v / 10000).toFixed(1)}万`;
}

function fmtMoney(v: number): string {
  return `¥${Math.abs(v).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** 将未来值折现为现值（通胀折算） */
function discountToPresent(
  value: number,
  inflationRate: number,
  months: number,
): number {
  if (inflationRate <= 0 || months <= 0) return value;
  const r = inflationRate / 100 / 12;
  return roundTo2(value / (1 + r) ** months);
}

/** 在采样序列中找到边际收益递减的拐点（二阶差分最大下降处） */
function findMarginalBest(pts: SamplePoint[]): SamplePoint | null {
  if (pts.length < 3) return null;
  let bestIdx = -1;
  let maxDrop = 0;
  for (let i = 2; i < pts.length; i++) {
    const prev = pts[i - 1].score - pts[i - 2].score;
    const curr = pts[i].score - pts[i - 1].score;
    const drop = prev - curr;
    if (drop > maxDrop) {
      maxDrop = drop;
      bestIdx = i - 1;
    }
  }
  return bestIdx >= 0 ? pts[bestIdx] : null;
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
  adjusted: boolean,
  currentMonthlyPayment: number,
): Recommendation[] {
  if (timePoints.length === 0) return [];

  const recs: Recommendation[] = [];
  const benefitText = adjusted ? '净收益' : '节省利息';

  // 1. 全局最优：score 最大
  let globalBest: { tp: TimePointAnalysis; sp: SamplePoint } | null = null;
  for (const tp of timePoints) {
    for (const sp of tp.samples) {
      if (!globalBest || sp.score > globalBest.sp.score) {
        globalBest = { tp, sp };
      }
    }
  }
  if (globalBest && globalBest.sp.score > 0) {
    const { tp, sp } = globalBest;
    recs.push({
      type: 'global-best',
      label: '全局最优',
      description: isLumpSum
        ? `第${tp.period}期还${fmtWan(sp.amount)}，${benefitText}${fmtMoney(sp.score)}，缩短${sp.termReduced}期`
        : `第${tp.period}期起月供${sp.amount}，${benefitText}${fmtMoney(sp.score)}`,
      patch: isLumpSum
        ? { lumpSumPeriod: tp.period, lumpSumAmount: sp.amount }
        : { startPeriod: tp.period, newMonthly: sp.amount },
    });
  }

  // 2. 性价比最优：各时间点边际最优中，score/投入金额 比率最高的
  //    一次性还款：投入 = bestAmount；调整月供：投入 = |bestAmount - currentMonthlyPayment|
  let bestRatio: {
    tp: TimePointAnalysis;
    ratio: number;
  } | null = null;
  for (const tp of timePoints) {
    if (tp.bestScore <= 0 || tp.bestAmount <= 0) continue;
    const denominator = isLumpSum
      ? tp.bestAmount
      : Math.abs(tp.bestAmount - currentMonthlyPayment);
    if (denominator <= 0) continue;
    const ratio = tp.bestScore / denominator;
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
          ? `第${tp.period}期还${fmtWan(tp.bestAmount)}，每万元${benefitText}${fmtMoney(per10k)}`
          : `第${tp.period}期起月供${tp.bestAmount}，每万元增量${benefitText}${fmtMoney(per10k)}`,
        patch: isLumpSum
          ? { lumpSumPeriod: tp.period, lumpSumAmount: tp.bestAmount }
          : { startPeriod: tp.period, newMonthly: tp.bestAmount },
      });
    }
  }

  // 3. 轻松方案：金额约束下 score 最大
  let easyBest: { tp: TimePointAnalysis; sp: SamplePoint } | null = null;
  for (const tp of timePoints) {
    const item = periodMap.get(tp.period);
    if (!item) continue;
    for (const sp of tp.samples) {
      if (sp.score <= 0) continue;
      const withinLimit = isLumpSum
        ? sp.amount <= item.remainingLoan * 0.2
        : sp.amount <= item.monthlyPayment * 1.2;
      if (!withinLimit) continue;
      if (!easyBest || sp.score > easyBest.sp.score) {
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
          ? `第${tp.period}期还${fmtWan(sp.amount)}，${benefitText}${fmtMoney(sp.score)}，压力小`
          : `第${tp.period}期起月供${sp.amount}，${benefitText}${fmtMoney(sp.score)}`,
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
  adjustments: ScoreAdjustments,
): AnalysisMatrix {
  return useMemo(() => {
    const isLumpSum = input.mode === 'lump-sum';
    const strategy = input.lumpSumStrategy ?? 'shorten-term';
    const userPeriod = isLumpSum
      ? (input.lumpSumPeriod ?? 1)
      : (input.startPeriod ?? 1);
    const periods = sampleTimePeriods(schedule, userPeriod);
    if (periods.length === 0) return { timePoints: [], recommendations: [] };

    const regularItems = schedule.filter((s) => s.period > 0);
    const periodMap = new Map(regularItems.map((s) => [s.period, s]));
    const originalSummary = calcScheduleSummary(schedule);
    const precomputed = { periodMap, originalSummary };
    const adj = adjustments;

    const timePoints: TimePointAnalysis[] = [];

    for (const period of periods) {
      const item = periodMap.get(period);
      if (!item) continue;

      let samples: SamplePoint[];

      if (isLumpSum) {
        const maxAmount = item.remainingLoan * 0.8;
        const sampleCount = 12;
        const rawStep = maxAmount / sampleCount;
        const step =
          rawStep >= 10000
            ? Math.floor(rawStep / 10000) * 10000
            : rawStep >= 1000
              ? Math.floor(rawStep / 1000) * 1000
              : Math.max(Math.floor(rawStep / 100) * 100, 100);
        if (step <= 0) continue;

        samples = [];
        for (let i = 1; i <= sampleCount; i++) {
          const amount = step * i;
          const r = simulateLumpSumFast(
            schedule,
            amount,
            period,
            precomputed,
            strategy,
          );
          if (r) samples.push({ amount, ...r, score: r.interestSaved });
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
          if (Math.abs(amount - cur) < 1) continue;
          const r = simulateNewMonthlyOnce(schedule, amount, period);
          if (r) samples.push({ amount, ...r, score: r.interestSaved });
        }
      }

      if (samples.length === 0) continue;

      // 机会成本 & 通胀折算调整
      if (adj.opportunityCost || adj.inflation) {
        const remainingMonths = item.remainingTerm;
        for (const sp of samples) {
          let score = sp.interestSaved;
          if (adj.opportunityCost && adj.investmentRate > 0) {
            if (isLumpSum) {
              score -= calcLumpSumReturn(
                sp.amount,
                adj.investmentRate,
                remainingMonths,
              );
            } else {
              const extra = sp.amount - currentMonthlyPayment;
              if (extra > 0) {
                score -= calcAnnuityReturn(
                  extra,
                  adj.investmentRate,
                  remainingMonths,
                );
              } else if (extra < 0) {
                score += calcAnnuityReturn(
                  -extra,
                  adj.investmentRate,
                  remainingMonths,
                );
              }
            }
          }
          if (adj.inflation && adj.inflationRate > 0) {
            score = discountToPresent(
              score,
              adj.inflationRate,
              remainingMonths / 2,
            );
          }
          sp.score = score;
        }
      }

      const positiveSamples = samples.filter((s) => s.score > 0);
      const best =
        positiveSamples.length > 0
          ? (findMarginalBest(positiveSamples) ??
            positiveSamples[positiveSamples.length - 1])
          : samples[samples.length - 1];
      timePoints.push({
        period,
        paymentDate: item.paymentDate,
        remainingLoan: item.remainingLoan,
        annualInterestRate: item.annualInterestRate,
        bestAmount: best.amount,
        bestInterestSaved: best.interestSaved,
        bestScore: best.score,
        bestTermReduced: best.termReduced,
        samples,
      });
    }

    const adjusted = adj.opportunityCost || adj.inflation;
    const recommendations = buildRecommendations(
      timePoints,
      isLumpSum,
      periodMap,
      adjusted,
      currentMonthlyPayment,
    );

    return { timePoints, recommendations };
  }, [
    schedule,
    input.mode,
    input.lumpSumPeriod,
    input.lumpSumStrategy,
    input.startPeriod,
    currentMonthlyPayment,
    adjustments,
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

  const [adjustOpportunityCost, setAdjustOpportunityCost] = useState(false);
  const [adjustInflation, setAdjustInflation] = useState(false);
  const [inflationRate, setInflationRate] = useState(2.0);

  const adjustments = useMemo<ScoreAdjustments>(
    () => ({
      opportunityCost: adjustOpportunityCost,
      inflation: adjustInflation,
      investmentRate: input.investmentRate,
      inflationRate,
    }),
    [
      adjustOpportunityCost,
      adjustInflation,
      input.investmentRate,
      inflationRate,
    ],
  );

  const adjusted = adjustOpportunityCost || adjustInflation;
  const scoreLabel = adjusted ? '净收益' : '节省利息';

  const { timePoints, recommendations } = useAnalysisMatrix(
    schedule,
    params,
    input,
    currentMonthlyPayment,
    adjustments,
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
          name: scoreLabel,
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
          name: scoreLabel,
          type: 'bar',
          data: timePoints.map((t) => t.bestScore),
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
  }, [timePoints, resolved, activeTimeIdx, isLumpSum, scoreLabel]);

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
          name: scoreLabel,
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
          name: scoreLabel,
          type: 'line',
          data: samples.map((s) => s.score),
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
    scoreLabel,
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
          <p className="text-xs text-amber-500 dark:text-amber-400 font-medium">
            测试中：当前算法尚未完善，结果仅供参考，请勿作为重要决策依据
          </p>
          <p className="text-xs text-muted-foreground">
            自动采样不同时间点和金额，找出最优还款方案；可勾选下方选项将机会成本或通胀纳入评估
          </p>

          {/* 调整选项 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={adjustOpportunityCost}
                onChange={(e) => setAdjustOpportunityCost(e.target.checked)}
                className="rounded"
              />
              <span className="text-muted-foreground">
                扣除机会成本（理财 {input.investmentRate}%）
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={adjustInflation}
                onChange={(e) => setAdjustInflation(e.target.checked)}
                className="rounded"
              />
              <span className="text-muted-foreground">折算通胀</span>
            </label>
            {adjustInflation && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={inflationRate}
                  onChange={(e) =>
                    setInflationRate(Number(e.target.value) || 0)
                  }
                  className="w-14 px-1.5 py-0.5 text-xs border border-border rounded text-center bg-background"
                  step="0.1"
                  min="0"
                  max="20"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            )}
          </div>

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
