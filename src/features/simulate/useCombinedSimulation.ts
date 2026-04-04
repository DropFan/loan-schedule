import { useMemo } from 'react';
import type {
  LoanParameters,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { simulateLumpSumOnce } from './useSimulation';

export interface AllocationPlan {
  amountA: number;
  amountB: number;
  interestSavedA: number;
  interestSavedB: number;
  totalSaved: number;
  termReducedA: number;
  termReducedB: number;
}

export interface CombinedSimulationResult {
  plans: AllocationPlan[];
  best: AllocationPlan | null;
  allToA: AllocationPlan | null;
  allToB: AllocationPlan | null;
  conclusion: string;
}

export function useCombinedSimulation(
  scheduleA: PaymentScheduleItem[],
  paramsA: LoanParameters | null,
  scheduleB: PaymentScheduleItem[],
  paramsB: LoanParameters | null,
  totalAmount: number,
  strategy: 'reduce-payment' | 'shorten-term',
  period: number,
): CombinedSimulationResult | null {
  return useMemo(() => {
    if (
      !paramsA ||
      !paramsB ||
      totalAmount <= 0 ||
      scheduleA.length === 0 ||
      scheduleB.length === 0
    )
      return null;

    // 确定步进粒度
    const step = totalAmount > 500000 ? 50000 : 10000;

    const plans: AllocationPlan[] = [];

    for (let amountA = 0; amountA <= totalAmount; amountA += step) {
      const amountB = totalAmount - amountA;

      const resultA =
        amountA > 0
          ? simulateLumpSumOnce(scheduleA, paramsA, amountA, period, strategy)
          : null;
      const resultB =
        amountB > 0
          ? simulateLumpSumOnce(scheduleB, paramsB, amountB, period, strategy)
          : null;

      // 跳过无效分配（金额超过某方案剩余本金）
      if ((amountA > 0 && !resultA) || (amountB > 0 && !resultB)) continue;

      plans.push({
        amountA,
        amountB,
        interestSavedA: resultA?.interestSaved ?? 0,
        interestSavedB: resultB?.interestSaved ?? 0,
        totalSaved:
          (resultA?.interestSaved ?? 0) + (resultB?.interestSaved ?? 0),
        termReducedA: resultA?.termReduced ?? 0,
        termReducedB: resultB?.termReduced ?? 0,
      });
    }

    if (plans.length === 0) return null;

    // 按总节省利息降序排列
    plans.sort((a, b) => b.totalSaved - a.totalSaved);

    const best = plans[0];
    const allToA = plans.find((p) => p.amountB === 0) ?? null;
    const allToB = plans.find((p) => p.amountA === 0) ?? null;

    // 生成结论
    let conclusion = '';
    if (best.amountA > 0 && best.amountB === 0) {
      conclusion = '建议全部还方案A，利息节省最多';
    } else if (best.amountA === 0 && best.amountB > 0) {
      conclusion = '建议全部还方案B，利息节省最多';
    } else {
      conclusion = `最优分配：方案A ${(best.amountA / 10000).toFixed(1)}万 + 方案B ${(best.amountB / 10000).toFixed(1)}万`;
    }

    return { plans, best, allToA, allToB, conclusion };
  }, [scheduleA, paramsA, scheduleB, paramsB, totalAmount, strategy, period]);
}
