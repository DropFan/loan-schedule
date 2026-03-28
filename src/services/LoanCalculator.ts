import {
  type CalculateResult,
  LoanMethod,
  LoanMethodName,
  type PaymentScheduleItem,
  type RemainingScheduleInfo,
} from '../types/loan.types';
import { addMonths, formatDate, roundTo2 } from '../utils/formatHelper';

export function annualToMonthlyRate(annualRate: number): number {
  return annualRate / 100 / 12;
}

/** 等额本息月供公式 */
export function calcEqualPrincipalInterest(
  principal: number,
  termMonths: number,
  monthlyRate: number,
): number {
  const pow = (1 + monthlyRate) ** termMonths;
  return (principal * monthlyRate * pow) / (pow - 1);
}

/** 等额本金：每期本金固定 */
export function calcEqualPrincipalMonthly(
  principal: number,
  termMonths: number,
): number {
  return principal / termMonths;
}

/** 计算月供 */
export function calcMonthlyPayment(
  loanAmount: number,
  termMonths: number,
  monthlyRate: number,
  method: LoanMethod,
): number {
  switch (method) {
    case LoanMethod.EqualPrincipalInterest:
      return calcEqualPrincipalInterest(loanAmount, termMonths, monthlyRate);
    case LoanMethod.EqualPrincipal:
      // 返回首月月供（用于展示），实际每期月供在 generateSchedule 中逐期计算
      return roundTo2(loanAmount / termMonths + loanAmount * monthlyRate);
  }
}

/** 生成还款计划表，修复了日期溢出和等额本金计算 bug */
export function generateSchedule(
  loanAmount: number,
  termMonths: number,
  monthlyRate: number,
  startDate: Date,
  method: LoanMethod,
): PaymentScheduleItem[] {
  const schedule: PaymentScheduleItem[] = [];
  let remainingLoan = loanAmount;
  const annualRate = roundTo2(monthlyRate * 12 * 100);

  for (let i = 1; i <= termMonths; i++) {
    let monthlyPayment: number;
    let principal: number;
    const interest = roundTo2(remainingLoan * monthlyRate);

    if (method === LoanMethod.EqualPrincipalInterest) {
      monthlyPayment = roundTo2(
        calcEqualPrincipalInterest(loanAmount, termMonths, monthlyRate),
      );
      principal = roundTo2(monthlyPayment - interest);
    } else {
      // 等额本金：每期本金固定，月供 = 固定本金 + 当期利息
      const fixedPrincipal = roundTo2(loanAmount / termMonths);
      principal = fixedPrincipal;
      monthlyPayment = roundTo2(fixedPrincipal + interest);
    }

    remainingLoan = roundTo2(remainingLoan - principal);

    // 使用 addMonths 避免日期溢出，统一用15号
    const paymentDate = addMonths(startDate, i, 15);

    schedule.push({
      period: i,
      paymentDate: formatDate(paymentDate),
      monthlyPayment,
      principal,
      interest,
      remainingLoan: Math.max(remainingLoan, 0),
      remainingTerm: termMonths - i,
      annualInterestRate: annualRate,
      loanMethod: LoanMethodName[method],
      comment: '',
    });
  }

  return schedule;
}

/** 查找变更点，返回已还期数和剩余信息。修复了 findIndex=-1 的越界问题 */
export function findRemainingInfo(
  schedule: PaymentScheduleItem[],
  changeDate: Date,
): RemainingScheduleInfo | null {
  if (schedule.length === 0) return null;

  const currentIndex = schedule.findIndex(
    (item) =>
      new Date(item.paymentDate) > changeDate && item.monthlyPayment > 0,
  );

  // 所有还款日期都早于变更日期 → 贷款已还完
  if (currentIndex === -1) return null;

  const paidPeriods = currentIndex === 0 ? 0 : schedule[currentIndex].period;
  const refIndex = currentIndex > 0 ? currentIndex - 1 : schedule.length - 1;
  const ref = schedule[refIndex];

  return {
    paidPeriods,
    remainingLoan: ref.remainingLoan,
    remainingTerm: ref.remainingTerm,
    annualInterestRate: ref.annualInterestRate,
  };
}

/** 统一计算入口 */
export function calculateLoan(
  loanAmount: number,
  termMonths: number,
  monthlyRate: number,
  startDate: Date,
  method: LoanMethod,
): CalculateResult {
  const monthlyPayment = calcMonthlyPayment(
    loanAmount,
    termMonths,
    monthlyRate,
    method,
  );
  const schedule = generateSchedule(
    loanAmount,
    termMonths,
    monthlyRate,
    startDate,
    method,
  );

  return { monthlyPayment: roundTo2(monthlyPayment), schedule };
}
