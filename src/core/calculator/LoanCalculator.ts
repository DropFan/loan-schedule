import {
  type CalculateResult,
  LoanMethod,
  LoanMethodName,
  type LoanScheduleSummary,
  type PaymentScheduleItem,
  type RemainingScheduleInfo,
} from '@/core/types/loan.types';
import { addMonths, formatDate, roundTo2 } from '@/core/utils/formatHelper';

/** 自由还款建议最低还款额 = 等额本息月供 × 比例系数 */
export const FREE_REPAYMENT_MIN_RATIO = 0.85;

/** 30/360 天数计算 */
export function calc30360Days(d1: Date, d2: Date): number {
  const y1 = d1.getFullYear();
  const m1 = d1.getMonth() + 1;
  const day1 = d1.getDate();
  const y2 = d2.getFullYear();
  const m2 = d2.getMonth() + 1;
  const day2 = d2.getDate();
  return 360 * (y2 - y1) + 30 * (m2 - m1) + (day2 - day1);
}

/** 公积金贷款利率变更时的 30/360 天数拆分（基于放款日） */
export function calcGjjInterestSplit(
  originDay: number,
  changeDate: Date,
): { daysOld: number; daysNew: number } {
  let periodStartYear = changeDate.getFullYear();
  let periodStartMonth = changeDate.getMonth();

  if (changeDate.getDate() < originDay) {
    periodStartMonth -= 1;
    if (periodStartMonth < 0) {
      periodStartMonth = 11;
      periodStartYear -= 1;
    }
  }

  const periodStart = new Date(periodStartYear, periodStartMonth, originDay);
  const periodEnd = new Date(periodStartYear, periodStartMonth + 1, originDay);

  const daysOld = calc30360Days(periodStart, changeDate);
  const daysNew = calc30360Days(changeDate, periodEnd);
  return { daysOld, daysNew };
}

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

/** 自由还款建议最低还款额 */
export function calcFreeRepaymentMinPayment(
  principal: number,
  termMonths: number,
  monthlyRate: number,
): number {
  const equalPayment = calcEqualPrincipalInterest(
    principal,
    termMonths,
    monthlyRate,
  );
  return roundTo2(equalPayment * FREE_REPAYMENT_MIN_RATIO);
}

/** 计算月供（等额本金返回首月月供，用于展示；自由还款返回用户设定值） */
export function calcMonthlyPayment(
  loanAmount: number,
  termMonths: number,
  monthlyRate: number,
  method: LoanMethod,
  monthlyPaymentAmount?: number,
): number {
  switch (method) {
    case LoanMethod.EqualPrincipalInterest:
      return calcEqualPrincipalInterest(loanAmount, termMonths, monthlyRate);
    case LoanMethod.EqualPrincipal:
      return loanAmount / termMonths + loanAmount * monthlyRate;
    case LoanMethod.FreeRepayment:
      return (
        monthlyPaymentAmount ??
        calcFreeRepaymentMinPayment(loanAmount, termMonths, monthlyRate)
      );
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
  monthlyPaymentAmount?: number,
): PaymentScheduleItem[] {
  const schedule: PaymentScheduleItem[] = [];
  let remainingLoan = loanAmount;

  const fixedPayment =
    method === LoanMethod.FreeRepayment
      ? roundTo2(
          monthlyPaymentAmount ??
            calcFreeRepaymentMinPayment(loanAmount, termMonths, monthlyRate),
        )
      : 0;

  for (let i = 1; i <= termMonths; i++) {
    let monthlyPayment: number;
    let principal: number;
    const interest = roundTo2(remainingLoan * monthlyRate);

    if (method === LoanMethod.FreeRepayment) {
      if (i === termMonths || remainingLoan + interest <= fixedPayment) {
        // 最后一期或剩余不足一期：还清全部
        principal = roundTo2(remainingLoan);
        monthlyPayment = roundTo2(principal + interest);
      } else {
        monthlyPayment = fixedPayment;
        principal = roundTo2(fixedPayment - interest);
      }
    } else if (method === LoanMethod.EqualPrincipalInterest) {
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

    // 自由还款提前还清时截断
    if (method === LoanMethod.FreeRepayment && remainingLoan <= 0) {
      break;
    }
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
  monthlyPaymentAmount?: number,
): CalculateResult {
  const monthlyPayment = roundTo2(
    calcMonthlyPayment(
      loanAmount,
      termMonths,
      monthlyRate,
      method,
      monthlyPaymentAmount,
    ),
  );
  const schedule = generateSchedule(
    loanAmount,
    termMonths,
    monthlyRate,
    annualRate,
    startDate,
    method,
    repaymentDay,
    monthlyPaymentAmount,
  );

  return { monthlyPayment, schedule };
}
