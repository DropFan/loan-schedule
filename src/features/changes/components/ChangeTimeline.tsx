import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LoanChangeRecord, LoanMethod } from '@/core/types/loan.types';
import { LoanMethodName } from '@/core/types/loan.types';
import {
  formatCurrency,
  formatDate,
  formatRate,
} from '@/core/utils/formatHelper';
import { useLoanStore } from '@/stores/useLoanStore';

interface CombinedChanges {
  changesA: LoanChangeRecord[];
  changesB: LoanChangeRecord[];
  nameA: string;
  nameB: string;
}

interface ChangeTimelineProps {
  combined?: CombinedChanges;
}

export function ChangeTimeline({ combined }: ChangeTimelineProps = {}) {
  const changes = useLoanStore((s) => s.changes);

  // 合并模式
  if (combined) {
    const { changesA, changesB, nameA, nameB } = combined;
    const tagged = [
      ...changesA.slice(1).map((c) => ({ ...c, source: nameA })),
      ...changesB.slice(1).map((c) => ({ ...c, source: nameB })),
    ];
    // 按日期倒序
    tagged.sort((a, b) => {
      const da =
        a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
      const db =
        b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
      return db - da;
    });

    if (tagged.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>变更记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tagged.map((change, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: 变更记录无稳定唯一 ID
                key={`${String(change.date)}-${change.source}-${i}`}
                className="border-l-2 border-primary/30 pl-4 py-1"
              >
                <div className="text-sm font-medium">
                  <span className="text-xs font-normal text-muted-foreground mr-1.5">
                    [{change.source}]
                  </span>
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

  // 单方案模式（原有逻辑）
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
