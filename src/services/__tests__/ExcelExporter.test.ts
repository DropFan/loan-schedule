import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  LoanChangeRecord,
  PaymentScheduleItem,
} from '../../types/loan.types';
import { LoanMethod } from '../../types/loan.types';

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('ExcelExporter', () => {
  let XLSX: typeof import('xlsx');

  const makeScheduleItem = (period: number): PaymentScheduleItem => ({
    period,
    paymentDate: '2024-06-15',
    monthlyPayment: 5307.27,
    principal: 4900.0,
    interest: 407.27,
    remainingLoan: 95000.0,
    remainingTerm: 11,
    annualInterestRate: 4.9,
    loanMethod: '等额本息',
    comment: '',
  });

  const makeChangeRecord = (comment: string): LoanChangeRecord => ({
    date: new Date('2024-06-15'),
    loanAmount: 100000,
    remainingTerm: 12,
    monthlyPayment: 5307.27,
    annualInterestRate: 4.9,
    loanMethod: LoanMethod.EqualPrincipalInterest,
    comment,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    XLSX = await import('xlsx');
  });

  it('传入自定义 filename 时使用自定义文件名', async () => {
    const { exportToExcel } = await import('../ExcelExporter');
    await exportToExcel([], [], 'custom.xlsx');

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      'custom.xlsx',
    );
  });

  it('不传 filename 时自动生成带时间戳的文件名', async () => {
    const { exportToExcel } = await import('../ExcelExporter');

    const fakeNow = new Date(2024, 5, 15, 10, 30, 45);
    vi.setSystemTime(fakeNow);

    await exportToExcel([], []);

    vi.useRealTimers();

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      '还款计划表_由公众号_Hacking4fun_生成于20240615_103045.xlsx',
    );
  });

  it('有 schedule 和 changeList 数据时正确生成工作表数据', async () => {
    const { exportToExcel } = await import('../ExcelExporter');

    const schedule = [makeScheduleItem(1), makeScheduleItem(2)];
    const changeList = [
      makeChangeRecord('初始贷款'),
      makeChangeRecord('利率变更为 3.65%'),
    ];

    await exportToExcel(schedule, changeList, 'test.xlsx');

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledTimes(1);
    const worksheetData = (XLSX.utils.aoa_to_sheet as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as (string | number)[][];

    // 第一行为表头（rightContent merge 后追加第 11 列）
    expect(worksheetData[0].slice(0, 10)).toEqual([
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
    ]);

    // 数据行（schedule 有 2 条）
    expect(worksheetData[1][0]).toBe(1);
    expect(worksheetData[1][1]).toBe('2024-06-15');
    expect(worksheetData[1][2]).toBe('5307.27');
    expect(worksheetData[1][7]).toBe('4.9%');
    expect(worksheetData[2][0]).toBe(2);

    // 变更列表区域：找到 '变更列表' 行
    const changeHeaderIndex = worksheetData.findIndex((row) =>
      row.includes('变更列表'),
    );
    expect(changeHeaderIndex).toBeGreaterThan(2);

    // 变更列表表头行在 changeHeaderIndex + 2
    const changeColumnHeaderIndex = changeHeaderIndex + 2;
    expect(worksheetData[changeColumnHeaderIndex][0]).toBe('变更日期');

    // 变更数据行
    const firstChangeRow = worksheetData[changeColumnHeaderIndex + 1];
    expect(firstChangeRow[0]).toBe('2024-06-15');
    expect(firstChangeRow[1]).toBe('5307.27');
    expect(firstChangeRow[2]).toBe('100000.00');
    expect(firstChangeRow[4]).toBe('4.9%');
    expect(firstChangeRow[5]).toBe('等额本息');

    // workbook 创建和写入
    expect(XLSX.utils.book_new).toHaveBeenCalledTimes(1);
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      '还款计划表 - 由公众号 Hacking4fun 生成',
    );
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'test.xlsx');
  });

  it('空 schedule 和 changeList 时也能正常运行', async () => {
    const { exportToExcel } = await import('../ExcelExporter');

    await exportToExcel([], [], 'empty.xlsx');

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledTimes(1);
    const worksheetData = (XLSX.utils.aoa_to_sheet as ReturnType<typeof vi.fn>)
      .mock.calls[0][0] as (string | number)[][];

    // 只有表头，没有数据行
    expect(worksheetData[0][0]).toBe('期数');

    // rightContent merge 后仍然有数据
    expect(worksheetData[0][10]).toBe('由微信公众号  Hacking4fun 生成');

    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      'empty.xlsx',
    );
  });

  it('rightContent merge 正常运行不触发 catch', async () => {
    const { exportToExcel } = await import('../ExcelExporter');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await exportToExcel([makeScheduleItem(1)], [], 'test.xlsx');
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
