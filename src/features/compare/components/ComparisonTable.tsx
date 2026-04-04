import { useMemo } from 'react';
import { calcScheduleSummary } from '@/core/calculator/LoanCalculator';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
import { LoanMethodName } from '@/core/types/loan.types';
import type { SelectedLoan } from '../ComparePage';

interface Props {
  loans: SelectedLoan[];
}

const fmtAmt = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

type Summary = ReturnType<typeof calcScheduleSummary>;

interface CurrentPeriodInfo {
  period: number;
  monthlyPayment: number;
  remainingLoan: number;
  cumPrincipal: number;
  cumInterest: number;
  paidRatio: number;
  currentRate: number;
}

type RowDef = {
  label: string;
  group?: string;
  getValue: (
    loan: SelectedLoan,
    summary: Summary,
    current: CurrentPeriodInfo,
  ) => string;
  getRaw: (
    loan: SelectedLoan,
    summary: Summary,
    current: CurrentPeriodInfo,
  ) => number;
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

/** 计算当期快照 */
function calcCurrentPeriod(
  schedule: PaymentScheduleItem[],
  loanAmount: number,
): CurrentPeriodInfo {
  const today = new Date().toISOString().split('T')[0];
  let currentItem: PaymentScheduleItem | null = null;
  let cumPrincipal = 0;
  let cumInterest = 0;

  for (const item of schedule) {
    if (item.paymentDate > today) break;
    cumPrincipal += item.principal;
    cumInterest += item.interest;
    if (item.period > 0) currentItem = item;
  }

  const currentRate = currentItem?.annualInterestRate ?? 0;

  return {
    period: currentItem?.period ?? 0,
    monthlyPayment: currentItem?.monthlyPayment ?? 0,
    remainingLoan: currentItem?.remainingLoan ?? loanAmount,
    cumPrincipal: Math.round(cumPrincipal * 100) / 100,
    cumInterest: Math.round(cumInterest * 100) / 100,
    paidRatio: loanAmount > 0 ? (cumPrincipal / loanAmount) * 100 : 0,
    currentRate,
  };
}

const ROWS: RowDef[] = [
  // ── 贷款信息 ──
  {
    group: '贷款信息',
    label: '还款方式',
    getValue: (l) => {
      if (l.subParams) {
        const [a, b] = l.subParams;
        const nameA = LoanMethodName[a.loanMethod];
        const nameB = LoanMethodName[b.loanMethod];
        return nameA === nameB ? nameA : `${nameA} + ${nameB}`;
      }
      return LoanMethodName[l.params.loanMethod];
    },
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
    label: '初始利率',
    getValue: (l) => {
      if (l.subParams) {
        const [a, b] = l.subParams;
        return a.annualInterestRate === b.annualInterestRate
          ? fmtPct(a.annualInterestRate)
          : `${fmtPct(a.annualInterestRate)} / ${fmtPct(b.annualInterestRate)}`;
      }
      return fmtPct(l.params.annualInterestRate);
    },
    getRaw: (l) => l.params.annualInterestRate,
    best: 'min',
    bestLabel: '最低',
    fmtDiff: (d) => `+${fmtPct(d)}`,
  },
  {
    label: '当前利率',
    getValue: (l, _, cur) => {
      if (l.subCurrentRates) {
        const [rA, rB] = l.subCurrentRates;
        return rA === rB ? fmtPct(rA) : `${fmtPct(rA)} / ${fmtPct(rB)}`;
      }
      return cur.currentRate > 0 ? fmtPct(cur.currentRate) : '—';
    },
    getRaw: (l, _, cur) => {
      if (l.subCurrentRates) {
        const [rA, rB] = l.subCurrentRates;
        const [pA, pB] = l.subParams ?? [l.params, l.params];
        const total = pA.loanAmount + pB.loanAmount;
        return total > 0
          ? (rA * pA.loanAmount + rB * pB.loanAmount) / total
          : 0;
      }
      return cur.currentRate;
    },
    best: 'min',
    bestLabel: '最低',
    fmtDiff: (d) => `+${fmtPct(d)}`,
  },

  // ── 月供 ──
  {
    group: '月供',
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
    label: '当期月供',
    getValue: (_, __, cur) =>
      cur.period > 0 ? fmtAmt(cur.monthlyPayment) : '—',
    getRaw: (_, __, cur) =>
      cur.period > 0 ? cur.monthlyPayment : Number.POSITIVE_INFINITY,
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

  // ── 当前状态 ──
  {
    group: '当前状态',
    label: '剩余本金',
    getValue: (_, __, cur) =>
      cur.period > 0 ? fmtAmt(cur.remainingLoan) : '—',
    getRaw: (_, __, cur) =>
      cur.period > 0 ? cur.remainingLoan : Number.MAX_VALUE,
    best: 'min',
    bestLabel: '最少',
    fmtDiff: (d) => `+${fmtAmt(d)}`,
  },
  {
    label: '已还本金',
    getValue: (_, __, cur) => (cur.period > 0 ? fmtAmt(cur.cumPrincipal) : '—'),
    getRaw: (_, __, cur) => cur.cumPrincipal,
    best: 'max',
    bestLabel: '最多',
  },
  {
    label: '已还利息',
    getValue: (_, __, cur) => (cur.period > 0 ? fmtAmt(cur.cumInterest) : '—'),
    getRaw: (_, __, cur) => cur.cumInterest,
    best: 'min',
    bestLabel: '最少',
    fmtDiff: (d) => `+${fmtAmt(d)}`,
  },
  {
    label: '还款进度',
    getValue: (_, __, cur) =>
      cur.period > 0 ? fmtPct(Math.round(cur.paidRatio * 100) / 100) : '—',
    getRaw: (_, __, cur) => cur.paidRatio,
    best: 'max',
    bestLabel: '最快',
  },

  // ── 汇总 ──
  {
    group: '汇总',
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

  const currents = useMemo(
    () => loans.map((l) => calcCurrentPeriod(l.schedule, l.params.loanAmount)),
    [loans],
  );

  const rowMeta = useMemo(() => {
    return ROWS.map((row) => {
      if (row.best === 'none') return { bestIdx: -1, bestVal: 0 };
      const values = loans.map((l, i) =>
        row.getRaw(l, summaries[i], currents[i]),
      );
      if (values.every((v) => v === values[0]))
        return { bestIdx: -1, bestVal: values[0] };
      const bestVal =
        row.best === 'min' ? Math.min(...values) : Math.max(...values);
      return { bestIdx: values.indexOf(bestVal), bestVal };
    });
  }, [loans, summaries, currents]);

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
            const showGroupHeader =
              row.group && (ri === 0 || ROWS[ri - 1].group !== row.group);
            return (
              <tr
                key={row.label}
                className={`border-b border-border last:border-0 ${showGroupHeader ? 'border-t-2 border-t-border' : ''}`}
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {showGroupHeader && (
                    <span className="text-[10px] text-muted-foreground/60 block leading-tight -mb-0.5">
                      {row.group}
                    </span>
                  )}
                  <span className="text-muted-foreground">{row.label}</span>
                </td>
                {loans.map((loan, li) => {
                  const isBest = bestIdx === li;
                  const raw = row.getRaw(loan, summaries[li], currents[li]);
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
                      <div>
                        {row.getValue(loan, summaries[li], currents[li])}
                      </div>
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
