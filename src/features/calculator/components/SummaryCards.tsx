import { lazy, Suspense } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/core/utils/formatHelper';
import { useLoanStore } from '@/stores/useLoanStore';

const PaymentTrendChart = lazy(() =>
  import('@/features/charts').then((m) => ({
    default: m.PaymentTrendChart,
  })),
);

export function SummaryCards() {
  const summary = useLoanStore((s) => s.summary);
  const schedule = useLoanStore((s) => s.schedule);
  const changes = useLoanStore((s) => s.changes);

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
