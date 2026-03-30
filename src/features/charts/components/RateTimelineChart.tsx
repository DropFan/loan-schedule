import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import type {
  LoanChangeRecord,
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { ChangeType } from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  params: LoanParameters;
  schedule: PaymentScheduleItem[];
  changes: LoanChangeRecord[];
}

interface RatePoint {
  date: string;
  rate: number;
}

function buildRateTimeline(
  params: LoanParameters,
  schedule: PaymentScheduleItem[],
  changes: LoanChangeRecord[],
): RatePoint[] {
  const regularItems = schedule.filter((item) => item.period > 0);
  if (regularItems.length === 0) return [];

  const startDate = regularItems[0].paymentDate;
  const endDate = regularItems[regularItems.length - 1].paymentDate;

  const points: RatePoint[] = [
    { date: startDate, rate: params.annualInterestRate },
  ];

  // 从 changes 中提取利率变更
  const rateChanges = changes
    .filter(
      (c) =>
        c.changeParams?.type === ChangeType.RateChange &&
        c.changeParams.newAnnualRate !== undefined,
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const change of rateChanges) {
    const date =
      change.date instanceof Date
        ? change.date.toISOString().split('T')[0]
        : String(change.date).slice(0, 10);
    const newRate = change.changeParams?.newAnnualRate;
    if (newRate !== undefined) {
      points.push({ date, rate: newRate });
    }
  }

  // 末尾延伸到最后一期
  if (points.length > 0) {
    const lastPoint = points[points.length - 1];
    if (lastPoint.date !== endDate) {
      points.push({ date: endDate, rate: lastPoint.rate });
    }
  }

  return points;
}

function calcDuration(from: string, to: string): string {
  const d1 = new Date(from);
  const d2 = new Date(to);
  const totalMonths =
    (d2.getFullYear() - d1.getFullYear()) * 12 +
    (d2.getMonth() - d1.getMonth());
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years > 0 && months > 0) return `${years}年${months}个月`;
  if (years > 0) return `${years}年`;
  return `${months}个月`;
}

export function RateTimelineChart({ params, schedule, changes }: Props) {
  const { resolved } = useTheme();

  const points = useMemo(
    () => buildRateTimeline(params, schedule, changes),
    [params, schedule, changes],
  );

  const hasRateChanges = useMemo(
    () =>
      changes.some(
        (c) =>
          c.changeParams?.type === ChangeType.RateChange &&
          c.changeParams.newAnnualRate !== undefined,
      ),
    [changes],
  );

  const option = useMemo(() => {
    if (points.length === 0) return null;
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#666';

    const dates = points.map((p) => p.date);
    const rates = points.map((p) => p.rate);

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (
          tooltipParams: Array<{
            dataIndex: number;
            value: number;
            color: string;
          }>,
        ) => {
          if (!tooltipParams.length) return '';
          const idx = tooltipParams[0].dataIndex;
          const point = points[idx];
          if (!point) return '';
          let html = `<b>${point.date}</b><br/><span style="color:${tooltipParams[0].color}">●</span> 利率: ${point.rate}%`;
          // 计算持续时长
          if (idx < points.length - 1) {
            const nextDate = points[idx + 1].date;
            html += `<br/>持续: ${calcDuration(point.date, nextDate)}`;
          }
          return html;
        },
      },
      grid: { top: 20, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: 10, color: textColor },
        axisLine: { lineStyle: { color: isDark ? '#444' : '#ddd' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: textColor,
          formatter: '{value}%',
        },
        splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
        scale: true,
      },
      series: [
        {
          name: '利率',
          type: 'line',
          step: 'end',
          data: rates,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { width: 2, color: '#e040fb' },
          itemStyle: { color: '#e040fb' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: isDark
                    ? 'rgba(224,64,251,0.2)'
                    : 'rgba(224,64,251,0.1)',
                },
                { offset: 1, color: 'rgba(224,64,251,0)' },
              ],
            },
          },
        },
      ],
    };
  }, [points, resolved]);

  if (!option) return null;

  return (
    <div>
      <ReactECharts option={option} style={{ height: 240 }} />
      {!hasRateChanges && (
        <div className="mt-1 text-center text-xs text-muted-foreground">
          利率未变更
        </div>
      )}
    </div>
  );
}
