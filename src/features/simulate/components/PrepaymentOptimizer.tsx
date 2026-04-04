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
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

export function PrepaymentOptimizer({
  scheduleA,
  paramsA,
  scheduleB,
  paramsB,
  nameA,
  nameB,
}: Props) {
  const [amount, setAmount] = useState(100000);
  const [strategy, setStrategy] = useState<'reduce-payment' | 'shorten-term'>(
    'shorten-term',
  );

  // 取下一个待还期数
  const period = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const regularA = scheduleA.filter((s) => s.period > 0);
    for (const item of regularA) {
      if (item.paymentDate > today) return item.period;
    }
    return regularA.length > 0 ? regularA[regularA.length - 1].period : 1;
  }, [scheduleA]);

  const result = useCombinedSimulation(
    scheduleA,
    paramsA,
    scheduleB,
    paramsB,
    amount,
    strategy,
    period,
  );

  // 利率差策略建议
  const strategyTip = useMemo(() => {
    const rateA =
      paramsA?.annualInterestRate ??
      scheduleA.find((s) => s.period > 0)?.annualInterestRate ??
      0;
    const rateB =
      paramsB?.annualInterestRate ??
      scheduleB.find((s) => s.period > 0)?.annualInterestRate ??
      0;
    if (rateA === 0 || rateB === 0) return null;
    const diff = Math.abs(rateA - rateB);
    if (diff < 0.1) return '两笔贷款利率接近，分配差异不大';
    const higher = rateA > rateB ? nameA : nameB;
    return `${higher}利率更高（${Math.max(rateA, rateB)}% vs ${Math.min(rateA, rateB)}%），优先还该方案可节省更多利息`;
  }, [paramsA, paramsB, scheduleA, scheduleB, nameA, nameB]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>提前还款优化分配</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 金额输入 */}
        <div className="space-y-2">
          <Label>可用金额（元）</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="h-8"
          />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.map((a) => (
              <Button
                key={a}
                variant={amount === a ? 'default' : 'outline'}
                size="xs"
                onClick={() => setAmount(a)}
              >
                {a >= 10000 ? `${a / 10000}万` : a}
              </Button>
            ))}
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
                label="最优分配"
                highlight
              />
            )}

            {/* 全还 A / 全还 B */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.allToA && (
                <PlanCard
                  plan={result.allToA}
                  nameA={nameA}
                  nameB={nameB}
                  label={`全还${nameA}`}
                />
              )}
              {result.allToB && (
                <PlanCard
                  plan={result.allToB}
                  nameA={nameA}
                  nameB={nameB}
                  label={`全还${nameB}`}
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
  highlight,
}: {
  plan: AllocationPlan;
  nameA: string;
  nameB: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm space-y-1 ${highlight ? 'border-primary bg-primary/5' : 'border-border'}`}
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
    </div>
  );
}
