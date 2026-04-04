import type { CombinedScheduleItem } from '@/core/calculator/CombinedLoanHelper';
import type {
  LoanChangeRecord,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { type LoanMethod, LoanMethodName } from '@/core/types/loan.types';

export async function exportToExcel(
  schedule: ReadonlyArray<PaymentScheduleItem>,
  changeList: ReadonlyArray<LoanChangeRecord>,
  filename?: string,
): Promise<void> {
  const XLSX = await import('xlsx');

  let totalPayment = 0;
  let totalInterest = 0;
  const worksheetData: (string | number)[][] = [
    [
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
    ],
    ...schedule.map((row) => {
      totalPayment += row.monthlyPayment;
      totalInterest += row.interest;
      return [
        row.period,
        row.paymentDate,
        row.monthlyPayment.toFixed(2),
        row.principal.toFixed(2),
        row.interest.toFixed(2),
        row.remainingLoan.toFixed(2),
        totalPayment.toFixed(2),
        totalInterest.toFixed(2),
        row.remainingTerm,
        `${row.annualInterestRate}%`,
        row.loanMethod,
        row.comment,
        '',
      ];
    }),
  ];

  worksheetData.push(
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '变更列表', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    [
      '变更日期',
      '月还款金额',
      '剩余本金',
      '剩余期数',
      '利率',
      '还款方式',
      '说明',
    ],
    ...changeList.map((row) => [
      row.date.toISOString().split('T')[0],
      row.monthlyPayment.toFixed(2),
      row.loanAmount.toFixed(2),
      row.remainingTerm,
      `${row.annualInterestRate}%`,
      LoanMethodName[row.loanMethod as LoanMethod],
      row.comment,
    ]),
  );

  const COL_COUNT = 12;
  const rightContent = [
    '由微信公众号  Hacking4fun 生成',
    ' ',
    '贷款计算 & 还贷模拟器 可访问：',
    'https://loan.v2dl.net/',
    '在这个文件里留公众号像极了早年互联网分享软件和资源的各种广告行为……',
    '就当是古典互联网的文艺复兴吧',
    '有任何问题可通过微信公众号 Hacking4fun 或 Github 与我交流',
  ];
  const emptyRow = () => Array(COL_COUNT + 1).fill('');

  while (worksheetData.length < rightContent.length) {
    worksheetData.push(emptyRow());
  }

  rightContent.forEach((text, index) => {
    try {
      const base = (worksheetData[index] as (string | number)[]).slice(
        0,
        COL_COUNT,
      );
      worksheetData[index] = [...base, text];
    } catch (e) /* v8 ignore next */ {
      console.warn('Excel export: row merge skipped', e);
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    '还款计划表 - 由公众号 Hacking4fun 生成',
  );

  if (!filename) {
    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    filename = `还款计划表_由公众号_Hacking4fun_生成于${ts}.xlsx`;
  }

  XLSX.writeFile(workbook, filename);
}

function buildScheduleSheet(
  schedule: ReadonlyArray<PaymentScheduleItem>,
): (string | number)[][] {
  let totalPayment = 0;
  let totalInterest = 0;
  return [
    [
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
    ],
    ...schedule.map((row) => {
      totalPayment += row.monthlyPayment;
      totalInterest += row.interest;
      return [
        row.period,
        row.paymentDate,
        row.monthlyPayment.toFixed(2),
        row.principal.toFixed(2),
        row.interest.toFixed(2),
        row.remainingLoan.toFixed(2),
        totalPayment.toFixed(2),
        totalInterest.toFixed(2),
        row.remainingTerm,
        `${row.annualInterestRate}%`,
        row.loanMethod,
        row.comment,
      ];
    }),
  ];
}

export async function exportCombinedToExcel(
  combined: ReadonlyArray<CombinedScheduleItem>,
  scheduleA: ReadonlyArray<PaymentScheduleItem>,
  scheduleB: ReadonlyArray<PaymentScheduleItem>,
  nameA: string,
  nameB: string,
  filename?: string,
): Promise<void> {
  const XLSX = await import('xlsx');

  // Sheet 1: 合计表
  let totalPayment = 0;
  let totalInterest = 0;
  const combinedData: (string | number)[][] = [
    [
      '期数',
      `还款日(${nameA})`,
      `还款日(${nameB})`,
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
      `利率(${nameA})`,
      `利率(${nameB})`,
    ],
    ...combined.map((row) => {
      totalPayment += row.monthlyPayment;
      totalInterest += row.interest;
      return [
        row.period === 0 ? '提前' : row.period,
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
    }),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(combinedData),
    '合计',
  );

  // Sheet 2 & 3: 子方案明细
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(buildScheduleSheet(scheduleA)),
    nameA,
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(buildScheduleSheet(scheduleB)),
    nameB,
  );

  if (!filename) {
    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    filename = `组合还款计划表_${ts}.xlsx`;
  }

  XLSX.writeFile(workbook, filename);
}
