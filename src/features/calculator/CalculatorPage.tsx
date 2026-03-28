import { LoanForm } from './components/LoanForm';
import { SummaryCards } from './components/SummaryCards';

export function CalculatorPage() {
  return (
    <div className="p-4 lg:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* 左列：输入区 */}
        <div className="space-y-4 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <LoanForm />
          {/* ChangeForm + ChangeTimeline 将在 Task 6 添加 */}
        </div>

        {/* 右列：输出区 */}
        <div className="space-y-4 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <SummaryCards />
          {/* ScheduleTable 将在 Task 7 添加 */}
        </div>
      </div>
    </div>
  );
}
