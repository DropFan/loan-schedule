import ReactECharts from 'echarts-for-react';
import { useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';
import type { Dimension, SelectedLoan } from '../ComparePage';

type ChartInstance = {
  getZr: () => {
    on: (event: string, handler: (params: { offsetX: number }) => void) => void;
  };
  convertFromPixel: (
    opt: { seriesIndex: number },
    point: number[],
  ) => number[] | undefined;
};

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
  selectedPeriod: number | null;
  onPeriodSelect: (period: number | null) => void;
}

export function ComparisonOverlay({
  loans,
  dimension,
  onDimensionChange,
  selectedPeriod,
  onPeriodSelect,
}: Props) {
  const { resolved } = useTheme();
  const chartRef = useRef<ChartInstance | null>(null);
  const maxPeriodRef = useRef(0);

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
    maxPeriodRef.current = maxPeriod;
    const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

    const fmtAmt = (v: number) =>
      `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 每个方案的 period -> paymentDate 映射，供 tooltip 使用
    const loanDateMaps: Map<number, string>[] = [];

    const series = loans.map((loan, loanIdx) => {
      const regularItems = loan.schedule.filter((s) => s.period > 0);
      const periodMap = new Map(
        regularItems.map((item) => [item.period, item]),
      );

      // 收集日期映射
      const dateMap = new Map<number, string>();
      for (const item of regularItems) {
        dateMap.set(item.period, item.paymentDate);
      }
      loanDateMaps[loanIdx] = dateMap;

      let data: (number | null)[];

      if (dimension === 'payment') {
        data = periods.map((p) => periodMap.get(p)?.monthlyPayment ?? null);
      } else if (dimension === 'remaining') {
        data = periods.map((p) => periodMap.get(p)?.remainingLoan ?? null);
      } else {
        // cumulative / interest: 逐期累加
        let cumPayment = 0;
        let cumInterest = 0;
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

    // 选中期标记线：挂在第一个 series 上
    if (selectedPeriod != null && series.length > 0) {
      const idx = periods.indexOf(selectedPeriod);
      if (idx >= 0) {
        (series[0] as Record<string, unknown>).markLine = {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'solid', color: '#f43f5e', width: 1.5 },
          label: {
            show: true,
            position: 'insideEndTop',
            fontSize: 10,
            color: '#f43f5e',
            formatter: `第 ${selectedPeriod} 期`,
          },
          data: [{ xAxis: idx }],
        };
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          params: Array<{
            dataIndex: number;
            seriesIndex: number;
            seriesName: string;
            value: number | null;
            color: string;
          }>,
        ) => {
          if (!params.length) return '';
          const idx = params[0].dataIndex;
          const period = periods[idx];
          // 取各方案在该期的日期，去重后展示
          const dates = new Set<string>();
          for (const p of params) {
            const d = loanDateMaps[p.seriesIndex]?.get(period);
            if (d) dates.add(d);
          }
          const dateStr = dates.size > 0 ? ` ${[...dates].join(' / ')}` : '';
          let html = `<b>第 ${period} 期</b>${dateStr}`;
          html +=
            ' <span style="color:#999;font-size:11px">（点击选中）</span>';
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
  }, [loans, dimension, resolved, selectedPeriod]);

  // 用 ref 保存最新的回调和状态，避免 zrender handler 闭包过期
  const callbackRef = useRef({ onPeriodSelect, selectedPeriod });
  callbackRef.current = { onPeriodSelect, selectedPeriod };

  // biome-ignore lint/suspicious/noExplicitAny: echarts-for-react onChartReady 类型
  const onChartReady = useCallback((instance: any) => {
    // 避免重复绑定
    if (chartRef.current === instance) return;
    chartRef.current = instance;

    instance.getZr().on('click', (params: { offsetX: number }) => {
      const chart = chartRef.current;
      if (!chart) return;
      // 像素坐标 → 数据坐标（x 轴索引）
      const point = chart.convertFromPixel({ seriesIndex: 0 }, [
        params.offsetX,
        0,
      ]);
      if (!point) return;
      const dataIndex = Math.round(point[0]);
      if (dataIndex < 0 || dataIndex >= maxPeriodRef.current) return;
      const period = dataIndex + 1;
      const { onPeriodSelect: cb, selectedPeriod: cur } = callbackRef.current;
      cb(cur === period ? null : period);
    });
  }, []);

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

      <ReactECharts
        option={option}
        style={{ height: 350 }}
        onChartReady={onChartReady}
      />
    </div>
  );
}
