import {
  type CalculateResult,
  LoanMethod,
  LoanMethodName,
  type PaymentScheduleItem,
  type RemainingScheduleInfo,
} from '../types/loan.types';
import { addMonths, formatDate } from '../utils/formatHelper';

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

/** 计算月供（等额本金返回首月月供，用于展示） */
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
      return loanAmount / termMonths + loanAmount * monthlyRate;
  }
}

/** 生成还款计划表 */
export function generateSchedule(
  loanAmount: number,
  termMonths: number,
  monthlyRate: number,
  startDate: Date,
  method: LoanMethod,
): PaymentScheduleItem[] {
  const schedule: PaymentScheduleItem[] = [];
  let remainingLoan = loanAmount;
  const annualRate = parseFloat((monthlyRate * 12 * 100).toFixed(2));

  for (let i = 1; i <= termMonths; i++) {
    let monthlyPayment: number;
    let principal: number;
    const interest = remainingLoan * monthlyRate;

    if (method === LoanMethod.EqualPrincipalInterest) {
      monthlyPayment = calcEqualPrincipalInterest(
        loanAmount,
        termMonths,
        monthlyRate,
      );
      principal = monthlyPayment - interest;
    } else {
      // 等额本金：每期本金固定，月供 = 固定本金 + 当期利息
      principal = loanAmount / termMonths;
      monthlyPayment = principal + interest;
    }

    remainingLoan -= principal;

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

/** 查找变更点，返回已还期数和剩余信息 */
export function findRemainingInfo(
  schedule: PaymentScheduleItem[],
  changeDate: Date,
): RemainingScheduleInfo | null {
  if (schedule.length === 0) return null;

  let paidPeriods = 0;
  let lastRegularDate = '';
  for (let i = 0; i < schedule.length; i++) {
    if (new Date(schedule[i].paymentDate) <= changeDate) {
      paidPeriods = i + 1;
      // period > 0 为常规还款期，period === 0 为提前还款行
      if (schedule[i].period > 0) {
        lastRegularDate = schedule[i].paymentDate;
      }
    } else {
      break;
    }
  }

  if (paidPeriods === 0) return null;

  const ref = schedule[paidPeriods - 1];

  return {
    paidPeriods,
    remainingLoan: ref.remainingLoan,
    remainingTerm: ref.remainingTerm,
    annualInterestRate: ref.annualInterestRate,
    lastPaymentDate: ref.paymentDate,
    lastRegularPaymentDate: lastRegularDate || ref.paymentDate,
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

  return { monthlyPayment, schedule };
}
