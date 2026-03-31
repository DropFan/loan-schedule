import { useMemo } from 'react';
import {
  annualToMonthlyRate,
  calcScheduleSummary,
  calcTermByPayment,
  calculateLoan,
} from '@/core/calculator/LoanCalculator';
import {
  LoanMethod,
  type LoanParameters,
  type LoanScheduleSummary,
  type PaymentScheduleItem,
} from '@/core/types/loan.types';
import { roundTo2 } from '@/core/utils/formatHelper';

export interface SimulateInput {
  mode: 'extra-monthly' | 'lump-sum';
  extraMonthly?: number;
  startPeriod?: number;
  lumpSumAmount?: number;
  lumpSumPeriod?: number;
  lumpSumStrategy?: 'reduce-payment' | 'shorten-term';
}

export interface SimulateResult {
  simulatedSchedule: PaymentScheduleItem[];
  originalSummary: LoanScheduleSummary;
  simulatedSummary: LoanScheduleSummary;
  interestSaved: number;
  termReduced: number;
  newMonthlyPayment: number | null;
  newEndDate: string;
  isValid: boolean;
  error?: string;
}

function getRegularItems(schedule: PaymentScheduleItem[]) {
  return schedule.filter((s) => s.period > 0);
}

function simulateExtraMonthly(
  schedule: PaymentScheduleItem[],
  extraMonthly: number,
  startPeriod: number,
): SimulateResult | { error: string } {
  const regularItems = getRegularItems(schedule);
  const periodMap = new Map(regularItems.map((item) => [item.period, item]));

  const startItem = periodMap.get(startPeriod);
  if (!startItem) {
    return { error: `第 ${startPeriod} 期不存在` };
  }

  // 获取 startPeriod 前一期的剩余贷款（即 startPeriod 开始时的本金）
  const prevItem = startPeriod > 1 ? periodMap.get(startPeriod - 1) : undefined;
  let remainingLoan = prevItem
    ? prevItem.remainingLoan
    : startItem.remainingLoan + startItem.principal;

  if (remainingLoan <= 0) {
    return { error: '该期贷款已还清' };
  }

  const monthlyRate = startItem.annualInterestRate / 100 / 12;
  const originalPayment = startItem.monthlyPayment;

  // startPeriod 之前的期保持不变
  const prefix = schedule.filter(
    (s) => s.period < startPeriod || s.period === 0,
  );
  const simulated: PaymentScheduleItem[] = [...prefix];

  let period = startPeriod;
  while (remainingLoan > 0) {
    const interest = roundTo2(remainingLoan * monthlyRate);
    let actualPayment = roundTo2(originalPayment + extraMonthly);
    let principal = roundTo2(actualPayment - interest);

    if (principal >= remainingLoan) {
      principal = roundTo2(remainingLoan);
      actualPayment = roundTo2(principal + interest);
      remainingLoan = 0;
    } else {
      remainingLoan = roundTo2(remainingLoan - principal);
    }

    const origItem = periodMap.get(period);
    simulated.push({
      period,
      paymentDate: origItem?.paymentDate ?? '',
      monthlyPayment: actualPayment,
      principal,
      interest,
      remainingLoan: Math.max(remainingLoan, 0),
      remainingTerm: remainingLoan > 0 ? 1 : 0,
      annualInterestRate: startItem.annualInterestRate,
      loanMethod: startItem.loanMethod,
      comment: '',
    });

    if (remainingLoan <= 0) break;
    period++;
  }

  const originalSummary = calcScheduleSummary(schedule);
  const simulatedSummary = calcScheduleSummary(simulated);
  const lastSim = simulated[simulated.length - 1];

  return {
    simulatedSchedule: simulated,
    originalSummary,
    simulatedSummary,
    interestSaved: roundTo2(
      originalSummary.totalInterest - simulatedSummary.totalInterest,
    ),
    termReduced: originalSummary.termMonths - simulatedSummary.termMonths,
    newMonthlyPayment: null,
    newEndDate: lastSim?.paymentDate ?? '',
    isValid: true,
  };
}

