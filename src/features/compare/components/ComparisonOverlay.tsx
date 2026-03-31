import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import type { Dimension, SelectedLoan } from '../ComparePage';

const DIMENSION_LABELS: Record<Dimension, string> = {
  payment: '月供',
  cumulative: '累计还款',
  remaining: '剩余贷款',
  interest: '累计利息',
};

interface Props {
  loans: SelectedLoan[];
  dimension: Dimension;
  onDimensionChange: (d: Dimension) => void;
}

export function ComparisonOverlay({
  loans,
  dimension,
  onDimensionChange,
}: Props) {
  const { resolved } = useTheme();

  const option = useMemo(() => {
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    // X 轴取所有方案中最大期数
    const maxPeriod = Math.max(
      ...loans.map((l) => {
        const regular = l.schedule.filter((s) => s.period > 0);
        return regular.length > 0 ? regular[regular.length - 1].period : 0;
      }),
    );
    const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

    const fmtAmt = (v: number) =>
      `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const series = loans.map((loan) => {
      const regularItems = loan.schedule.filter((s) => s.period > 0);
      // 建立 period -> item 的映射
      const periodMap = new Map(
        regularItems.map((item) => [item.period, item]),
      );

      let data: (number | null)[];

      if (dimension === 'payment') {
        data = periods.map((p) => periodMap.get(p)?.monthlyPayment ?? null);
      } else if (dimension === 'remaining') {
        data = periods.map((p) => periodMap.get(p)?.remainingLoan ?? null);
      } else {
        // cumulative / interest: 逐期累加
        let cumPayment = 0;
        let cumInterest = 0;
        // 含 period=0 的提前还款行
        for (const row of loan.schedule) {
          if (row.period === 0) {
            cumPayment += row.monthlyPayment;
            cumInterest += row.interest;
          }
        }
        const cumMap = new Map<number, number>();
        for (const item of regularItems) {
          cumPayment += item.monthlyPayment;
          cumInterest += item.interest;
          cumMap.set(
            item.period,
            dimension === 'cumulative' ? cumPayment : cumInterest,
          );
        }
        data = periods.map((p) => cumMap.get(p) ?? null);
      }

      return {
        name: loan.name,
        type: 'line' as const,
        data,
        showSymbol: false,
        lineStyle: {
          width: 2,
          type: loan.isActive ? ('solid' as const) : ('dashed' as const),
        },
        itemStyle: { color: loan.color },
        connectNulls: false,
      };
    });

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
          let html = `<b>第 ${periods[idx]} 期</b>`;
          for (const p of params) {
            if (p.value != null) {
              html += `<br/><span style="color:${p.color}">●</span> ${p.seriesName}: ${fmtAmt(Number(p.value))}`;
            }
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
      series,
    };
  }, [loans, dimension, resolved]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* 维度切换 */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(Object.keys(DIMENSION_LABELS) as Dimension[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDimensionChange(d)}
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

      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
