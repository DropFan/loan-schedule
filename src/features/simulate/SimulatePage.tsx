import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  type CombinedViewMode,
  CombinedViewTabs,
} from '@/components/shared/CombinedViewTabs';
import { LoanSwitcher } from '@/components/shared/LoanSwitcher';
import {
  combinedToSchedule,
  mergeCombinedSchedule,
} from '@/core/calculator/CombinedLoanHelper';
import type {
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { useCombinedLoan } from '@/hooks/useCombinedLoan';
import { useLoanStore } from '@/stores/useLoanStore';
import { OpportunityCost } from './components/OpportunityCost';
import { PrepaymentOptimizer } from './components/PrepaymentOptimizer';
import { SimulateChart } from './components/SimulateChart';
import { SimulateForm } from './components/SimulateForm';
import { SimulateResult } from './components/SimulateResult';
import { SimulateTable } from './components/SimulateTable';
import { SmartAnalysis } from './components/SmartAnalysis';
import { type SimulateInput, useSimulation } from './useSimulation';

/** 从 schedule 中提取模拟所需的派生数据 */
function deriveScheduleMeta(schedule: PaymentScheduleItem[]) {
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
}

export function SimulatePage() {
  const { schedule, params } = useLoanStore();
  const switchSubLoan = useLoanStore((s) => s.switchSubLoan);
  const { loanA, loanB, isCombinedMode } = useCombinedLoan();
  const [viewMode, setViewMode] = useState<CombinedViewMode>('combined');

  // 合计视图中，选择模拟哪个子方案（0=A, 1=B）
  const [simLoanIndex, setSimLoanIndex] = useState<0 | 1>(0);

  const handleViewChange = (mode: CombinedViewMode) => {
    setViewMode(mode);
    if (mode === 0 || mode === 1) {
      switchSubLoan(mode);
    }
  };

  const isCombinedView = isCombinedMode && viewMode === 'combined';

  // 合计视图：选中的子方案数据
  const simLoan = isCombinedView ? (simLoanIndex === 0 ? loanA : loanB) : null;
  const otherLoan = isCombinedView
    ? simLoanIndex === 0
      ? loanB
      : loanA
    : null;

  // 模拟表单使用的 schedule 和 params
  const formSchedule = isCombinedView && simLoan ? simLoan.schedule : schedule;
  const formParams: LoanParameters | null =
    isCombinedView && simLoan ? simLoan.params : params;

  const [input, setInput] = useState<SimulateInput>({
    mode: 'adjust-monthly',
    newMonthly: undefined,
    startPeriod: undefined,
    lumpSumAmount: undefined,
    lumpSumPeriod: undefined,
    lumpSumStrategy: 'shorten-term',
    investmentRate: 2.5,
  });

  const { remainingLoan, defaultPeriod, periodMap } = useMemo(
    () => deriveScheduleMeta(formSchedule),
    [formSchedule],
  );

  const activePeriod =
    input.mode === 'adjust-monthly'
      ? (input.startPeriod ?? defaultPeriod)
      : (input.lumpSumPeriod ?? defaultPeriod);
  const currentMonthlyPayment =
    periodMap.get(activePeriod)?.monthlyPayment ??
    periodMap.get(defaultPeriod)?.monthlyPayment ??
    0;

  const effectiveInput = useMemo(
    () => ({
      ...input,
      startPeriod: input.startPeriod ?? defaultPeriod,
      lumpSumPeriod: input.lumpSumPeriod ?? defaultPeriod,
    }),
    [input, defaultPeriod],
  );

  const result = useSimulation(formSchedule, formParams, effectiveInput);

  const hasSchedule = formSchedule.length > 0 && formParams !== null;

  const startPeriod =
    input.mode === 'adjust-monthly'
      ? (effectiveInput.startPeriod ?? 1)
      : (effectiveInput.lumpSumPeriod ?? 1);

  const handleSmartApply = (patch: Partial<SimulateInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  // 合计视图：合并的原始和模拟后 schedule（用于图表和明细表）
  const { displayOriginal, displaySimulated } = useMemo(() => {
    if (!isCombinedView || !simLoan || !otherLoan || !result?.simulatedSchedule)
      return { displayOriginal: formSchedule, displaySimulated: null };

    const original = combinedToSchedule(
      mergeCombinedSchedule(loanA?.schedule ?? [], loanB?.schedule ?? []),
    );
    const simulated = combinedToSchedule(
      mergeCombinedSchedule(
        simLoanIndex === 0 ? result.simulatedSchedule : (loanA?.schedule ?? []),
        simLoanIndex === 1 ? result.simulatedSchedule : (loanB?.schedule ?? []),
      ),
    );
    return { displayOriginal: original, displaySimulated: simulated };
  }, [
    isCombinedView,
    simLoan,
    otherLoan,
    simLoanIndex,
    loanA,
    loanB,
    result?.simulatedSchedule,
    formSchedule,
  ]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-lg font-semibold">还款模拟</h2>
      <LoanSwitcher />
      {isCombinedMode && loanA && loanB && (
        <CombinedViewTabs
          loanA={loanA}
          loanB={loanB}
          value={viewMode}
          onChange={handleViewChange}
        />
      )}

      {!hasSchedule && !isCombinedView && (
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

      {(hasSchedule || isCombinedView) && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
          {/* 左侧：输入区 */}
          <div className="space-y-4">
            {isCombinedView && loanA && loanB && (
              <PrepaymentOptimizer
                scheduleA={loanA.schedule}
                paramsA={loanA.params}
                scheduleB={loanB.schedule}
                paramsB={loanB.params}
                nameA={loanA.name}
                nameB={loanB.name}
                onApplyPlan={({ amount: amt, loanIndex, strategy: strat }) => {
                  setSimLoanIndex(loanIndex);
                  setInput((prev) => ({
                    ...prev,
                    mode: 'lump-sum',
                    lumpSumAmount: amt,
                    lumpSumStrategy: strat,
                  }));
                }}
              />
            )}

            {/* 合计视图：子方案选择器 */}
            {isCombinedView && loanA && loanB && (
              <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  选择模拟的子方案
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSimLoanIndex(0)}
                    className={`flex-1 text-sm py-1.5 px-3 rounded-md border transition-colors ${
                      simLoanIndex === 0
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {loanA.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimLoanIndex(1)}
                    className={`flex-1 text-sm py-1.5 px-3 rounded-md border transition-colors ${
                      simLoanIndex === 1
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {loanB.name}
                  </button>
                </div>
              </div>
            )}

            <SimulateForm
              input={input}
              onChange={setInput}
              schedule={formSchedule}
              currentMonthlyPayment={currentMonthlyPayment}
              remainingLoan={remainingLoan}
              defaultStartPeriod={defaultPeriod}
              defaultLumpSumPeriod={defaultPeriod}
            />
          </div>

          {/* 右侧：结果区 */}
          <div className="space-y-4">
            {result && <SimulateResult result={result} />}
            {result?.isValid && <OpportunityCost result={result} />}
            {result?.isValid && (
              <SimulateChart
                originalSchedule={displayOriginal}
                simulatedSchedule={displaySimulated ?? result.simulatedSchedule}
                startPeriod={startPeriod}
                onPeriodChange={(period) => {
                  setInput((prev) => ({
                    ...prev,
                    ...(prev.mode === 'lump-sum'
                      ? { lumpSumPeriod: period }
                      : { startPeriod: period }),
                  }));
                }}
              />
            )}
            {formParams && (
              <SmartAnalysis
                schedule={formSchedule}
                params={formParams}
                input={effectiveInput}
                currentMonthlyPayment={currentMonthlyPayment}
                onApply={handleSmartApply}
              />
            )}
            {result?.isValid && (
              <SimulateTable
                originalSchedule={displayOriginal}
                simulatedSchedule={displaySimulated ?? result.simulatedSchedule}
                startPeriod={startPeriod}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
