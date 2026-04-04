import type { CombinedScheduleItem } from '@/core/calculator/CombinedLoanHelper';
import type { PaymentScheduleItem } from '@/core/types/loan.types';

export interface ExportTableData {
  headers: string[];
  rows: string[][];
}

export function prepareScheduleData(
  schedule: ReadonlyArray<PaymentScheduleItem>,
): ExportTableData {
  const headers = [
    '期数',
    '还款日期',
    '月还款金额',
    '本金',
    '利息',
    '剩余本金',
    '累计还款',
    '累计利息',
    '剩余期数',
    '利率',
    '还款方式',
    '说明',
  ];

  let totalPayment = 0;
  let totalInterest = 0;
  const rows = schedule.map((row) => {
    totalPayment += row.monthlyPayment;
    totalInterest += row.interest;
    return [
      row.period === 0 ? '提前' : String(row.period),
      row.paymentDate,
      row.monthlyPayment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.remainingLoan.toFixed(2),
      totalPayment.toFixed(2),
      totalInterest.toFixed(2),
      String(row.remainingTerm),
      `${row.annualInterestRate}%`,
      row.loanMethod,
      row.comment,
    ];
  });

  return { headers, rows };
}

export function prepareCombinedScheduleData(
  combined: ReadonlyArray<CombinedScheduleItem>,
  nameA: string,
  nameB: string,
): ExportTableData {
  const headers = [
    '期数',
    '还款日(A)',
    '还款日(B)',
    '月供合计',
    `${nameA}月供`,
    `${nameB}月供`,
    '本金合计',
    '利息合计',
    `${nameA}利息`,
    `${nameB}利息`,
    '剩余本金合计',
    '累计还款',
    '累计利息',
    '利率(A)',
    '利率(B)',
  ];

  let totalPayment = 0;
  let totalInterest = 0;
  const rows = combined.map((row) => {
    totalPayment += row.monthlyPayment;
    totalInterest += row.interest;
    return [
      row.period === 0 ? '提前' : String(row.period),
      row.paymentDateA,
      row.paymentDateB,
      row.monthlyPayment.toFixed(2),
      row.detailA.monthlyPayment.toFixed(2),
      row.detailB.monthlyPayment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.detailA.interest.toFixed(2),
      row.detailB.interest.toFixed(2),
      row.remainingLoan.toFixed(2),
      totalPayment.toFixed(2),
      totalInterest.toFixed(2),
      row.detailA.annualInterestRate
        ? `${row.detailA.annualInterestRate}%`
        : '',
      row.detailB.annualInterestRate
        ? `${row.detailB.annualInterestRate}%`
        : '',
    ];
  });

  return { headers, rows };
}
