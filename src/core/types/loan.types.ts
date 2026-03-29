export enum LoanMethod {
  EqualPrincipalInterest = 'equal-principal-interest',
  EqualPrincipal = 'equal-principal',
}

export const LoanMethodName: Record<LoanMethod, string> = {
  [LoanMethod.EqualPrincipalInterest]: '等额本息',
  [LoanMethod.EqualPrincipal]: '等额本金',
};

export interface PaymentScheduleItem {
  period: number;
  paymentDate: string; // YYYY-MM-DD
  monthlyPayment: number;
  principal: number;
  interest: number;
  remainingLoan: number;
  remainingTerm: number;
  annualInterestRate: number; // 如 3.65 表示 3.65%
  loanMethod: string;
  comment: string;
}

export interface LoanParameters {
  loanAmount: number;
  loanTermMonths: number;
  annualInterestRate: number; // 如 3.65
  loanMethod: LoanMethod;
  startDate: Date;
}

export interface LoanChangeRecord {
  date: Date;
  loanAmount: number;
  remainingTerm: number;
  monthlyPayment: number;
  annualInterestRate: number;
  loanMethod: LoanMethod;
  comment: string;
}

export enum ChangeType {
  RateChange = 'rate-change',
  Prepayment = 'prepayment',
  MethodChange = 'method-change',
}

export enum PrepaymentMode {
  ReducePayment = 'reduce-payment',
  ShortenTerm = 'shorten-term',
}

export const PrepaymentModeName: Record<PrepaymentMode, string> = {
  [PrepaymentMode.ReducePayment]: '减少月供',
  [PrepaymentMode.ShortenTerm]: '缩短年限',
};

export interface LoanChangeParams {
  type: ChangeType;
  date: Date;
  loanMethod: LoanMethod;
  newAnnualRate?: number; // 利率变更时使用
  prepayAmount?: number; // 提前还款时使用
  prepaymentMode?: PrepaymentMode;
}

export interface RemainingScheduleInfo {
  paidPeriods: number; // 截止变更日期的数组元素数量（含 period=0 行），用于 schedule.slice
  lastRegularPeriod: number; // 最后一个常规期的 period 值，用于新计划的期数偏移
  remainingLoan: number;
  remainingTerm: number;
  annualInterestRate: number;
  lastPaymentDate: string;
  lastRegularPaymentDate: string;
}

export interface CalculateResult {
  monthlyPayment: number;
  schedule: PaymentScheduleItem[];
}

export interface LoanScheduleSummary {
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  termMonths: number;
}

export type LoanEventType = 'initialized' | 'changed' | 'cleared';
export type LoanEventCallback = () => void;
