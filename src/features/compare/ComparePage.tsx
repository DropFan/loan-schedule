import { useState } from 'react';
import { Link } from 'react-router';
import type {
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { useLoanStore } from '@/stores/useLoanStore';
import { ComparisonOverlay } from './components/ComparisonOverlay';
import { ComparisonSnapshot } from './components/ComparisonSnapshot';
import { ComparisonTable } from './components/ComparisonTable';
import { LoanSelector } from './components/LoanSelector';

export interface LoanOption {
  id: string;
  name: string;
  isActive: boolean;
  params: LoanParameters;
  schedule: PaymentScheduleItem[];
}

export type Dimension = 'payment' | 'cumulative' | 'remaining' | 'interest';

export const COMPARE_COLORS = ['#4f8cff', '#4caf50', '#ff9800', '#e91e63'];

export interface SelectedLoan {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  params: LoanParameters;
  schedule: PaymentScheduleItem[];
}

export function ComparePage() {
  const { savedLoans, activeLoanId, params, schedule } = useLoanStore();

  // 组装可对比方案列表：savedLoans + 当前未保存方案
  const loanOptions: LoanOption[] = [];

  for (const loan of savedLoans) {
    if (loan.params && loan.schedule.length > 0) {
      loanOptions.push({
        id: loan.id,
        name: loan.name,
        isActive: loan.id === activeLoanId,
        params: loan.params,
        schedule: loan.schedule,
      });
    }
  }

  // 当前方案未保存时，加入列表
  const hasUnsaved = params && !savedLoans.some((l) => l.id === activeLoanId);
  if (hasUnsaved && schedule.length > 0) {
    loanOptions.push({
      id: '__current__',
      name: '当前方案（未保存）',
      isActive: true,
      params,
      schedule,
    });
  }

  // 默认选中当前活跃方案
  const [selected, setSelected] = useState<string[]>(() => {
    const active = loanOptions.find((l) => l.isActive);
    return active ? [active.id] : [];
  });

  const [dimension, setDimension] = useState<Dimension>('payment');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  // 空状态
  if (loanOptions.length < 2) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="bg-card border border-border rounded-xl p-8 space-y-4">
          <h2 className="text-lg font-semibold">方案对比</h2>
          <p className="text-muted-foreground">
            保存至少 2 个贷款方案即可进行对比
          </p>
          <p className="text-sm text-muted-foreground">
            您可以在贷款计算页调整不同参数（利率、期限、还款方式等），保存为不同方案后进行横向对比
          </p>
          <Link
            to="/"
            className="inline-block mt-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            去贷款计算页
          </Link>
        </div>
      </div>
    );
  }

  // 构建选中方案的详情
  const selectedLoans: SelectedLoan[] = selected
    .map((id, i) => {
      const loan = loanOptions.find((l) => l.id === id);
      if (!loan) return null;
      return {
        ...loan,
        color: COMPARE_COLORS[i % COMPARE_COLORS.length],
      };
    })
    .filter((l): l is SelectedLoan => l !== null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">方案对比</h2>

      <LoanSelector
        loans={loanOptions}
        selected={selected}
        onChange={setSelected}
      />

      {selectedLoans.length >= 2 ? (
        <>
          <ComparisonOverlay
            loans={selectedLoans}
            dimension={dimension}
            onDimensionChange={setDimension}
            selectedPeriod={selectedPeriod}
            onPeriodSelect={setSelectedPeriod}
          />
          {selectedPeriod != null && (
            <ComparisonSnapshot
              loans={selectedLoans}
              period={selectedPeriod}
              onClose={() => setSelectedPeriod(null)}
            />
          )}
          <ComparisonTable loans={selectedLoans} />
        </>
      ) : (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm bg-card border border-border rounded-xl">
          请至少选择 2 个方案
        </div>
      )}
    </div>
  );
}
