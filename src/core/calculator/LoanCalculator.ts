import {
  type CalculateResult,
  LoanMethod,
  LoanMethodName,
  type LoanScheduleSummary,
  type PaymentScheduleItem,
  type RemainingScheduleInfo,
} from '@/core/types/loan.types';
import { addMonths, formatDate, roundTo2 } from '@/core/utils/formatHelper';

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
  annualRate: number,
  startDate: Date,
  method: LoanMethod,
  repaymentDay: number,
): PaymentScheduleItem[] {
  const schedule: PaymentScheduleItem[] = [];
  let remainingLoan = loanAmount;

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
      principal = roundTo2(loanAmount / termMonths);
      monthlyPayment = roundTo2(principal + interest);
    }

    remainingLoan = roundTo2(remainingLoan - principal);

    const paymentDate = addMonths(startDate, i, repaymentDay);

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
  let lastRegularPeriod = 0;
  for (let i = 0; i < schedule.length; i++) {
    if (new Date(schedule[i].paymentDate) <= changeDate) {
      paidPeriods = i + 1;
      if (schedule[i].period > 0) {
        lastRegularDate = schedule[i].paymentDate;
        lastRegularPeriod = schedule[i].period;
      }
    } else {
      break;
    }
  }

  if (paidPeriods === 0) return null;

  const ref = schedule[paidPeriods - 1];

  return {
    paidPeriods,
    lastRegularPeriod,
    remainingLoan: ref.remainingLoan,
    remainingTerm: ref.remainingTerm,
    annualInterestRate: ref.annualInterestRate,
    lastPaymentDate: ref.paymentDate,
    lastRegularPaymentDate: lastRegularDate || ref.paymentDate,
  };
}

/** 等额本息：已知月供、剩余本金、月利率，反算剩余期数（向上取整）。月供不足以覆盖利息时返回 null */
export function calcTermByPayment(
  remainingLoan: number,
  monthlyPayment: number,
  monthlyRate: number,
): number | null {
  if (remainingLoan <= 0) return 0;
  const netPayment = monthlyPayment - remainingLoan * monthlyRate;
  if (netPayment <= 0) return null;
  const exact =
    Math.log(monthlyPayment / netPayment) / Math.log(1 + monthlyRate);
  // 浮点精度修正：若计算值与整数相差极小，视为整数
  const rounded = Math.round(exact);
  return Math.abs(exact - rounded) < 1e-4 ? rounded : Math.ceil(exact);
}

/** 等额本金：已知剩余本金和每期固定本金，反算剩余期数（向上取整）。固定本金为 0 时返回 null */
export function calcTermByFixedPrincipal(
  remainingLoan: number,
  fixedPrincipal: number,
): number | null {
  if (remainingLoan <= 0) return 0;
  if (fixedPrincipal <= 0) return null;
  return Math.ceil(remainingLoan / fixedPrincipal);
}

/** 计算还款计划摘要（总还款、总利息、总本金、总期数） */
export function calcScheduleSummary(
  schedule: ReadonlyArray<PaymentScheduleItem>,
): LoanScheduleSummary {
  let totalPayment = 0;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let termMonths = 0;

  for (const item of schedule) {
    totalPayment += item.monthlyPayment;
    totalInterest += item.interest;
    totalPrincipal += item.principal;
    if (item.period > 0) termMonths++;
  }

  return {
    totalPayment: roundTo2(totalPayment),
    totalInterest: roundTo2(totalInterest),
    totalPrincipal: roundTo2(totalPrincipal),
    termMonths,
  };
}

/** 统一计算入口 */
export function calculateLoan(
  loanAmount: number,
  termMonths: number,
  monthlyRate: number,
  annualRate: number,
  startDate: Date,
  method: LoanMethod,
  repaymentDay: number,
): CalculateResult {
  const monthlyPayment = roundTo2(
    calcMonthlyPayment(loanAmount, termMonths, monthlyRate, method),
  );
  const schedule = generateSchedule(
    loanAmount,
    termMonths,
    monthlyRate,
    annualRate,
    startDate,
    method,
    repaymentDay,
  );

  return { monthlyPayment, schedule };
}
