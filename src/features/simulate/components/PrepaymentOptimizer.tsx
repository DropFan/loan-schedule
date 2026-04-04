import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { formatCurrency } from '@/core/utils/formatHelper';
import {
  type AllocationPlan,
  useCombinedSimulation,
} from '../useCombinedSimulation';

interface Props {
  scheduleA: PaymentScheduleItem[];
  paramsA: LoanParameters | null;
  scheduleB: PaymentScheduleItem[];
  paramsB: LoanParameters | null;
  nameA: string;
  nameB: string;
  /** 点击方案卡片时，联动模拟表单 */
  onApplyPlan?: (plan: {
    amount: number;
    loanIndex: 0 | 1;
    strategy: 'reduce-payment' | 'shorten-term';
  }) => void;
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

/** 取 schedule 中下一个待还期的剩余本金 */
function getNextRemaining(schedule: PaymentScheduleItem[]): number {
  const regular = schedule.filter((s) => s.period > 0);
  if (regular.length === 0) return 0;
  const today = new Date().toISOString().split('T')[0];
  for (const item of regular) {
    if (item.paymentDate > today) return item.remainingLoan + item.principal;
  }
  return regular[regular.length - 1].remainingLoan;
}

export function PrepaymentOptimizer({
  scheduleA,
  paramsA,
  scheduleB,
  paramsB,
  nameA,
  nameB,
  onApplyPlan,
}: Props) {
  const [strategy, setStrategy] = useState<'reduce-payment' | 'shorten-term'>(
    'shorten-term',
  );
  const [selectedPlan, setSelectedPlan] = useState<
    'best' | 'allToA' | 'allToB' | null
  >(null);

  // 两笔贷款剩余本金合计作为上限
  const maxAmount = useMemo(() => {
    const remA = getNextRemaining(scheduleA);
    const remB = getNextRemaining(scheduleB);
    return Math.round((remA + remB) * 100) / 100;
  }, [scheduleA, scheduleB]);

  // 滑块刻度
  const sliderTicks = useMemo(() => {
    const fmtTick = (v: number) =>
      v >= 10000 ? `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}万` : `${v}`;
    const mid = Math.round(Math.floor(maxAmount / 2 / 10000) * 10000);
    const ticks = [{ value: 0, label: '0', pct: 0 }];
    if (mid > 0 && mid < maxAmount) {
      ticks.push({
        value: mid,
        label: fmtTick(mid),
        pct: (mid / maxAmount) * 100,
      });
    }
    ticks.push({ value: maxAmount, label: fmtTick(maxAmount), pct: 100 });
    return ticks;
  }, [maxAmount]);

  const [amount, setAmount] = useState(() => Math.min(100000, maxAmount));

  const handleAmountChange = (v: number) => {
    setAmount(Math.max(0, Math.min(v, maxAmount)));
  };

  const result = useCombinedSimulation(
    scheduleA,
    paramsA,
    scheduleB,
    paramsB,
    amount,
    strategy,
  );

  // 取各自 schedule 最新利率（反映最新变更）
  const currentRateA = useMemo(() => {
    const regular = [...scheduleA].reverse().find((s) => s.period > 0);
    return regular?.annualInterestRate ?? paramsA?.annualInterestRate ?? 0;
  }, [scheduleA, paramsA]);

  const currentRateB = useMemo(() => {
    const regular = [...scheduleB].reverse().find((s) => s.period > 0);
    return regular?.annualInterestRate ?? paramsB?.annualInterestRate ?? 0;
  }, [scheduleB, paramsB]);

  // 利率差策略建议
  const strategyTip = useMemo(() => {
    if (currentRateA === 0 || currentRateB === 0) return null;
    const diff = Math.abs(currentRateA - currentRateB);
    if (diff < 0.1) return '两笔贷款利率接近，分配差异不大';
    const higher = currentRateA > currentRateB ? nameA : nameB;
    return `${higher}利率更高（${Math.max(currentRateA, currentRateB)}% vs ${Math.min(currentRateA, currentRateB)}%），优先还该方案可节省更多利息`;
  }, [currentRateA, currentRateB, nameA, nameB]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>提前还款优化分配</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 金额输入 */}
        <div className="space-y-2">
          <Label>
            可用金额（元）
            <span className="text-muted-foreground font-normal ml-2">
              上限 ¥{formatCurrency(maxAmount)}
            </span>
          </Label>
          <Input
            type="number"
            value={amount}
            min={0}
            max={maxAmount}
            step={10000}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            className="h-8"
          />
          <input
            type="range"
            min={0}
            max={maxAmount}
            step={10000}
            value={amount}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="relative text-[10px] mt-0.5 h-4">
            {sliderTicks.map((tick) => (
              <button
                key={tick.value}
                type="button"
                onClick={() => handleAmountChange(tick.value)}
                className={`absolute -translate-x-1/2 hover:text-primary transition-colors ${
                  amount === tick.value
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
                style={{ left: `${tick.pct}%` }}
              >
                {tick.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.filter((a) => a <= maxAmount).map((a) => (
              <Button
                key={a}
                variant={amount === a ? 'default' : 'outline'}
                size="xs"
                onClick={() => handleAmountChange(a)}
              >
                {a >= 10000 ? `${a / 10000}万` : a}
              </Button>
            ))}
            <Button
              variant={amount === maxAmount ? 'default' : 'outline'}
              size="xs"
              onClick={() => handleAmountChange(maxAmount)}
            >
              全部还清
            </Button>
          </div>
        </div>

        {/* 策略选择 */}
        <div className="space-y-2">
          <Label>还款方式</Label>
          <div className="flex gap-2">
            <Button
              variant={strategy === 'shorten-term' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStrategy('shorten-term')}
            >
              缩短年限
            </Button>
            <Button
              variant={strategy === 'reduce-payment' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStrategy('reduce-payment')}
            >
              减少月供
            </Button>
          </div>
        </div>

        {/* 策略建议 */}
        {strategyTip && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            {strategyTip}
          </div>
        )}

        {/* 分配结果 */}
        {result && result.plans.length > 0 && (
          <div className="space-y-3">
            {/* 最优方案 */}
            {result.best && (
              <PlanCard
                plan={result.best}
                nameA={nameA}
                nameB={nameB}
                label="最优分配（推荐）"
                selected={selectedPlan === 'best'}
                onSelect={() => {
                  setSelectedPlan('best');
                  const b = result.best;
                  if (b) {
                    // 最优分配：选金额较大的子方案作为模拟目标
                    const idx: 0 | 1 = b.amountA >= b.amountB ? 0 : 1;
                    onApplyPlan?.({
                      amount: idx === 0 ? b.amountA : b.amountB,
                      loanIndex: idx,
                      strategy,
                    });
                  }
                }}
              />
            )}

            {/* 优先还 A / 优先还 B */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.priorityA && (
                <PlanCard
                  plan={result.priorityA}
                  nameA={nameA}
                  nameB={nameB}
                  label={`优先还${nameA}`}
                  selected={selectedPlan === 'allToA'}
                  onSelect={() => {
                    setSelectedPlan('allToA');
                    onApplyPlan?.({
                      amount: result.priorityA?.amountA ?? 0,
                      loanIndex: 0,
                      strategy,
                    });
                  }}
                />
              )}
              {result.priorityB && (
                <PlanCard
                  plan={result.priorityB}
                  nameA={nameA}
                  nameB={nameB}
                  label={`优先还${nameB}`}
                  selected={selectedPlan === 'allToB'}
                  onSelect={() => {
                    setSelectedPlan('allToB');
                    onApplyPlan?.({
                      amount: result.priorityB?.amountB ?? 0,
                      loanIndex: 1,
                      strategy,
                    });
                  }}
                />
              )}
            </div>

            {/* 结论 */}
            <div className="text-sm font-medium text-primary">
              {result.conclusion}
            </div>
          </div>
        )}

        {result && result.plans.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            金额超出可还范围，请调整
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlanCard({
  plan,
  nameA,
  nameB,
  label,
  selected,
  onSelect,
}: {
  plan: AllocationPlan;
  nameA: string;
  nameB: string;
  label: string;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border-2 p-3 text-sm space-y-1 text-left w-full cursor-pointer transition-colors ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/40 hover:bg-muted/50'
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        {plan.amountA > 0 && (
          <div>
            {nameA}：¥{formatCurrency(plan.amountA)}
            {plan.interestSavedA > 0 &&
              `，省利息 ¥${formatCurrency(plan.interestSavedA)}`}
            {plan.termReducedA > 0 && `，缩短 ${plan.termReducedA} 期`}
          </div>
        )}
        {plan.amountB > 0 && (
          <div>
            {nameB}：¥{formatCurrency(plan.amountB)}
            {plan.interestSavedB > 0 &&
              `，省利息 ¥${formatCurrency(plan.interestSavedB)}`}
            {plan.termReducedB > 0 && `，缩短 ${plan.termReducedB} 期`}
          </div>
        )}
      </div>
      <div className="text-xs font-medium text-primary">
        合计省利息 ¥{formatCurrency(plan.totalSaved)}
      </div>
    </button>
  );
}
