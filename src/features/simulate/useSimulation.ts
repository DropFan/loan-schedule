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
  mode: 'adjust-monthly' | 'lump-sum';
  newMonthly?: number; // 新月还款额（绝对值）
  startPeriod?: number;
  lumpSumAmount?: number;
  lumpSumPeriod?: number;
  lumpSumStrategy?: 'reduce-payment' | 'shorten-term';
  investmentRate: number; // 理财年化收益率，如 2.5 表示 2.5%
  observationMonths?: number; // 机会成本观察期（月），undefined=到原贷款到期
}

export interface SimulateResult {
  simulatedSchedule: PaymentScheduleItem[];
  originalSummary: LoanScheduleSummary;
  simulatedSummary: LoanScheduleSummary;
  interestSaved: number;
  termReduced: number;
  newMonthlyPayment: number | null;
  newEndDate: string;
  originalEndDate: string;
  // 新增指标
  totalInvestment: number; // 投入的总额外资金
  interestSavingRate: number; // 利息节省率 = 节省利息 / 投入金额
  monthlyPaymentChangePercent: number | null; // 月供变化幅度百分比
  // 机会成本
  investmentReturn: number; // 理财预期收益
  observationInterestSaved: number; // 观察期内节省的利息（用于机会成本对比）
  netBenefit: number; // 观察期利息差 - 理财收益，正值=还贷更划算
  investmentRate: number; // 使用的理财利率
  observationMonths: number; // 机会成本观察期（月）
  // 观察期截止时对比
  observationEndDate: string; // 观察期截止日期
  observationOriginalRemaining: number; // 原方案截止日剩余本金
  observationSimulatedRemaining: number; // 模拟方案截止日剩余本金
  observationOriginalPayment: number; // 原方案观察期内总还款
  observationSimulatedPayment: number; // 模拟方案观察期内总还款
  isValid: boolean;
  error?: string;
}

function getRegularItems(schedule: PaymentScheduleItem[]) {
  return schedule.filter((s) => s.period > 0);
}

function getEndDate(schedule: PaymentScheduleItem[]): string {
  const regular = getRegularItems(schedule);
  return regular.length > 0 ? regular[regular.length - 1].paymentDate : '';
}

