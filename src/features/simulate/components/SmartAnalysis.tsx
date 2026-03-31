import ReactECharts from 'echarts-for-react';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';
import { type SimulateInput, simulateLumpSumOnce } from '../useSimulation';

interface Props {
  schedule: PaymentScheduleItem[];
  params: LoanParameters;
  input: SimulateInput;
  onApply: (amount: number) => void;
}

interface SamplePoint {
  amount: number;
  interestSaved: number;
  termReduced: number;
}

interface Recommendation {
  label: string;
  description: string;
  amount: number;
  interestSaved: number;
  termReduced: number;
}

function fmtWan(v: number): string {
  return `${(v / 10000).toFixed(1)}万`;
}

function fmtMoney(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SmartAnalysis({ schedule, params, input, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const { resolved } = useTheme();

  const lumpSumPeriod = input.lumpSumPeriod ?? 1;
  const strategy = input.lumpSumStrategy ?? 'shorten-term';

  // 采样计算
  const { samples, recommendations } = useMemo(() => {
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
      if (r) {
        pts.push({
          amount,
          interestSaved: r.interestSaved,
          termReduced: r.termReduced,
        });
      }
    }

    // 推荐方案
    const recs: Recommendation[] = [];

    // 缩短 1 年
    const y1 = pts.find((p) => p.termReduced >= 12);
    if (y1) {
      recs.push({
        label: '缩短 1 年',
        description: `还 ${fmtWan(y1.amount)}，节省利息 ${fmtMoney(y1.interestSaved)}`,
        amount: y1.amount,
        interestSaved: y1.interestSaved,
        termReduced: y1.termReduced,
      });
    }

    // 缩短 3 年
    const y3 = pts.find((p) => p.termReduced >= 36);
    if (y3) {
      recs.push({
        label: '缩短 3 年',
        description: `还 ${fmtWan(y3.amount)}，节省利息 ${fmtMoney(y3.interestSaved)}`,
        amount: y3.amount,
        interestSaved: y3.interestSaved,
        termReduced: y3.termReduced,
      });
    }

    // 边际最优（边际节省利息开始递减最明显的点）
    if (pts.length >= 3) {
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
      const best = pts[bestIdx];
      // 避免与前面重复
      if (!recs.some((r) => r.amount === best.amount)) {
        recs.push({
          label: '边际最优',
          description: `还 ${fmtWan(best.amount)}，性价比最高`,
          amount: best.amount,
          interestSaved: best.interestSaved,
          termReduced: best.termReduced,
        });
      }
    }

    return { samples: pts, recommendations: recs };
  }, [schedule, params, lumpSumPeriod, strategy]);

  const option = useMemo(() => {
    if (samples.length === 0) return null;
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    const currentAmount = input.lumpSumAmount ?? 0;
    const currentIdx = samples.findIndex((s) => s.amount >= currentAmount);

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          ps: Array<{ seriesName: string; value: number; axisValue: string }>,
        ) => {
          if (!ps.length) return '';
          let html = `<b>${ps[0].axisValue}</b>`;
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
        data: samples.map((s) => fmtWan(s.amount)),
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
          showSymbol: false,
          lineStyle: { width: 2, color: '#4f8cff' },
          itemStyle: { color: '#4f8cff' },
          markLine:
            currentIdx >= 0
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
                  data: [{ xAxis: currentIdx }],
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
  }, [samples, resolved, input.lumpSumAmount]);

  if (input.mode !== 'lump-sum') return null;

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
              请先选择还款期数
            </p>
          )}

          {recommendations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {recommendations.map((rec) => (
                <button
                  key={rec.label}
                  type="button"
                  onClick={() => onApply(rec.amount)}
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
