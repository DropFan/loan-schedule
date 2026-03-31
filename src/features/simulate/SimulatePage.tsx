import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { LoanSwitcher } from '@/components/shared/LoanSwitcher';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
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
    newMonthly: undefined,
    startPeriod: undefined,
    lumpSumAmount: undefined,
    lumpSumPeriod: undefined,
    lumpSumStrategy: 'shorten-term',
    investmentRate: 2.5,
  });

  // 默认期数 = 下次要还的那一期；月供和剩余本金也取这一期
  const { remainingLoan, defaultPeriod, periodMap } = useMemo(() => {
    const regular = schedule.filter((s) => s.period > 0);
    if (regular.length === 0)
      return {
        remainingLoan: 0,
        defaultPeriod: 1,
        periodMap: new Map<number, PaymentScheduleItem>(),
      };
    const today = new Date().toISOString().split('T')[0];
    let nextPeriod = regular[regular.length - 1].period;
    for (const item of regular) {
      if (item.paymentDate > today) {
        nextPeriod = item.period;
        break;
      }
    }
    const target = regular.find((s) => s.period === nextPeriod) ?? regular[0];
    return {
      remainingLoan: target.remainingLoan + target.principal,
      defaultPeriod: nextPeriod,
      periodMap: new Map(regular.map((s) => [s.period, s])),
    };
  }, [schedule]);

  // 当前月供：取选定期数对应的月供
  const activePeriod =
    input.mode === 'adjust-monthly'
      ? (input.startPeriod ?? defaultPeriod)
      : (input.lumpSumPeriod ?? defaultPeriod);
  const currentMonthlyPayment =
    periodMap.get(activePeriod)?.monthlyPayment ??
    periodMap.get(defaultPeriod)?.monthlyPayment ??
    0;

  // 实际生效的 input（用默认值填充 undefined 的期数）
  const effectiveInput = useMemo(
    () => ({
      ...input,
      startPeriod: input.startPeriod ?? defaultPeriod,
      lumpSumPeriod: input.lumpSumPeriod ?? defaultPeriod,
    }),
    [input, defaultPeriod],
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
            defaultStartPeriod={defaultPeriod}
            defaultLumpSumPeriod={defaultPeriod}
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
