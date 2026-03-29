import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LoanMethod } from '@/core/types/loan.types';
import { LoanMethodName } from '@/core/types/loan.types';
import {
  formatCurrency,
  formatDate,
  formatRate,
} from '@/core/utils/formatHelper';
import { useLoanStore } from '@/stores/useLoanStore';

export function ChangeTimeline() {
  const changes = useLoanStore((s) => s.changes);

  if (changes.length <= 1) return null;

  const displayChanges = [...changes].slice(1).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>变更记录</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayChanges.map((change, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: 变更记录无稳定唯一 ID
              key={`${String(change.date)}-${i}`}
              className="border-l-2 border-primary/30 pl-4 py-1"
            >
              <div className="text-sm font-medium">
                {change.date instanceof Date
                  ? formatDate(change.date)
                  : new Date(change.date).toISOString().split('T')[0]}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {change.comment}
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-x-3">
                <span>月供 ¥{formatCurrency(change.monthlyPayment)}</span>
                <span>剩余 ¥{formatCurrency(change.loanAmount)}</span>
                <span>{change.remainingTerm}期</span>
                <span>{formatRate(change.annualInterestRate)}</span>
                <span>{LoanMethodName[change.loanMethod as LoanMethod]}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
