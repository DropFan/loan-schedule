export interface ValidationResult {
  valid: boolean;
  message: string;
}

function ok(): ValidationResult {
  return { valid: true, message: '' };
}

function fail(message: string): ValidationResult {
  return { valid: false, message };
}

export const Validator = {
  loanAmount(value: number): ValidationResult {
    if (Number.isNaN(value) || value <= 0) return fail('贷款金额必须大于 0');
    if (value > 100_000_000) return fail('贷款金额不能超过 1 亿');
    return ok();
  },

  loanTermYears(value: number): ValidationResult {
    if (Number.isNaN(value) || !Number.isInteger(value))
      return fail('贷款期限必须为整数');
    if (value < 1 || value > 30) return fail('贷款期限必须在 1-30 年之间');
    return ok();
  },

  annualInterestRate(value: number): ValidationResult {
    if (Number.isNaN(value) || value <= 0) return fail('年利率必须大于 0');
    if (value > 30) return fail('年利率不能超过 30%');
    return ok();
  },

  prepayAmount(value: number, remainingLoan: number): ValidationResult {
    if (Number.isNaN(value) || value <= 0)
      return fail('提前还款金额必须大于 0');
    if (value >= remainingLoan) return fail('提前还款金额不能大于等于剩余本金');
    return ok();
  },

  date(value: string): ValidationResult {
    if (!value) return fail('请选择日期');
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return fail('日期格式无效');
    return ok();
  },
};
