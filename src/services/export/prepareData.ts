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
