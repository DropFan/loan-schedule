import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { LoanSwitcher } from '@/components/shared/LoanSwitcher';
import { useLoanStore } from '@/stores/useLoanStore';
import { OpportunityCost } from './components/OpportunityCost';
import { SimulateChart } from './components/SimulateChart';
import { SimulateForm } from './components/SimulateForm';
import { SimulateResult } from './components/SimulateResult';
import { SimulateTable } from './components/SimulateTable';
import { SmartAnalysis } from './components/SmartAnalysis';
import { type SimulateInput, useSimulation } from './useSimulation';

export function SimulatePage() {
  const { schedule, params } = useLoanStore();

  const [input, setInput] = useState<SimulateInput>({
    mode: 'adjust-monthly',
    monthlyAdjust: undefined,
    startPeriod: undefined,
    lumpSumAmount: undefined,
    lumpSumPeriod: undefined,
    lumpSumStrategy: 'shorten-term',
    investmentRate: 2.5,
  });

  // 计算当前月供、剩余本金、默认下一期
  const { currentMonthlyPayment, remainingLoan, defaultNextPeriod } =
    useMemo(() => {
      const regular = schedule.filter((s) => s.period > 0);
      if (regular.length === 0)
        return {
          currentMonthlyPayment: 0,
          remainingLoan: 0,
          defaultNextPeriod: 1,
        };
      const today = new Date().toISOString().split('T')[0];
      let nextPeriod = regular[regular.length - 1].period;
      for (const item of regular) {
        if (item.paymentDate > today) {
          nextPeriod = item.period;
          break;
        }
      }
      return {
        currentMonthlyPayment: regular[0].monthlyPayment,
        remainingLoan: regular[0].remainingLoan + regular[0].principal,
        defaultNextPeriod: nextPeriod,
      };
    }, [schedule]);

  // 实际生效的 input（用默认值填充 undefined 的期数）
  const effectiveInput = useMemo(
    () => ({
      ...input,
      startPeriod: input.startPeriod ?? defaultNextPeriod,
      lumpSumPeriod: input.lumpSumPeriod ?? defaultNextPeriod,
    }),
    [input, defaultNextPeriod],
  );

  const result = useSimulation(schedule, params, effectiveInput);

  const hasSchedule = schedule.length > 0 && params !== null;

  const startPeriod =
    input.mode === 'adjust-monthly'
      ? (effectiveInput.startPeriod ?? 1)
      : (effectiveInput.lumpSumPeriod ?? 1);

  const handleSmartApply = (patch: Partial<SimulateInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
          <SimulateForm
            input={input}
            onChange={setInput}
            schedule={schedule}
            currentMonthlyPayment={currentMonthlyPayment}
            remainingLoan={remainingLoan}
            defaultPeriod={defaultNextPeriod}
          />

          <div className="space-y-4">
            {result && <SimulateResult result={result} />}
            {result?.isValid && <OpportunityCost result={result} />}
            {result?.isValid && (
              <SimulateChart
                originalSchedule={schedule}
                simulatedSchedule={result.simulatedSchedule}
                startPeriod={startPeriod}
              />
            )}
            {params && (
              <SmartAnalysis
                schedule={schedule}
                params={params}
                input={effectiveInput}
                currentMonthlyPayment={currentMonthlyPayment}
                onApply={handleSmartApply}
              />
            )}
            {result?.isValid && (
              <SimulateTable
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
