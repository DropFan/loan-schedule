import { useMemo } from 'react';
import { calcScheduleSummary } from '@/core/calculator/LoanCalculator';
import type { SelectedLoan } from '../ComparePage';

interface Props {
  loans: SelectedLoan[];
}

const fmtAmt = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type RowDef = {
  label: string;
  getValue: (
    loan: SelectedLoan,
    summary: ReturnType<typeof calcScheduleSummary>,
  ) => string | number;
  getRaw: (
    loan: SelectedLoan,
    summary: ReturnType<typeof calcScheduleSummary>,
  ) => number;
  best: 'min' | 'max' | 'none';
};

const ROWS: RowDef[] = [
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
    getValue: (l) => `${l.params.annualInterestRate}%`,
    getRaw: (l) => l.params.annualInterestRate,
    best: 'min',
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
  },
  {
    label: '总利息',
    getValue: (_, s) => fmtAmt(s.totalInterest),
    getRaw: (_, s) => s.totalInterest,
    best: 'min',
  },
  {
    label: '总还款额',
    getValue: (_, s) => fmtAmt(s.totalPayment),
    getRaw: (_, s) => s.totalPayment,
    best: 'min',
  },
  {
    label: '还款期数',
    getValue: (_, s) => `${s.termMonths} 期`,
    getRaw: (_, s) => s.termMonths,
    best: 'min',
  },
];

export function ComparisonTable({ loans }: Props) {
  const summaries = useMemo(
    () => loans.map((l) => calcScheduleSummary(l.schedule)),
    [loans],
  );

  const bestIndices = useMemo(() => {
    return ROWS.map((row) => {
      if (row.best === 'none') return -1;
      const values = loans.map((l, i) => row.getRaw(l, summaries[i]));
      // 全部相同则不标注
      if (values.every((v) => v === values[0])) return -1;
      const target =
        row.best === 'min' ? Math.min(...values) : Math.max(...values);
      return values.indexOf(target);
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
          {ROWS.map((row, ri) => (
            <tr
              key={row.label}
              className="border-b border-border last:border-0"
            >
              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                {row.label}
              </td>
              {loans.map((loan, li) => {
                const isBest = bestIndices[ri] === li;
                return (
                  <td
                    key={loan.id}
                    className={`text-right px-4 py-2.5 whitespace-nowrap ${
                      isBest
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : ''
                    }`}
                  >
                    {row.getValue(loan, summaries[li])}
                  </td>
                );
              })}
              <td className="text-right px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                {bestIndices[ri] >= 0
                  ? `${row.best === 'min' ? '最低' : '最高'}${row.label === '还款期数' ? '（最少）' : ''}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
