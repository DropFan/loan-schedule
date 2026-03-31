import { useState } from 'react';
import { Link } from 'react-router';
import { LoanSwitcher } from '@/components/shared/LoanSwitcher';
import { useLoanStore } from '@/stores/useLoanStore';
import { SimulateChart } from './components/SimulateChart';
import { SimulateForm } from './components/SimulateForm';
import { SimulateResult } from './components/SimulateResult';
import { type SimulateInput, useSimulation } from './useSimulation';

export function SimulatePage() {
  const { schedule, params } = useLoanStore();

  const [input, setInput] = useState<SimulateInput>({
    mode: 'extra-monthly',
    extraMonthly: undefined,
    startPeriod: undefined,
    lumpSumAmount: undefined,
    lumpSumPeriod: undefined,
    lumpSumStrategy: 'shorten-term',
  });

  const result = useSimulation(schedule, params, input);

  const hasSchedule = schedule.length > 0 && params !== null;

  const startPeriod =
    input.mode === 'extra-monthly'
      ? (input.startPeriod ?? 1)
      : (input.lumpSumPeriod ?? 1);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-lg font-semibold">还款模拟</h2>
      <LoanSwitcher />

      {!hasSchedule && (
        <div className="max-w-lg mx-auto mt-12 text-center">
          <div className="bg-card border border-border rounded-xl p-8 space-y-4">
            <p className="text-muted-foreground">
              请先在贷款计算页面设置贷款参数并生成还款计划
            </p>
            <Link
              to="/"
              className="inline-block mt-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              去贷款计算页
            </Link>
          </div>
        </div>
      )}

      {hasSchedule && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          <SimulateForm input={input} onChange={setInput} schedule={schedule} />

          <div className="space-y-4">
            {result && <SimulateResult result={result} />}
            {result?.isValid && (
              <SimulateChart
                originalSchedule={schedule}
                simulatedSchedule={result.simulatedSchedule}
                startPeriod={startPeriod}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
