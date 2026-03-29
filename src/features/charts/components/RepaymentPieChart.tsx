import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
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

  const option = useMemo(() => {
    const isDark = resolved === 'dark';
    const textColor = isDark ? '#ccc' : '#333';

    const lastItem = schedule[schedule.length - 1];
    const totalPrincipalPaid = summary.totalPayment - summary.totalInterest;
    const remainingPrincipal = lastItem?.remainingLoan ?? 0;
    const paidPrincipal = totalPrincipalPaid - remainingPrincipal;

    return {
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: '{b}: ¥{c} ({d}%)',
      },
      legend: {
        bottom: 0,
        textStyle: { color: textColor, fontSize: 11 },
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          data: [
            {
              value: Math.round(paidPrincipal),
              name: '已还本金',
              itemStyle: { color: '#4caf50' },
            },
            {
              value: Math.round(summary.totalInterest),
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
  }, [schedule, summary, resolved]);

  return <ReactECharts option={option} style={{ height: 280 }} />;
}
