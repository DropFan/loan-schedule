import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  schedule: PaymentScheduleItem[];
}

const fmtAmt = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RepaymentPieChart({ schedule }: Props) {
  const { resolved } = useTheme();

  const regularItems = useMemo(
    () => schedule.filter((item) => item.period > 0),
    [schedule],
  );

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

  const data = useMemo(() => {
    if (regularItems.length === 0) return null;
    const item = regularItems[safeIndex];
    let paidPrincipal = 0;
    let paidInterest = 0;
    for (const row of schedule) {
      if (row.period > item.period) break;
      paidPrincipal += row.principal;
      paidInterest += row.interest;
    }
    return {
      item,
      paidPrincipal: Math.round(paidPrincipal * 100) / 100,
      paidInterest: Math.round(paidInterest * 100) / 100,
      totalPaid: Math.round((paidPrincipal + paidInterest) * 100) / 100,
    };
  }, [regularItems, safeIndex, schedule]);

  const option = useMemo(() => {
    if (!data) return null;
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#333';

    return {
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (params: { name: string; value: number; percent: number }) =>
          `${params.name}: ${fmtAmt(params.value)} (${params.percent}%)`,
      },
      legend: {
        bottom: 0,
        textStyle: { color: textColor, fontSize: 11 },
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold',
              formatter: '{b}\n{d}%',
            },
          },
          data: [
            {
              value: Math.round(data.paidPrincipal),
              name: '已还本金',
              itemStyle: { color: '#4caf50' },
            },
            {
              value: Math.round(data.paidInterest),
              name: '已还利息',
              itemStyle: { color: '#4f8cff' },
            },
            {
              value: Math.round(data.item.remainingLoan),
              name: '未还本金',
              itemStyle: { color: isDark ? '#555' : '#ddd' },
            },
          ],
        },
      ],
    };
  }, [data, resolved]);

  if (!option || !data) return null;

  const { item } = data;

  return (
    <div className="space-y-2">
      {/* 标题行 */}
      <div className="flex items-baseline justify-between px-1">
        <span className="text-sm font-medium">
          第 {item.period} 期
          <span className="ml-2 text-xs text-muted-foreground">
            {item.paymentDate}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          累计还款 <b className="text-foreground">{fmtAmt(data.totalPaid)}</b>
        </span>
      </div>

      <ReactECharts option={option} style={{ height: 200 }} />

      {/* 当期明细 */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 px-1 text-xs text-muted-foreground">
        <span>
          月供 <b className="text-foreground">{fmtAmt(item.monthlyPayment)}</b>
        </span>
        <span>
          本金 <b className="text-foreground">{fmtAmt(item.principal)}</b>
        </span>
        <span>
          利息 <b className="text-foreground">{fmtAmt(item.interest)}</b>
        </span>
        <span>
          剩余本金{' '}
          <b className="text-foreground">{fmtAmt(item.remainingLoan)}</b>
        </span>
        <span>
          利率 <b className="text-foreground">{item.annualInterestRate}%</b>
        </span>
        <span>
          剩余 <b className="text-foreground">{item.remainingTerm} 期</b>
        </span>
      </div>

      {/* 滑块 */}
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