function simulateLumpSum(
  schedule: PaymentScheduleItem[],
  params: LoanParameters,
  lumpSumAmount: number,
  lumpSumPeriod: number,
  strategy: 'reduce-payment' | 'shorten-term',
): SimulateResult | { error: string } {
  const regularItems = getRegularItems(schedule);
  const periodMap = new Map(regularItems.map((item) => [item.period, item]));

  const targetItem = periodMap.get(lumpSumPeriod);
  if (!targetItem) {
    return { error: `第 ${lumpSumPeriod} 期不存在` };
  }

  const remainingLoan = targetItem.remainingLoan;
  if (lumpSumAmount >= remainingLoan) {
    return { error: '提前还款金额不能超过剩余本金' };
  }
  if (lumpSumAmount <= 0) {
    return { error: '提前还款金额必须大于 0' };
  }

  const newRemainingLoan = roundTo2(remainingLoan - lumpSumAmount);
  const annualRate = targetItem.annualInterestRate;
  const monthlyRate = annualToMonthlyRate(annualRate);
  let remainingTerm = targetItem.remainingTerm;

  const nextDate = new Date(targetItem.paymentDate);
  const method = params.loanMethod;
  const repaymentDay = params.repaymentDay;

  let newMonthlyPayment: number | null = null;

  if (strategy === 'shorten-term') {
    if (method === LoanMethod.EqualPrincipalInterest) {
      const currentPayment = targetItem.monthlyPayment;
      const newTerm = calcTermByPayment(
        newRemainingLoan,
        currentPayment,
        monthlyRate,
      );
      if (newTerm == null) {
        return { error: '当前月供不足以覆盖利息' };
      }
      remainingTerm = newTerm;
    } else if (method === LoanMethod.EqualPrincipal) {
      // 等额本金：保持每期固定本金不变，期数 = 剩余本金 / 固定本金
      const fixedPrincipal = roundTo2(
        params.loanAmount / params.loanTermMonths,
      );
      remainingTerm = Math.ceil(newRemainingLoan / fixedPrincipal);
    }
  }

  const result = calculateLoan(
    newRemainingLoan,
    remainingTerm,
    monthlyRate,
    annualRate,
    nextDate,
    method,
    repaymentDay,
    method === LoanMethod.FreeRepayment
      ? params.monthlyPaymentAmount
      : undefined,
  );

  // 调整 period 偏移
  for (const item of result.schedule) {
    item.period += lumpSumPeriod;
  }

  if (strategy === 'reduce-payment' && result.schedule.length > 0) {
    newMonthlyPayment = result.schedule[0].monthlyPayment;
  }

  // 拼接：lumpSumPeriod 之前的原始期 + 新计算的 schedule
  const prefix = schedule.filter(
    (s) => (s.period > 0 && s.period <= lumpSumPeriod) || s.period === 0,
  );
  const newSchedule = [...prefix, ...result.schedule];

  const originalSummary = calcScheduleSummary(schedule);
  const simulatedSummary = calcScheduleSummary(newSchedule);
  const lastSim = newSchedule[newSchedule.length - 1];

  return {
    simulatedSchedule: newSchedule,
    originalSummary,
    simulatedSummary,
    interestSaved: roundTo2(
      originalSummary.totalInterest - simulatedSummary.totalInterest,
    ),
    termReduced: originalSummary.termMonths - simulatedSummary.termMonths,
    newMonthlyPayment,
    newEndDate: lastSim?.paymentDate ?? '',
    isValid: true,
  };
}

export function useSimulation(
  schedule: PaymentScheduleItem[],
  params: LoanParameters | null,
  input: SimulateInput,
): SimulateResult | null {
  return useMemo(() => {
    if (!params || schedule.length === 0) return null;

    if (input.mode === 'extra-monthly') {
      const extraMonthly = input.extraMonthly;
      const startPeriod = input.startPeriod;
      if (!extraMonthly || extraMonthly <= 0 || !startPeriod) return null;

      const result = simulateExtraMonthly(schedule, extraMonthly, startPeriod);
      if ('error' in result && !('isValid' in result)) {
        return {
          simulatedSchedule: [],
          originalSummary: calcScheduleSummary(schedule),
          simulatedSummary: {
            totalPayment: 0,
            totalInterest: 0,
            totalPrincipal: 0,
            termMonths: 0,
          },
          interestSaved: 0,
          termReduced: 0,
          newMonthlyPayment: null,
          newEndDate: '',
          isValid: false,
          error: result.error,
        };
      }
      return result as SimulateResult;
    }

    // lump-sum mode
    const lumpSumAmount = input.lumpSumAmount;
    const lumpSumPeriod = input.lumpSumPeriod;
    const strategy = input.lumpSumStrategy ?? 'shorten-term';
    if (!lumpSumAmount || lumpSumAmount <= 0 || !lumpSumPeriod) return null;

    const result = simulateLumpSum(
      schedule,
      params,
      lumpSumAmount,
      lumpSumPeriod,
      strategy,
    );
    if ('error' in result && !('isValid' in result)) {
      return {
        simulatedSchedule: [],
        originalSummary: calcScheduleSummary(schedule),
        simulatedSummary: {
          totalPayment: 0,
          totalInterest: 0,
          totalPrincipal: 0,
          termMonths: 0,
        },
        interestSaved: 0,
        termReduced: 0,
        newMonthlyPayment: null,
        newEndDate: '',
        isValid: false,
        error: result.error,
      };
    }
    return result as SimulateResult;
  }, [
    schedule,
    params,
    input.mode,
    input.extraMonthly,
    input.startPeriod,
    input.lumpSumAmount,
    input.lumpSumPeriod,
    input.lumpSumStrategy,
  ]);
}
