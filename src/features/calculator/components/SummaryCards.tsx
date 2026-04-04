import { lazy, Suspense } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import type { CombinedSummary } from '@/core/calculator/CombinedLoanHelper';
import { formatCurrency } from '@/core/utils/formatHelper';
import { useLoanStore } from '@/stores/useLoanStore';

const PaymentTrendChart = lazy(() =>
  import('@/features/charts').then((m) => ({
    default: m.PaymentTrendChart,
  })),
);

interface SummaryCardsProps {
  combinedSummary?: CombinedSummary | null;
  subLoanNames?: [string, string];
}

export function SummaryCards({
  combinedSummary,
  subLoanNames,
}: SummaryCardsProps = {}) {
  const summary = useLoanStore((s) => s.summary);
  const schedule = useLoanStore((s) => s.schedule);
  const changes = useLoanStore((s) => s.changes);

  // 合计模式
  if (combinedSummary) {
    const { summaryA, summaryB } = combinedSummary;
    const nameA = subLoanNames?.[0] ?? '方案A';
    const nameB = subLoanNames?.[1] ?? '方案B';

    const items = [
      {
        label: '合计月供',
        value: `¥${formatCurrency(combinedSummary.totalPayment / combinedSummary.termMonths)}`,
        detailA: `${nameA} ¥${formatCurrency(summaryA.totalPayment / summaryA.termMonths)}`,
        detailB: `${nameB} ¥${formatCurrency(summaryB.totalPayment / summaryB.termMonths)}`,
      },
      {
        label: '合计总还款',
        value: `¥${formatCurrency(combinedSummary.totalPayment)}`,
        detailA: `${nameA} ¥${formatCurrency(summaryA.totalPayment)}`,
        detailB: `${nameB} ¥${formatCurrency(summaryB.totalPayment)}`,
      },
      {
        label: '合计总利息',
        value: `¥${formatCurrency(combinedSummary.totalInterest)}`,
        detailA: `${nameA} ¥${formatCurrency(summaryA.totalInterest)}`,
        detailB: `${nameB} ¥${formatCurrency(summaryB.totalInterest)}`,
      },
    ];

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-lg font-bold text-primary">
                  {item.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-0.5 space-y-0">
                  <div>{item.detailA}</div>
                  <div>{item.detailB}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 单方案模式（原有逻辑）
  if (!summary || schedule.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState message="填写贷款参数开始计算" />
        </CardContent>
      </Card>
    );
  }

  const monthlyPayment = changes[changes.length - 1]?.monthlyPayment ?? 0;

  const items = [
    { label: '月供', value: `¥${formatCurrency(monthlyPayment)}` },
    { label: '还款总额', value: `¥${formatCurrency(summary.totalPayment)}` },
    { label: '利息总额', value: `¥${formatCurrency(summary.totalInterest)}` },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-lg font-bold text-primary">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Suspense>
            <PaymentTrendChart />
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}
