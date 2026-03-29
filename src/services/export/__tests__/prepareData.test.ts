import { describe, expect, it } from 'vitest';
import type { PaymentScheduleItem } from '@/core/types/loan.types';
import { prepareScheduleData } from '../prepareData';

const mockSchedule: PaymentScheduleItem[] = [
  {
    period: 1,
    paymentDate: '2025-02-15',
    monthlyPayment: 5307.27,
    principal: 3640.6,
    interest: 1666.67,
    remainingLoan: 496359.4,
    remainingTerm: 359,
    annualInterestRate: 4.0,
    loanMethod: '等额本息',
    comment: '',
  },
  {
    period: 0,
    paymentDate: '2025-06-15',
    monthlyPayment: 100000,
    principal: 100000,
    interest: 0,
    remainingLoan: 390000,
    remainingTerm: 354,
    annualInterestRate: 4.0,
    loanMethod: '等额本息',
    comment: '提前还款 10万',
  },
];

describe('prepareScheduleData', () => {
  it('返回正确的表头', () => {
    const result = prepareScheduleData(mockSchedule);
    expect(result.headers).toEqual([
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
  });

  it('正常期数转为字符串', () => {
    const result = prepareScheduleData(mockSchedule);
    expect(result.rows[0][0]).toBe('1');
  });

  it('period=0 显示为"提前"', () => {
    const result = prepareScheduleData(mockSchedule);
    expect(result.rows[1][0]).toBe('提前');
  });

  it('金额保留两位小数', () => {
    const result = prepareScheduleData(mockSchedule);
    expect(result.rows[0][2]).toBe('5307.27');
    expect(result.rows[0][3]).toBe('3640.60');
    expect(result.rows[0][4]).toBe('1666.67');
    expect(result.rows[0][5]).toBe('496359.40');
  });

  it('利率带百分号', () => {
    const result = prepareScheduleData(mockSchedule);
    expect(result.rows[0][7]).toBe('4%');
  });

  it('行数与输入一致', () => {
    const result = prepareScheduleData(mockSchedule);
    expect(result.rows).toHaveLength(2);
  });

  it('空数组返回空行', () => {
    const result = prepareScheduleData([]);
    expect(result.headers).toHaveLength(10);
    expect(result.rows).toHaveLength(0);
  });
});
