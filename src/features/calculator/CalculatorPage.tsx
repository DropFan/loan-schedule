import { useState } from 'react';
import {
  type CombinedViewMode,
  CombinedViewTabs,
} from '@/components/shared/CombinedViewTabs';
import { LoanSwitcher } from '@/components/shared/LoanSwitcher';
import { ChangeForm, ChangeTimeline } from '@/features/changes';
import { useCombinedLoan } from '@/hooks/useCombinedLoan';
import { useLoanStore } from '@/stores/useLoanStore';
import { LoanForm } from './components/LoanForm';
import { ScheduleTable } from './components/ScheduleTable';
import { SummaryCards } from './components/SummaryCards';

export function CalculatorPage() {
  const activeLoanId = useLoanStore((s) => s.activeLoanId);
  const switchSubLoan = useLoanStore((s) => s.switchSubLoan);
  const {
    group,
    loanA,
    loanB,
    combinedSchedule,
    combinedSummary,
    isCombinedMode,
  } = useCombinedLoan();
  const [viewMode, setViewMode] = useState<CombinedViewMode>('combined');

  const handleViewChange = (mode: CombinedViewMode) => {
    setViewMode(mode);
    if (mode === 0 || mode === 1) {
      switchSubLoan(mode);
    }
  };

  const isCombinedView = isCombinedMode && viewMode === 'combined';

  // 组合模式 + 合计视图：单列全宽布局
  if (isCombinedView && loanA && loanB && group) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <h2 className="text-lg font-semibold">贷款计算</h2>
        <LoanSwitcher />
        <CombinedViewTabs
          loanA={loanA}
          loanB={loanB}
          value={viewMode}
          onChange={handleViewChange}
        />
        <SummaryCards
          combinedSummary={combinedSummary}
          subLoanNames={[loanA.name, loanB.name]}
        />
        <ScheduleTable combinedSchedule={combinedSchedule} />
        <ChangeTimeline
          combined={{
            changesA: loanA.changes,
            changesB: loanB.changes,
            nameA: loanA.name,
            nameB: loanB.name,
          }}
        />
      </div>
    );
  }

  // 组合模式 + 子方案视图 或 单方案模式
  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-lg font-semibold">贷款计算</h2>
      <LoanSwitcher />
      {isCombinedMode && loanA && loanB && (
        <CombinedViewTabs
          loanA={loanA}
          loanB={loanB}
          value={viewMode}
          onChange={handleViewChange}
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <LoanForm key={`loan-${activeLoanId}`} />
          <ChangeForm key={`change-${activeLoanId}`} />
          <ChangeTimeline />
        </div>
        <div className="space-y-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <SummaryCards />
          <ScheduleTable />
        </div>
      </div>
    </div>
  );
}
