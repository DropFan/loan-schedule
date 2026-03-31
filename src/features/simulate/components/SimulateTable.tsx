import { ArrowDown, ArrowUp } from 'lucide-react';
import type { PaymentScheduleItem } from '@/core/types/loan.types';

interface Props {
  originalSchedule: PaymentScheduleItem[];
  simulatedSchedule: PaymentScheduleItem[];
  startPeriod: number;
}

function fmtAmt(v: number): string {
  return v.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DiffCell({ diff }: { diff: number }) {
  if (Math.abs(diff) < 0.01) return <td className="px-2 py-1.5 text-right" />;
  const isNeg = diff < 0;
  return (
    <td
      className={`px-2 py-1.5 text-right text-xs ${
        isNeg
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400'
      }`}
    >
      <span className="inline-flex items-center gap-0.5">
        {isNeg ? (
          <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUp className="w-3 h-3" />
        )}
        {fmtAmt(Math.abs(diff))}
      </span>
    </td>
  );
}

export function SimulateTable({
  originalSchedule,
  simulatedSchedule,
  startPeriod,
}: Props) {
  const origRegular = originalSchedule.filter((s) => s.period > 0);
  const simMap = new Map(
    simulatedSchedule.filter((s) => s.period > 0).map((s) => [s.period, s]),
  );

  const maxPeriod = Math.max(
    origRegular.length > 0 ? origRegular[origRegular.length - 1].period : 0,
    ...[...simMap.keys()],
  );

  const origMap = new Map(origRegular.map((s) => [s.period, s]));

  const rows: Array<{
    period: number;
    date: string;
    origPayment: number | null;
    simPayment: number | null;
    origRemaining: number | null;
    simRemaining: number | null;
  }> = [];

  for (let p = 1; p <= maxPeriod; p++) {
    const orig = origMap.get(p);
    const sim = simMap.get(p);
    rows.push({
      period: p,
      date: orig?.paymentDate ?? sim?.paymentDate ?? '',
      origPayment: orig?.monthlyPayment ?? null,
      simPayment: sim?.monthlyPayment ?? null,
      origRemaining: orig?.remainingLoan ?? null,
      simRemaining: sim?.remainingLoan ?? null,
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <h3 className="text-sm font-semibold px-4 pt-4 pb-2">逐期对比明细</h3>
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 sticky top-0 z-10">
            <tr className="text-muted-foreground">
              <th className="px-2 py-2 text-left font-medium">期数</th>
              <th className="px-2 py-2 text-left font-medium">日期</th>
              <th className="px-2 py-2 text-right font-medium">原月供</th>
              <th className="px-2 py-2 text-right font-medium">模拟月供</th>
              <th className="px-2 py-2 text-right font-medium">差异</th>
              <th className="px-2 py-2 text-right font-medium">原剩余</th>
              <th className="px-2 py-2 text-right font-medium">模拟剩余</th>
              <th className="px-2 py-2 text-right font-medium">差异</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row) => {
              const isStart = row.period === startPeriod;
              const paymentDiff =
                row.origPayment != null && row.simPayment != null
                  ? row.simPayment - row.origPayment
                  : null;
              const remainDiff =
                row.origRemaining != null && row.simRemaining != null
                  ? row.simRemaining - row.origRemaining
                  : null;

              return (
                <tr
                  key={row.period}
                  className={
                    isStart
                      ? 'border-l-2 border-l-red-500 bg-red-50/30 dark:bg-red-950/10'
                      : ''
                  }
                >
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {row.period}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {row.date}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {row.origPayment != null ? fmtAmt(row.origPayment) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {row.simPayment != null ? fmtAmt(row.simPayment) : '-'}
                  </td>
                  {paymentDiff != null ? (
                    <DiffCell diff={paymentDiff} />
                  ) : (
                    <td className="px-2 py-1.5 text-right text-muted-foreground">
                      {row.origPayment != null ? fmtAmt(row.origPayment) : '-'}
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-right">
                    {row.origRemaining != null
                      ? fmtAmt(row.origRemaining)
                      : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {row.simRemaining != null ? fmtAmt(row.simRemaining) : '-'}
                  </td>
                  {remainDiff != null ? (
                    <DiffCell diff={remainDiff} />
                  ) : (
                    <td className="px-2 py-1.5 text-right text-muted-foreground">
                      {row.origRemaining != null
                        ? fmtAmt(row.origRemaining)
                        : '-'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
