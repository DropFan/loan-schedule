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
    '剩余期数',
    '利率',
    '还款方式',
    '说明',
  ];

  const rows = schedule.map((row) => [
    row.period === 0 ? '提前' : String(row.period),
    row.paymentDate,
    row.monthlyPayment.toFixed(2),
    row.principal.toFixed(2),
    row.interest.toFixed(2),
    row.remainingLoan.toFixed(2),
    String(row.remainingTerm),
    `${row.annualInterestRate}%`,
    row.loanMethod,
    row.comment,
  ]);

  return { headers, rows };
}
