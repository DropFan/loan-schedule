import { ChangeForm, ChangeTimeline } from '@/features/changes';
import { LoanForm } from './components/LoanForm';
import { ScheduleTable } from './components/ScheduleTable';
import { SummaryCards } from './components/SummaryCards';

export function CalculatorPage() {
  return (
    <div className="p-4 lg:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-4 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <LoanForm />
          <ChangeForm />
          <ChangeTimeline />
        </div>
        <div className="space-y-4 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <SummaryCards />
          <ScheduleTable />
        </div>
      </div>
    </div>
  );
}
