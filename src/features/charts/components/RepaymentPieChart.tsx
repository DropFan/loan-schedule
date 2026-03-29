import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import type {
  LoanScheduleSummary,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  schedule: PaymentScheduleItem[];
  summary: LoanScheduleSummary;
}

export function RepaymentPieChart({ schedule, summary }: Props) {
  const { resolved } = useTheme();

  const regularItems = useMemo(
    () => schedule.filter((item) => item.period > 0),
    [schedule],
  );

  // 找到默认位置：今天对应的期数
  const defaultIndex = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let idx = regularItems.length - 1;
    for (let i = 0; i < regularItems.length; i++) {
      if (regularItems[i].paymentDate > today) {
        idx = Math.max(0, i - 1);
        break;
      }
    }
    return idx;
  }, [regularItems]);

  const [currentIndex, setCurrentIndex] = useState(defaultIndex);
  const safeIndex = Math.min(currentIndex, regularItems.length - 1);

  const option = useMemo(() => {
    if (regularItems.length === 0) return null;
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#333';

    const item = regularItems[safeIndex];
    // 截至当前期的累计（含提前还款行 period=0）
    let paidPrincipal = 0;
    let paidInterest = 0;
    for (const row of schedule) {
      if (row.period > item.period) break;
      paidPrincipal += row.principal;
      paidInterest += row.interest;
    }
    const remainingPrincipal = item.remainingLoan;

    return {
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (params: { name: string; value: number; percent: number }) =>
          `<b>第 ${item.period} 期</b> ${item.paymentDate}<br/>${params.name}: ¥${params.value.toLocaleString()} (${params.percent}%)`,
      },
      legend: {
        bottom: 0,
        textStyle: { color: textColor, fontSize: 11 },
      },
      title: {
        text: `第 ${item.period} 期  ${item.paymentDate}`,
        left: 'center',
        top: 0,
        textStyle: { color: textColor, fontSize: 12, fontWeight: 'normal' },
      },
      series: [
        {
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['50%', '48%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'inside',
            fontSize: 10,
            formatter: '{d}%',
          },
          data: [
            {
              value: Math.round(paidPrincipal),
              name: '已还本金',
              itemStyle: { color: '#4caf50' },
            },
            {
              value: Math.round(paidInterest),
              name: '已还利息',
              itemStyle: { color: '#4f8cff' },
            },
            {
              value: Math.round(remainingPrincipal),
              name: '未还本金',
              itemStyle: { color: isDark ? '#555' : '#ddd' },
            },
          ],
        },
      ],
    };
  }, [regularItems, safeIndex, summary, resolved]);

  if (!option) return null;

  return (
    <div className="space-y-2">
      <ReactECharts option={option} style={{ height: 240 }} />
      <div className="px-2">
        <input
          type="range"
          min={0}
          max={regularItems.length - 1}
          value={safeIndex}
          onChange={(e) => setCurrentIndex(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{regularItems[0]?.paymentDate}</span>
          <span>{regularItems[regularItems.length - 1]?.paymentDate}</span>
        </div>
      </div>
    </div>
  );
}