/** 计算复利收益：principal × (1 + monthlyRate)^months - principal */
function calcInvestmentReturn(
  principal: number,
  annualRate: number,
  months: number,
): number {
  if (principal <= 0 || annualRate <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  return roundTo2(principal * ((1 + monthlyRate) ** months - 1));
}

function buildEnhancedResult(
  schedule: PaymentScheduleItem[],
  simulatedSchedule: PaymentScheduleItem[],
  totalInvestment: number,
  newMonthlyPayment: number | null,
  originalMonthlyPayment: number | null,
  investmentRate: number,
  observationOverride?: number,
): SimulateResult {
  const originalSummary = calcScheduleSummary(schedule);
  const simulatedSummary = calcScheduleSummary(simulatedSchedule);
  const interestSaved = roundTo2(
    originalSummary.totalInterest - simulatedSummary.totalInterest,
  );
  const termReduced = originalSummary.termMonths - simulatedSummary.termMonths;
  const originalEndDate = getEndDate(schedule);
  const newEndDate = getEndDate(simulatedSchedule);

  // 月供变化幅度
  let monthlyPaymentChangePercent: number | null = null;
  if (
    newMonthlyPayment != null &&
    originalMonthlyPayment != null &&
    originalMonthlyPayment > 0
  ) {
    monthlyPaymentChangePercent = roundTo2(
      ((newMonthlyPayment - originalMonthlyPayment) / originalMonthlyPayment) *
        100,
    );
  }

  // 利息节省率
  const interestSavingRate =
    totalInvestment > 0 ? roundTo2(interestSaved / totalInvestment) : 0;

  // 机会成本：观察期内的理财收益 & 观察期内利息差
  const observationMonths = observationOverride ?? originalSummary.termMonths;
  const investmentReturn = calcInvestmentReturn(
    Math.abs(totalInvestment),
    investmentRate,
    observationMonths,
  );

  // 观察期窗口：从当前日期起算，支持小数月（精确到天）
  const today = new Date();
  const obsEnd = new Date(today);
  const wholeMonths = Math.floor(observationMonths);
  const dayFraction = observationMonths - wholeMonths;
  obsEnd.setMonth(obsEnd.getMonth() + wholeMonths);
  if (dayFraction > 0) {
    const daysInMonth = new Date(
      obsEnd.getFullYear(),
      obsEnd.getMonth() + 1,
      0,
    ).getDate();
    obsEnd.setDate(obsEnd.getDate() + Math.round(dayFraction * daysInMonth));
  }
  const observationEndDate = `${obsEnd.getFullYear()}-${String(obsEnd.getMonth() + 1).padStart(2, '0')}-${String(obsEnd.getDate()).padStart(2, '0')}`;

  const isFullTerm = !observationOverride;
  const obsFilter = (s: PaymentScheduleItem[]) =>
    isFullTerm
      ? s.filter((item) => item.period > 0)
      : s.filter(
          (item) =>
            item.period > 0 &&
            item.paymentDate !== '' &&
            item.paymentDate <= observationEndDate,
        );

  const origObs = obsFilter(schedule);
  const simObs = obsFilter(simulatedSchedule);

  const observationInterestSaved = isFullTerm
    ? interestSaved
    : roundTo2(
        origObs.reduce((s, i) => s + i.interest, 0) -
          simObs.reduce((s, i) => s + i.interest, 0),
      );

  // 截止日剩余本金
  const obsOrigEnd = origObs.length > 0 ? origObs[origObs.length - 1] : null;
  const obsSimEnd = simObs.length > 0 ? simObs[simObs.length - 1] : null;
  const observationOriginalRemaining = obsOrigEnd?.remainingLoan ?? 0;
  const observationSimulatedRemaining = obsSimEnd?.remainingLoan ?? 0;

  // 观察期内总还款
  const observationOriginalPayment = roundTo2(
    origObs.reduce((s, i) => s + i.monthlyPayment, 0),
  );
  const observationSimulatedPayment = roundTo2(
    simObs.reduce((s, i) => s + i.monthlyPayment, 0),
  );

  const netBenefit = roundTo2(observationInterestSaved - investmentReturn);

  return {
    simulatedSchedule,
    originalSummary,
    simulatedSummary,
    interestSaved,
    termReduced,
    newMonthlyPayment,
    newEndDate,
    originalEndDate,
    totalInvestment,
    interestSavingRate,
    monthlyPaymentChangePercent,
    investmentReturn,
    observationInterestSaved,
    netBenefit,
    investmentRate,
    observationMonths,
    observationEndDate,
    observationOriginalRemaining,
    observationSimulatedRemaining,
    observationOriginalPayment,
    observationSimulatedPayment,
    isValid: true,
  };
}

function buildErrorResult(
  schedule: PaymentScheduleItem[],
  investmentRate: number,
  error: string,
): SimulateResult {
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
    originalEndDate: getEndDate(schedule),
    totalInvestment: 0,
    interestSavingRate: 0,
    monthlyPaymentChangePercent: null,
    investmentReturn: 0,
    observationInterestSaved: 0,
    netBenefit: 0,
    investmentRate,
    observationMonths: 0,
    observationEndDate: '',
    observationOriginalRemaining: 0,
    observationSimulatedRemaining: 0,
    observationOriginalPayment: 0,
    observationSimulatedPayment: 0,
    isValid: false,
    error,
  };
}

