import { useMemo } from 'react';
import { calcScheduleSummary } from '@/core/calculator/LoanCalculator';
import { LoanMethodName } from '@/core/types/loan.types';
import type { SelectedLoan } from '../ComparePage';

interface Props {
  loans: SelectedLoan[];
}

const fmtAmt = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

type Summary = ReturnType<typeof calcScheduleSummary>;

type RowDef = {
  label: string;
  getValue: (loan: SelectedLoan, summary: Summary) => string;
  getRaw: (loan: SelectedLoan, summary: Summary) => number;
  best: 'min' | 'max' | 'none';
  bestLabel?: string;
  fmtDiff?: (diff: number) => string;
};

/** 获取最末一期常规还款 */
const getLastRegular = (loan: SelectedLoan) => {
  for (let i = loan.schedule.length - 1; i >= 0; i--) {
    if (loan.schedule[i].period > 0) return loan.schedule[i];
  }
  return null;
};

const ROWS: RowDef[] = [
  {
    label: '还款方式',
    getValue: (l) => LoanMethodName[l.params.loanMethod],
    getRaw: () => 0,
    best: 'none',
  },
  {
    label: '贷款金额',
    getValue: (l) => fmtAmt(l.params.loanAmount),
    getRaw: (l) => l.params.loanAmount,
    best: 'none',
  },
  {
    label: '贷款期限',
    getValue: (l) => `${l.params.loanTermMonths} 个月`,
    getRaw: (l) => l.params.loanTermMonths,
    best: 'none',
  },
  {
    label: '年利率',
    getValue: (l) => fmtPct(l.params.annualInterestRate),
    getRaw: (l) => l.params.annualInterestRate,
    best: 'min',
    bestLabel: '最低',
    fmtDiff: (d) => `+${fmtPct(d)}`,
  },
  {
    label: '首期月供',
    getValue: (l) => {
      const first = l.schedule.find((s) => s.period === 1);
      return first ? fmtAmt(first.monthlyPayment) : '—';
    },
    getRaw: (l) => {
      const first = l.schedule.find((s) => s.period === 1);
      return first?.monthlyPayment ?? Number.POSITIVE_INFINITY;
    },
    best: 'min',
    bestLabel: '最低',
    fmtDiff: (d) => `+${fmtAmt(d)}`,
  },
  {
    label: '末期月供',
    getValue: (l) => {
      const last = getLastRegular(l);
      return last ? fmtAmt(last.monthlyPayment) : '—';
    },
    getRaw: (l) => {
      const last = getLastRegular(l);
      return last?.monthlyPayment ?? Number.POSITIVE_INFINITY;
    },
    best: 'min',
    bestLabel: '最低',
    fmtDiff: (d) => `+${fmtAmt(d)}`,
  },
  {
    label: '总利息',
    getValue: (_, s) => fmtAmt(s.totalInterest),
    getRaw: (_, s) => s.totalInterest,
    best: 'min',
    bestLabel: '最低',
    fmtDiff: (d) => `+${fmtAmt(d)}`,
  },
  {
    label: '总还款额',
    getValue: (_, s) => fmtAmt(s.totalPayment),
    getRaw: (_, s) => s.totalPayment,
    best: 'min',
    bestLabel: '最低',
    fmtDiff: (d) => `+${fmtAmt(d)}`,
  },
  {
    label: '还款期数',
    getValue: (_, s) => `${s.termMonths} 期`,
    getRaw: (_, s) => s.termMonths,
    best: 'min',
    bestLabel: '最少',
    fmtDiff: (d) => `+${d} 期`,
  },
  {
    label: '月均利息',
    getValue: (_, s) =>
      s.termMonths > 0
        ? fmtAmt(Math.round((s.totalInterest / s.termMonths) * 100) / 100)
        : '—',
    getRaw: (_, s) =>
      s.termMonths > 0 ? s.totalInterest / s.termMonths : Number.MAX_VALUE,
    best: 'min',
    bestLabel: '最低',
    fmtDiff: (d) => `+${fmtAmt(Math.round(d * 100) / 100)}`,
  },
  {
    label: '利息占比',
    getValue: (_, s) =>
      s.totalPayment > 0
        ? fmtPct(Math.round((s.totalInterest / s.totalPayment) * 10000) / 100)
        : '—',
    getRaw: (_, s) =>
      s.totalPayment > 0 ? s.totalInterest / s.totalPayment : 1,
    best: 'min',
    bestLabel: '最低',
    fmtDiff: (d) => `+${fmtPct(Math.round(d * 10000) / 100)}`,
  },
  {
    label: '预计还清日期',
    getValue: (l) => {
      const last = getLastRegular(l);
      return last?.paymentDate ?? '—';
    },
    getRaw: (l) => {
      const last = getLastRegular(l);
      return last ? new Date(last.paymentDate).getTime() : Number.MAX_VALUE;
    },
    best: 'min',
    bestLabel: '最早',
  },
];

export function ComparisonTable({ loans }: Props) {
  const summaries = useMemo(
    () => loans.map((l) => calcScheduleSummary(l.schedule)),
    [loans],
  );

  const rowMeta = useMemo(() => {
    return ROWS.map((row) => {
      if (row.best === 'none') return { bestIdx: -1, bestVal: 0 };
      const values = loans.map((l, i) => row.getRaw(l, summaries[i]));
      if (values.every((v) => v === values[0]))
        return { bestIdx: -1, bestVal: values[0] };
      const bestVal =
        row.best === 'min' ? Math.min(...values) : Math.max(...values);
      return { bestIdx: values.indexOf(bestVal), bestVal };
    });
  }, [loans, summaries]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
              指标
            </th>
            {loans.map((loan) => (
              <th
                key={loan.id}
                className="text-right px-4 py-3 font-medium whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: loan.color }}
                  />
                  {loan.name}
                </span>
              </th>
            ))}
            <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
              最优
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, ri) => {
            const { bestIdx, bestVal } = rowMeta[ri];
            return (
              <tr
                key={row.label}
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  {row.label}
                </td>
                {loans.map((loan, li) => {
                  const isBest = bestIdx === li;
                  const raw = row.getRaw(loan, summaries[li]);
                  const diff = bestIdx >= 0 && !isBest ? raw - bestVal : 0;
                  const showDiff = diff !== 0 && row.fmtDiff;
                  return (
                    <td
                      key={loan.id}
                      className={`text-right px-4 py-2.5 whitespace-nowrap ${
                        isBest
                          ? 'text-green-600 dark:text-green-400 font-medium'
                          : ''
                      }`}
                    >
                      <div>{row.getValue(loan, summaries[li])}</div>
                      {showDiff && (
                        <div className="text-xs text-red-500 dark:text-red-400">
                          {row.fmtDiff?.(diff)}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="text-right px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  {bestIdx >= 0 ? (row.bestLabel ?? '最优') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
