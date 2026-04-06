import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  combinedToSchedule,
  mergeCombinedSchedule,
} from '@/core/calculator/CombinedLoanHelper';
import type {
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { trackEvent } from '@/core/utils/analytics';
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
  /** 组合方案的子方案参数（用于对比页分项展示） */
  subParams?: [LoanParameters, LoanParameters];
  /** 组合方案子方案的当前利率 */
  subCurrentRates?: [number, number];
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
  subParams?: [LoanParameters, LoanParameters];
  subCurrentRates?: [number, number];
}

/** 从 schedule 中提取当前最新利率（最后一个 paymentDate <= today 的常规期） */
function getLatestRate(schedule: PaymentScheduleItem[]): number {
  const today = new Date().toISOString().split('T')[0];
  let rate = 0;
  for (const item of schedule) {
    if (item.period <= 0) continue;
    if (item.paymentDate > today) break;
    rate = item.annualInterestRate;
  }
  if (rate === 0) {
    const regular = schedule.filter((s) => s.period > 0);
    if (regular.length > 0)
      rate = regular[regular.length - 1].annualInterestRate;
  }
  return rate;
}

export function ComparePage() {
  const {
    savedLoans,
    savedGroups,
    activeLoanId,
    activeGroupId,
    params,
    schedule,
  } = useLoanStore();

  // 组装可对比方案列表：savedLoans + 组合方案 + 当前未保存方案
  const loanOptions: LoanOption[] = [];

  for (const loan of savedLoans) {
    if (loan.params && loan.schedule.length > 0) {
      loanOptions.push({
        id: loan.id,
        name: loan.name,
        isActive: loan.id === activeLoanId && !activeGroupId,
        params: loan.params,
        schedule: loan.schedule,
      });
    }
  }

  // 组合方案：合并 schedule 作为对比数据
  const groupScheduleMap = useMemo(() => {
    const map = new Map<string, PaymentScheduleItem[]>();
    for (const group of savedGroups) {
      const a = savedLoans.find((l) => l.id === group.loanIds[0]);
      const b = savedLoans.find((l) => l.id === group.loanIds[1]);
      if (a?.schedule.length && b?.schedule.length) {
        map.set(
          group.id,
          combinedToSchedule(mergeCombinedSchedule(a.schedule, b.schedule)),
        );
      }
    }
    return map;
  }, [savedGroups, savedLoans]);

  for (const group of savedGroups) {
    const mergedSchedule = groupScheduleMap.get(group.id);
    if (!mergedSchedule?.length) continue;
    const a = savedLoans.find((l) => l.id === group.loanIds[0]);
    const b = savedLoans.find((l) => l.id === group.loanIds[1]);
    if (!a?.params || !b?.params) continue;
    const pa = a.params;
    const pb = b.params;
    loanOptions.push({
      id: `group:${group.id}`,
      name: `[组合] ${group.name}`,
      isActive: group.id === activeGroupId,
      params: {
        ...pa,
        loanAmount: pa.loanAmount + pb.loanAmount,
        loanTermMonths: Math.max(pa.loanTermMonths, pb.loanTermMonths),
        annualInterestRate:
          pa.loanAmount + pb.loanAmount > 0
            ? (pa.annualInterestRate * pa.loanAmount +
                pb.annualInterestRate * pb.loanAmount) /
              (pa.loanAmount + pb.loanAmount)
            : 0,
      },
      schedule: mergedSchedule,
      subParams: [pa, pb],
      subCurrentRates: [getLatestRate(a.schedule), getLatestRate(b.schedule)],
    });
  }

  // 当前方案未保存时，加入列表
  const hasUnsaved = params && !savedLoans.some((l) => l.id === activeLoanId);
  if (hasUnsaved && schedule.length > 0 && !activeGroupId) {
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
      <div className="p-4 lg:p-6 space-y-4">
        <h2 className="text-lg font-semibold">方案对比</h2>
        <div className="max-w-lg mx-auto mt-12 bg-card border border-border rounded-xl p-8 space-y-4 text-center">
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
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-lg font-semibold">方案对比</h2>

      <LoanSelector
        loans={loanOptions}
        selected={selected}
        onChange={(ids: string[]) => {
          setSelected(ids);
          if (ids.length >= 2)
            trackEvent('loans_compared', { loan_count: ids.length });
        }}
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