function simulateMonthlyAdjust(
  schedule: PaymentScheduleItem[],
  monthlyAdjust: number,
  startPeriod: number,
  investmentRate: number,
  observationOverride?: number,
): SimulateResult {
  const regularItems = getRegularItems(schedule);
  const periodMap = new Map(regularItems.map((item) => [item.period, item]));

  const startItem = periodMap.get(startPeriod);
  if (!startItem) {
    return buildErrorResult(
      schedule,
      investmentRate,
      `第 ${startPeriod} 期不存在`,
    );
  }

  const prevItem = startPeriod > 1 ? periodMap.get(startPeriod - 1) : undefined;
  let remainingLoan = prevItem
    ? prevItem.remainingLoan
    : startItem.remainingLoan + startItem.principal;

  if (remainingLoan <= 0) {
    return buildErrorResult(schedule, investmentRate, '该期贷款已还清');
  }

  const monthlyRate = startItem.annualInterestRate / 100 / 12;
  const originalPayment = startItem.monthlyPayment;
  const adjustedPayment = roundTo2(originalPayment + monthlyAdjust);

  // 校验：调整后月供必须大于首期利息
  const firstInterest = roundTo2(remainingLoan * monthlyRate);
  if (adjustedPayment <= firstInterest) {
    return buildErrorResult(
      schedule,
      investmentRate,
      `调整后月供 ${adjustedPayment.toFixed(2)} 不足以覆盖利息 ${firstInterest.toFixed(2)}`,
    );
  }

  const prefix = schedule.filter(
    (s) => s.period < startPeriod || s.period === 0,
  );
  const simulated: PaymentScheduleItem[] = [...prefix];

  // 原方案最后一期
  const lastPeriod = regularItems[regularItems.length - 1].period;

  let period = startPeriod;
  let totalAdjustment = 0;
  while (remainingLoan > 0) {
    const interest = roundTo2(remainingLoan * monthlyRate);
    let actualPayment = adjustedPayment;
    let principal = roundTo2(actualPayment - interest);

    // 最后一期或本金够还清：把剩余全部还清
    if (principal >= remainingLoan || period >= lastPeriod) {
      principal = roundTo2(remainingLoan);
      actualPayment = roundTo2(principal + interest);
      totalAdjustment += roundTo2(actualPayment - originalPayment);
      remainingLoan = 0;
    } else {
      totalAdjustment += monthlyAdjust;
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

  return buildEnhancedResult(
    schedule,
    simulated,
    roundTo2(totalAdjustment),
    adjustedPayment,
    originalPayment,
    investmentRate,
    observationOverride,
  );
}

function simulateLumpSum(
  schedule: PaymentScheduleItem[],
  params: LoanParameters,
  lumpSumAmount: number,
  lumpSumPeriod: number,
  strategy: 'reduce-payment' | 'shorten-term',
  investmentRate: number,
  observationOverride?: number,
): SimulateResult {
  const regularItems = getRegularItems(schedule);
  const periodMap = new Map(regularItems.map((item) => [item.period, item]));

  const targetItem = periodMap.get(lumpSumPeriod);
  if (!targetItem) {
    return buildErrorResult(
      schedule,
      investmentRate,
      `第 ${lumpSumPeriod} 期不存在`,
    );
  }

  const remainingLoan = targetItem.remainingLoan;
  if (lumpSumAmount > remainingLoan) {
    return buildErrorResult(
      schedule,
      investmentRate,
      '提前还款金额不能超过剩余本金',
    );
  }
  if (lumpSumAmount <= 0) {
    return buildErrorResult(schedule, investmentRate, '提前还款金额必须大于 0');
  }

  // 一次性还清：无后续还款计划
  if (lumpSumAmount === remainingLoan) {
    const prefix = schedule.filter(
      (s) => (s.period > 0 && s.period <= lumpSumPeriod) || s.period === 0,
    );
    return buildEnhancedResult(
      schedule,
      prefix,
      lumpSumAmount,
      0,
      targetItem.monthlyPayment,
      investmentRate,
      observationOverride,
    );
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
        return buildErrorResult(
          schedule,
          investmentRate,
          '当前月供不足以覆盖利息',
        );
      }
      remainingTerm = newTerm;
    } else if (method === LoanMethod.EqualPrincipal) {
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

  for (const item of result.schedule) {
    item.period += lumpSumPeriod;
  }

  if (strategy === 'reduce-payment' && result.schedule.length > 0) {
    newMonthlyPayment = result.schedule[0].monthlyPayment;
  }

  const prefix = schedule.filter(
    (s) => (s.period > 0 && s.period <= lumpSumPeriod) || s.period === 0,
  );
  const newSchedule = [...prefix, ...result.schedule];

  return buildEnhancedResult(
    schedule,
    newSchedule,
    lumpSumAmount,
    newMonthlyPayment,
    targetItem.monthlyPayment,
    investmentRate,
    observationOverride,
  );
}

export function useSimulation(
  schedule: PaymentScheduleItem[],
  params: LoanParameters | null,
  input: SimulateInput,
): SimulateResult | null {
  return useMemo(() => {
    if (!params || schedule.length === 0) return null;

    // 基线结果：用户未输入时展示原方案数据
    const baseline = (): SimulateResult =>
      buildEnhancedResult(
        schedule,
        schedule,
        0,
        null,
        null,
        input.investmentRate,
        input.observationMonths,
      );

    if (input.mode === 'adjust-monthly') {
      const newMonthly = input.newMonthly;
      const startPeriod = input.startPeriod;
      if (!startPeriod) return baseline();

      if (newMonthly == null || newMonthly <= 0) return baseline();

      // 从 schedule 中取原月供，算出差值
      const regular = schedule.filter((s) => s.period > 0);
      const origItem = regular.find((s) => s.period === startPeriod);
      if (!origItem) return baseline();
      const monthlyAdjust = newMonthly - origItem.monthlyPayment;
      if (monthlyAdjust === 0) return baseline();

      return simulateMonthlyAdjust(
        schedule,
        monthlyAdjust,
        startPeriod,
        input.investmentRate,
        input.observationMonths,
      );
    }

    // lump-sum mode
    const lumpSumAmount = input.lumpSumAmount;
    const lumpSumPeriod = input.lumpSumPeriod;
    const strategy = input.lumpSumStrategy ?? 'shorten-term';
    if (!lumpSumPeriod) return baseline();
    if (!lumpSumAmount || lumpSumAmount <= 0) return baseline();

    return simulateLumpSum(
      schedule,
      params,
      lumpSumAmount,
      lumpSumPeriod,
      strategy,
      input.investmentRate,
      input.observationMonths,
    );
  }, [
    schedule,
    params,
    input.mode,
    input.newMonthly,
    input.startPeriod,
    input.lumpSumAmount,
    input.lumpSumPeriod,
    input.lumpSumStrategy,
    input.investmentRate,
    input.observationMonths,
  ]);
}

/** 单次模拟计算（供 SmartAnalysis 批量调用） */
export function simulateLumpSumOnce(
  schedule: PaymentScheduleItem[],
  params: LoanParameters,
  lumpSumAmount: number,
  lumpSumPeriod: number,
  strategy: 'reduce-payment' | 'shorten-term',
): { interestSaved: number; termReduced: number } | null {
  const regularItems = getRegularItems(schedule);
  const periodMap = new Map(regularItems.map((item) => [item.period, item]));
  const targetItem = periodMap.get(lumpSumPeriod);
  if (!targetItem) return null;

  const remainingLoan = targetItem.remainingLoan;
  if (lumpSumAmount > remainingLoan || lumpSumAmount <= 0) return null;

  const newRemainingLoan = roundTo2(remainingLoan - lumpSumAmount);
  const annualRate = targetItem.annualInterestRate;
  const monthlyRate = annualToMonthlyRate(annualRate);
  let remainingTerm = targetItem.remainingTerm;
  const method = params.loanMethod;

  if (strategy === 'shorten-term') {
    if (method === LoanMethod.EqualPrincipalInterest) {
      const newTerm = calcTermByPayment(
        newRemainingLoan,
        targetItem.monthlyPayment,
        monthlyRate,
      );
      if (newTerm == null) return null;
      remainingTerm = newTerm;
    } else if (method === LoanMethod.EqualPrincipal) {
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
    new Date(targetItem.paymentDate),
    method,
    params.repaymentDay,
    method === LoanMethod.FreeRepayment
      ? params.monthlyPaymentAmount
      : undefined,
  );

  const prefix = schedule.filter(
    (s) => (s.period > 0 && s.period <= lumpSumPeriod) || s.period === 0,
  );
  const newSchedule = [...prefix, ...result.schedule];
  const originalSummary = calcScheduleSummary(schedule);
  const simulatedSummary = calcScheduleSummary(newSchedule);

  return {
    interestSaved: roundTo2(
      originalSummary.totalInterest - simulatedSummary.totalInterest,
    ),
    termReduced: originalSummary.termMonths - simulatedSummary.termMonths,
  };
}

/** 新月供单次模拟（供 SmartAnalysis 批量调用，传绝对月供值） */
export function simulateNewMonthlyOnce(
  schedule: PaymentScheduleItem[],
  newMonthly: number,
  startPeriod: number,
): { interestSaved: number; termReduced: number } | null {
  const regularItems = getRegularItems(schedule);
  const periodMap = new Map(regularItems.map((item) => [item.period, item]));

  const startItem = periodMap.get(startPeriod);
  if (!startItem) return null;

  const prevItem = startPeriod > 1 ? periodMap.get(startPeriod - 1) : undefined;
  const remainingLoan = prevItem
    ? prevItem.remainingLoan
    : startItem.remainingLoan + startItem.principal;
  if (remainingLoan <= 0) return null;

  const monthlyRate = startItem.annualInterestRate / 100 / 12;

  const adjustedPayment = roundTo2(newMonthly);
  const firstInterest = roundTo2(remainingLoan * monthlyRate);
  if (adjustedPayment <= firstInterest) return null;

  // 快速逐期模拟，只计算总利息和期数
  let simInterest = 0;
  let simTerms = 0;
  let rem = remainingLoan;
  while (rem > 0.01) {
    const interest = roundTo2(rem * monthlyRate);
    simInterest += interest;
    const principal = roundTo2(adjustedPayment - interest);
    if (principal >= rem) {
      simTerms++;
      break;
    }
    rem = roundTo2(rem - principal);
    simTerms++;
  }

  // 加上 startPeriod 之前的利息
  let prefixInterest = 0;
  for (const item of schedule) {
    if (item.period > 0 && item.period < startPeriod) {
      prefixInterest += item.interest;
    }
    if (item.period === 0) {
      prefixInterest += item.interest;
    }
  }

  const originalSummary = calcScheduleSummary(schedule);
  const totalSimInterest = roundTo2(prefixInterest + simInterest);
  const totalSimTerms = startPeriod - 1 + simTerms;

  return {
    interestSaved: roundTo2(originalSummary.totalInterest - totalSimInterest),
    termReduced: originalSummary.termMonths - totalSimTerms,
  };
}

/** 快速一次性还款模拟（逐期累加，不生成完整计划） */
export function simulateLumpSumFast(
  schedule: PaymentScheduleItem[],
  lumpSumAmount: number,
  lumpSumPeriod: number,
  precomputed?: {
    periodMap: Map<number, PaymentScheduleItem>;
    originalSummary: LoanScheduleSummary;
  },
  strategy: 'reduce-payment' | 'shorten-term' = 'shorten-term',
): { interestSaved: number; termReduced: number } | null {
  const periodMap =
    precomputed?.periodMap ??
    new Map(getRegularItems(schedule).map((item) => [item.period, item]));
  const targetItem = periodMap.get(lumpSumPeriod);
  if (!targetItem) return null;

  const remainingLoan = targetItem.remainingLoan;
  if (lumpSumAmount > remainingLoan || lumpSumAmount <= 0) return null;

  const newRemainingLoan = roundTo2(remainingLoan - lumpSumAmount);
  const monthlyRate = targetItem.annualInterestRate / 100 / 12;
  let simPayment: number;
  if (strategy === 'reduce-payment') {
    const remainingTerm = targetItem.remainingTerm;
    if (remainingTerm <= 0) return null;
    const factor = (1 + monthlyRate) ** remainingTerm;
    simPayment = roundTo2(
      (newRemainingLoan * monthlyRate * factor) / (factor - 1),
    );
  } else {
    simPayment = targetItem.monthlyPayment;
  }

  let rem = newRemainingLoan;
  let simInterest = 0;
  let simTerms = 0;
  while (rem > 0.01) {
    const interest = roundTo2(rem * monthlyRate);
    simInterest += interest;
    const principal = roundTo2(simPayment - interest);
    if (principal <= 0) return null;
    if (principal >= rem) {
      simTerms++;
      break;
    }
    rem = roundTo2(rem - principal);
    simTerms++;
  }

  let prefixInterest = 0;
  for (const item of schedule) {
    if (item.period >= 0 && item.period <= lumpSumPeriod) {
      prefixInterest += item.interest;
    }
  }

  const originalSummary =
    precomputed?.originalSummary ?? calcScheduleSummary(schedule);
  const totalSimInterest = roundTo2(prefixInterest + simInterest);
  const totalSimTerms = lumpSumPeriod + simTerms;

  return {
    interestSaved: roundTo2(originalSummary.totalInterest - totalSimInterest),
    termReduced: originalSummary.termMonths - totalSimTerms,
  };
}
