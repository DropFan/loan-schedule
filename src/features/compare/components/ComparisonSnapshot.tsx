import { X } from 'lucide-react';
import { useMemo } from 'react';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
import type { SelectedLoan } from '../ComparePage';

interface Props {
  loans: SelectedLoan[];
  period: number;
  onClose: () => void;
}

const fmtAmt = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

interface PeriodSnapshot {
  /** 该期是否存在数据 */
  exists: boolean;
  paymentDate: string;
  monthlyPayment: number;
  remainingLoan: number;
  cumPrincipal: number;
  cumInterest: number;
  cumPayment: number;
  /** 已还本金 / 贷款总额 */
  paidRatio: number;
}

function calcSnapshot(
  schedule: PaymentScheduleItem[],
  loanAmount: number,
  targetPeriod: number,
): PeriodSnapshot {
  let cumPrincipal = 0;
  let cumInterest = 0;
  let cumPayment = 0;
  let targetItem: PaymentScheduleItem | null = null;

  for (const item of schedule) {
    if (item.period <= targetPeriod) {
      cumPrincipal += item.principal;
      cumInterest += item.interest;
      cumPayment += item.monthlyPayment;
    }
    if (item.period === targetPeriod) {
      targetItem = item;
    }
  }

  if (!targetItem) {
    return {
      exists: false,
      paymentDate: '',
      monthlyPayment: 0,
      remainingLoan: 0,
      cumPrincipal: 0,
      cumInterest: 0,
      cumPayment: 0,
      paidRatio: 0,
    };
  }

  return {
    exists: true,
    paymentDate: targetItem.paymentDate,
    monthlyPayment: targetItem.monthlyPayment,
    remainingLoan: targetItem.remainingLoan,
    cumPrincipal: Math.round(cumPrincipal * 100) / 100,
    cumInterest: Math.round(cumInterest * 100) / 100,
    cumPayment: Math.round(cumPayment * 100) / 100,
    paidRatio: loanAmount > 0 ? (cumPrincipal / loanAmount) * 100 : 0,
  };
}

type RowDef = {
  label: string;
  getValue: (s: PeriodSnapshot) => string;
  getRaw: (s: PeriodSnapshot) => number;
  best: 'min' | 'max' | 'none';
  bestLabel?: string;
};

const ROWS: RowDef[] = [
  {
    label: '还款日期',
    getValue: (s) => s.paymentDate || '—',
    getRaw: () => 0,
    best: 'none',
  },
  {
    label: '当期月供',
    getValue: (s) => (s.exists ? fmtAmt(s.monthlyPayment) : '—'),
    getRaw: (s) => s.monthlyPayment,
    best: 'min',
    bestLabel: '最低',
  },
  {
    label: '已还本金',
    getValue: (s) => (s.exists ? fmtAmt(s.cumPrincipal) : '—'),
    getRaw: (s) => s.cumPrincipal,
    best: 'max',
    bestLabel: '最多',
  },
  {
    label: '已还利息',
    getValue: (s) => (s.exists ? fmtAmt(s.cumInterest) : '—'),
    getRaw: (s) => s.cumInterest,
    best: 'min',
    bestLabel: '最少',
  },
  {
    label: '已还总额',
    getValue: (s) => (s.exists ? fmtAmt(s.cumPayment) : '—'),
    getRaw: (s) => s.cumPayment,
    best: 'min',
    bestLabel: '最少',
  },
  {
    label: '剩余贷款',
    getValue: (s) => (s.exists ? fmtAmt(s.remainingLoan) : '—'),
    getRaw: (s) => s.remainingLoan,
    best: 'min',
    bestLabel: '最少',
  },
  {
    label: '还款进度',
    getValue: (s) => (s.exists ? fmtPct(s.paidRatio) : '—'),
    getRaw: (s) => s.paidRatio,
    best: 'max',
    bestLabel: '最快',
  },
];

export function ComparisonSnapshot({ loans, period, onClose }: Props) {
  const snapshots = useMemo(
    () =>
      loans.map((l) => calcSnapshot(l.schedule, l.params.loanAmount, period)),
    [loans, period],
  );

  const bestIndices = useMemo(() => {
    return ROWS.map((row) => {
      if (row.best === 'none') return -1;
      const values = snapshots.map((s) => (s.exists ? row.getRaw(s) : null));
      const valid = values.filter((v): v is number => v != null);
      if (valid.length < 2) return -1;
      if (valid.every((v) => v === valid[0])) return -1;
      const target =
        row.best === 'min' ? Math.min(...valid) : Math.max(...valid);
      return values.indexOf(target);
    });
  }, [snapshots]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-x-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">截止第 {period} 期对比</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-muted/30 text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
              指标
            </th>
            {loans.map((loan) => (
              <th
                key={loan.id}
                className="text-right px-4 py-2.5 font-medium whitespace-nowrap"
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
            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
              最优
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, ri) => {
            const bestIdx = bestIndices[ri];
            return (
              <tr
                key={row.label}
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                  {row.label}
                </td>
                {snapshots.map((snap, li) => {
                  const isBest = bestIdx === li;
                  return (
                    <td
                      key={loans[li].id}
                      className={`text-right px-4 py-2 whitespace-nowrap ${
                        isBest
                          ? 'text-green-600 dark:text-green-400 font-medium'
                          : ''
                      }`}
                    >
                      {snap.exists ? row.getValue(snap) : '—'}
                    </td>
                  );
                })}
                <td className="text-right px-4 py-2 text-muted-foreground whitespace-nowrap">
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
