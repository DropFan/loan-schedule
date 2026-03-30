import { LoanSwitcher } from '@/components/shared/LoanSwitcher';
import { ChangeForm, ChangeTimeline } from '@/features/changes';
import { useLoanStore } from '@/stores/useLoanStore';
import { LoanForm } from './components/LoanForm';
import { ScheduleTable } from './components/ScheduleTable';
import { SummaryCards } from './components/SummaryCards';

export function CalculatorPage() {
  const activeLoanId = useLoanStore((s) => s.activeLoanId);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <LoanSwitcher />
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
