import { describe, expect, it } from 'vitest';
import {
  addMonths,
  formatCurrency,
  formatDate,
  formatRate,
  roundTo2,
} from '../formatHelper';

describe('roundTo2', () => {
  it('正常四舍五入到两位小数', () => {
    // biome-ignore lint/suspicious/noApproximativeNumericConstant: 测试用例需要具体数字
    expect(roundTo2(3.1415)).toBe(3.14);
    expect(roundTo2(3.145)).toBe(3.15);
    expect(roundTo2(3.155)).toBe(3.16); // Math.round(315.5) = 316
  });

  it('整数不变', () => {
    expect(roundTo2(100)).toBe(100);
    expect(roundTo2(0)).toBe(0);
  });

  it('负数四舍五入', () => {
    // biome-ignore lint/suspicious/noApproximativeNumericConstant: 测试用例需要具体数字
    expect(roundTo2(-3.1415)).toBe(-3.14);
    expect(roundTo2(-3.146)).toBe(-3.15);
  });

  it('已经两位小数的值不变', () => {
    expect(roundTo2(1.23)).toBe(1.23);
  });
});

describe('formatCurrency', () => {
  it('格式化为两位小数字符串', () => {
    expect(formatCurrency(1234.5)).toBe('1234.50');
    expect(formatCurrency(1234.567)).toBe('1234.57');
  });

  it('整数补两位小数', () => {
    expect(formatCurrency(100)).toBe('100.00');
  });

  it('零值格式化', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });
});

describe('formatRate', () => {
  it('格式化利率并附加百分号', () => {
    expect(formatRate(3.85)).toBe('3.85%');
    expect(formatRate(4.2)).toBe('4.2%');
  });

  it('利率值会四舍五入到两位小数', () => {
    // biome-ignore lint/suspicious/noApproximativeNumericConstant: 测试用例需要具体数字
    expect(formatRate(3.1415)).toBe('3.14%');
    expect(formatRate(3.146)).toBe('3.15%');
  });
});

describe('formatDate', () => {
  it('格式化标准日期', () => {
    expect(formatDate(new Date(2024, 0, 15))).toBe('2024-01-15');
    expect(formatDate(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('月份和日期补零', () => {
    expect(formatDate(new Date(2024, 0, 1))).toBe('2024-01-01');
    expect(formatDate(new Date(2024, 8, 9))).toBe('2024-09-09');
  });

  it('月份不需要补零时正常显示', () => {
    expect(formatDate(new Date(2024, 9, 15))).toBe('2024-10-15');
    expect(formatDate(new Date(2024, 11, 25))).toBe('2024-12-25');
  });
});

describe('addMonths', () => {
  it('正常加月份，使用默认 day=15', () => {
    const base = new Date(2024, 0, 15); // 2024-01
    const result = addMonths(base, 1);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(1); // 2月
    expect(result.getDate()).toBe(15);
  });

  it('跨年加月份', () => {
    const base = new Date(2024, 10, 15); // 2024-11
    const result = addMonths(base, 3);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(1); // 2月
    expect(result.getDate()).toBe(15);
  });

  it('指定 day 参数', () => {
    const base = new Date(2024, 0, 1); // 2024-01-01
    const result = addMonths(base, 2, 28);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2); // 3月
    expect(result.getDate()).toBe(28);
  });

  it('加 0 个月返回同月', () => {
    const base = new Date(2024, 5, 10);
    const result = addMonths(base, 0);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15); // 默认 day=15
  });

  it('加 12 个月等于加一年', () => {
    const base = new Date(2024, 0, 15);
    const result = addMonths(base, 12);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });
});
