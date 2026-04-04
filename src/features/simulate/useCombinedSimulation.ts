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
  /** 优先还清 A（剩余分配给 B） */
  priorityA: AllocationPlan | null;
  /** 优先还清 B（剩余分配给 A） */
  priorityB: AllocationPlan | null;
  conclusion: string;
}

/** 从 schedule 中取指定 period 或最近一期的剩余本金 */
function getRemaining(schedule: PaymentScheduleItem[], period: number): number {
  const item = schedule.find((s) => s.period === period);
  if (item) return item.remainingLoan;
  // 找最近的 period
  const regular = schedule.filter((s) => s.period > 0);
  if (regular.length === 0) return 0;
  // 找 <= period 的最大 period
  for (let i = regular.length - 1; i >= 0; i--) {
    if (regular[i].period <= period) return regular[i].remainingLoan;
  }
  return regular[0].remainingLoan + regular[0].principal;
}

/** 为某个 schedule 独立计算下一个待还期数 */
function getNextPeriod(schedule: PaymentScheduleItem[]): number {
  const regular = schedule.filter((s) => s.period > 0);
  if (regular.length === 0) return 1;
  const today = new Date().toISOString().split('T')[0];
  for (const item of regular) {
    if (item.paymentDate > today) return item.period;
  }
  return regular[regular.length - 1].period;
}

/** 计算单方案的模拟结果，金额自动 clamp 到 [0, remaining] */
function simulate(
  schedule: PaymentScheduleItem[],
  params: LoanParameters,
  amount: number,
  period: number,
  strategy: 'reduce-payment' | 'shorten-term',
): { interestSaved: number; termReduced: number; actualAmount: number } {
  if (amount <= 0) return { interestSaved: 0, termReduced: 0, actualAmount: 0 };
  const remaining = getRemaining(schedule, period);
  const actual = Math.min(amount, remaining);
  if (actual <= 0) return { interestSaved: 0, termReduced: 0, actualAmount: 0 };
  const result = simulateLumpSumOnce(
    schedule,
    params,
    actual,
    period,
    strategy,
  );
  if (!result)
    return { interestSaved: 0, termReduced: 0, actualAmount: actual };
  return { ...result, actualAmount: actual };
}

export function useCombinedSimulation(
  scheduleA: PaymentScheduleItem[],
  paramsA: LoanParameters | null,
  scheduleB: PaymentScheduleItem[],
  paramsB: LoanParameters | null,
  totalAmount: number,
  strategy: 'reduce-payment' | 'shorten-term',
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

    // 各子方案独立计算 period
    const periodA = getNextPeriod(scheduleA);
    const periodB = getNextPeriod(scheduleB);
    const remainA = getRemaining(scheduleA, periodA);
    const remainB = getRemaining(scheduleB, periodB);

    const step = totalAmount > 500000 ? 50000 : 10000;
    const plans: AllocationPlan[] = [];

    for (let rawA = 0; rawA <= totalAmount; rawA += step) {
      const rawB = totalAmount - rawA;
      // clamp 到各自剩余本金，超出部分转给对方
      let amountA = Math.min(rawA, remainA);
      let amountB = Math.min(rawB, remainB);
      // 超出部分回流
      const overflowA = rawA - amountA;
      const overflowB = rawB - amountB;
      amountB = Math.min(amountB + overflowA, remainB);
      amountA = Math.min(amountA + overflowB, remainA);

      const resA = simulate(scheduleA, paramsA, amountA, periodA, strategy);
      const resB = simulate(scheduleB, paramsB, amountB, periodB, strategy);

      plans.push({
        amountA: resA.actualAmount,
        amountB: resB.actualAmount,
        interestSavedA: resA.interestSaved,
        interestSavedB: resB.interestSaved,
        totalSaved: resA.interestSaved + resB.interestSaved,
        termReducedA: resA.termReduced,
        termReducedB: resB.termReduced,
      });
    }

    // 去重（clamp 后不同 rawA 可能产生相同的实际分配）
    const seen = new Set<string>();
    const uniquePlans = plans.filter((p) => {
      const key = `${p.amountA}-${p.amountB}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    uniquePlans.sort((a, b) => b.totalSaved - a.totalSaved);
    const best = uniquePlans[0] ?? null;

    // "优先还清 A"：A 先拿满（min(total, remainA)），余额给 B
    const priorityAamount = Math.min(totalAmount, remainA);
    const priorityBamount = Math.min(totalAmount - priorityAamount, remainB);
    const priA_resA = simulate(
      scheduleA,
      paramsA,
      priorityAamount,
      periodA,
      strategy,
    );
    const priA_resB = simulate(
      scheduleB,
      paramsB,
      priorityBamount,
      periodB,
      strategy,
    );
    const priorityA: AllocationPlan = {
      amountA: priA_resA.actualAmount,
      amountB: priA_resB.actualAmount,
      interestSavedA: priA_resA.interestSaved,
      interestSavedB: priA_resB.interestSaved,
      totalSaved: priA_resA.interestSaved + priA_resB.interestSaved,
      termReducedA: priA_resA.termReduced,
      termReducedB: priA_resB.termReduced,
    };

    // "优先还清 B"：B 先拿满，余额给 A
    const priorityBBamount = Math.min(totalAmount, remainB);
    const priorityBAamount = Math.min(totalAmount - priorityBBamount, remainA);
    const priB_resB = simulate(
      scheduleB,
      paramsB,
      priorityBBamount,
      periodB,
      strategy,
    );
    const priB_resA = simulate(
      scheduleA,
      paramsA,
      priorityBAamount,
      periodA,
      strategy,
    );
    const priorityB: AllocationPlan = {
      amountA: priB_resA.actualAmount,
      amountB: priB_resB.actualAmount,
      interestSavedA: priB_resA.interestSaved,
      interestSavedB: priB_resB.interestSaved,
      totalSaved: priB_resA.interestSaved + priB_resB.interestSaved,
      termReducedA: priB_resA.termReduced,
      termReducedB: priB_resB.termReduced,
    };

    // 结论
    let conclusion = '';
    if (best) {
      if (best.amountB === 0 && best.amountA > 0) {
        conclusion = '建议全部分配给方案A，利息节省最多';
      } else if (best.amountA === 0 && best.amountB > 0) {
        conclusion = '建议全部分配给方案B，利息节省最多';
      } else {
        conclusion = `最优分配：方案A ${(best.amountA / 10000).toFixed(1)}万 + 方案B ${(best.amountB / 10000).toFixed(1)}万`;
      }
    }

    return { plans: uniquePlans, best, priorityA, priorityB, conclusion };
  }, [scheduleA, paramsA, scheduleB, paramsB, totalAmount, strategy]);
}
