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
}

export interface LoanChangeParams {
  type: ChangeType;
  date: Date;
  loanMethod: LoanMethod;
  newAnnualRate?: number; // 利率变更时使用
  prepayAmount?: number; // 提前还款时使用
}

export interface RemainingScheduleInfo {
  paidPeriods: number;
  remainingLoan: number;
  remainingTerm: number;
  annualInterestRate: number;
  lastPaymentDate: string; // YYYY-MM-DD，最后一条记录的日期
  lastRegularPaymentDate: string; // YYYY-MM-DD，最后一期常规还款日（排除提前还款行），用于按天计算利息差
}

export interface CalculateResult {
  monthlyPayment: number;
  schedule: PaymentScheduleItem[];
}

export type LoanEventType = 'initialized' | 'changed' | 'cleared';
export type LoanEventCallback = () => void;
