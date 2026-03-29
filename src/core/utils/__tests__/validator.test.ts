import { describe, expect, it } from 'vitest';
import { Validator } from '../validator';

describe('Validator.loanAmount', () => {
  it('NaN 返回失败', () => {
    const result = Validator.loanAmount(Number.NaN);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('贷款金额必须大于 0');
  });

  it('0 返回失败', () => {
    const result = Validator.loanAmount(0);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('贷款金额必须大于 0');
  });

  it('负数返回失败', () => {
    const result = Validator.loanAmount(-100);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('贷款金额必须大于 0');
  });

  it('超过 1 亿返回失败', () => {
    const result = Validator.loanAmount(100_000_001);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('贷款金额不能超过 1 亿');
  });

  it('正好 1 亿返回失败', () => {
    const result = Validator.loanAmount(100_000_000);
    expect(result.valid).toBe(true);
  });

  it('正常金额返回成功', () => {
    const result = Validator.loanAmount(500_000);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('最小正数返回成功', () => {
    const result = Validator.loanAmount(0.01);
    expect(result.valid).toBe(true);
  });
});

describe('Validator.loanTermYears', () => {
  it('NaN 返回失败', () => {
    const result = Validator.loanTermYears(Number.NaN);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('贷款期限必须为整数');
  });

  it('非整数返回失败', () => {
    const result = Validator.loanTermYears(1.5);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('贷款期限必须为整数');
  });

  it('小于 1 返回失败', () => {
    const result = Validator.loanTermYears(0);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('贷款期限必须在 1-30 年之间');
  });

  it('大于 30 返回失败', () => {
    const result = Validator.loanTermYears(31);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('贷款期限必须在 1-30 年之间');
  });

  it('负整数返回失败', () => {
    const result = Validator.loanTermYears(-5);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('贷款期限必须在 1-30 年之间');
  });

  it('边界值 1 返回成功', () => {
    const result = Validator.loanTermYears(1);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('边界值 30 返回成功', () => {
    const result = Validator.loanTermYears(30);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('正常值返回成功', () => {
    const result = Validator.loanTermYears(15);
    expect(result.valid).toBe(true);
  });
});

describe('Validator.annualInterestRate', () => {
  it('NaN 返回失败', () => {
    const result = Validator.annualInterestRate(Number.NaN);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('年利率必须大于 0');
  });

  it('0 返回失败', () => {
    const result = Validator.annualInterestRate(0);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('年利率必须大于 0');
  });

  it('负数返回失败', () => {
    const result = Validator.annualInterestRate(-1);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('年利率必须大于 0');
  });

  it('超过 30% 返回失败', () => {
    const result = Validator.annualInterestRate(30.01);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('年利率不能超过 30%');
  });

  it('正好 30% 返回成功', () => {
    const result = Validator.annualInterestRate(30);
    expect(result.valid).toBe(true);
  });

  it('正常利率返回成功', () => {
    const result = Validator.annualInterestRate(3.85);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('最小正数返回成功', () => {
    const result = Validator.annualInterestRate(0.01);
    expect(result.valid).toBe(true);
  });
});

describe('Validator.prepayAmount', () => {
  it('NaN 返回失败', () => {
    const result = Validator.prepayAmount(Number.NaN, 100_000);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('提前还款金额必须大于 0');
  });

  it('0 返回失败', () => {
    const result = Validator.prepayAmount(0, 100_000);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('提前还款金额必须大于 0');
  });

  it('负数返回失败', () => {
    const result = Validator.prepayAmount(-1000, 100_000);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('提前还款金额必须大于 0');
  });

  it('等于剩余本金返回失败', () => {
    const result = Validator.prepayAmount(100_000, 100_000);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('提前还款金额不能大于等于剩余本金');
  });

  it('大于剩余本金返回失败', () => {
    const result = Validator.prepayAmount(150_000, 100_000);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('提前还款金额不能大于等于剩余本金');
  });

  it('正常提前还款金额返回成功', () => {
    const result = Validator.prepayAmount(50_000, 100_000);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('最小正数返回成功', () => {
    const result = Validator.prepayAmount(0.01, 100_000);
    expect(result.valid).toBe(true);
  });
});

describe('Validator.date', () => {
  it('空字符串返回失败', () => {
    const result = Validator.date('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('请选择日期');
  });

  it('无效日期格式返回失败', () => {
    const result = Validator.date('not-a-date');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('日期格式无效');
  });

  it('有效日期返回成功', () => {
    const result = Validator.date('2024-01-15');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('ISO 格式日期返回成功', () => {
    const result = Validator.date('2024-12-31');
    expect(result.valid).toBe(true);
  });
});
