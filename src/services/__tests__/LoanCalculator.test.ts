import { describe, expect, it } from 'vitest';
import type { PaymentScheduleItem } from '../../types/loan.types';
import { LoanMethod, LoanMethodName } from '../../types/loan.types';
import {
  annualToMonthlyRate,
  calcEqualPrincipalInterest,
  calcEqualPrincipalMonthly,
  calcMonthlyPayment,
  calculateLoan,
  findRemainingInfo,
  generateSchedule,
} from '../LoanCalculator';

describe('annualToMonthlyRate', () => {
  it('将年利率转换为月利率', () => {
    expect(annualToMonthlyRate(12)).toBeCloseTo(0.01, 10);
    expect(annualToMonthlyRate(3.6)).toBeCloseTo(0.003, 10);
    expect(annualToMonthlyRate(0)).toBe(0);
  });
});

describe('calcEqualPrincipalInterest', () => {
  it('计算等额本息月供', () => {
    // 100万，30年（360期），月利率 0.004083...（年利率 4.9%）
    const monthlyRate = 4.9 / 100 / 12;
    const result = calcEqualPrincipalInterest(1000000, 360, monthlyRate);
    // 等额本息月供约 5307.27
    expect(result).toBeCloseTo(5307.27, 0);
  });

  it('计算短期小额贷款', () => {
    // 10万，12期，月利率 0.005（年利率 6%）
    const result = calcEqualPrincipalInterest(100000, 12, 0.005);
    expect(result).toBeCloseTo(8606.64, 0);
  });
});

describe('calcEqualPrincipalMonthly', () => {
  it('计算等额本金每期固定本金', () => {
    expect(calcEqualPrincipalMonthly(120000, 12)).toBe(10000);
    expect(calcEqualPrincipalMonthly(1000000, 360)).toBeCloseTo(2777.78, 1);
  });
});

describe('calcMonthlyPayment', () => {
  it('等额本息方式返回月供', () => {
    const monthlyRate = 4.9 / 100 / 12;
    const result = calcMonthlyPayment(
      1000000,
      360,
      monthlyRate,
      LoanMethod.EqualPrincipalInterest,
    );
    expect(result).toBeCloseTo(5307.27, 0);
  });

  it('等额本金方式返回首月月供', () => {
    // 首月月供 = 本金/期数 + 本金*月利率
    const monthlyRate = 0.004;
    const result = calcMonthlyPayment(
      120000,
      12,
      monthlyRate,
      LoanMethod.EqualPrincipal,
    );
    // 120000/12 + 120000*0.004 = 10000 + 480 = 10480
    expect(result).toBeCloseTo(10480, 2);
  });
});

describe('generateSchedule', () => {
  describe('等额本息', () => {
    it('生成完整还款计划', () => {
      const monthlyRate = annualToMonthlyRate(4.9);
      const startDate = new Date(2024, 0, 15);
      const schedule = generateSchedule(
        100000,
        12,
        monthlyRate,
        4.9,
        startDate,
        LoanMethod.EqualPrincipalInterest,
      );

      expect(schedule).toHaveLength(12);
      expect(schedule[0].period).toBe(1);
      expect(schedule[11].period).toBe(12);
      expect(schedule[11].remainingTerm).toBe(0);
      expect(schedule[11].remainingLoan).toBeCloseTo(0, 0);
      expect(schedule[0].annualInterestRate).toBe(4.9);
      expect(schedule[0].loanMethod).toBe(
        LoanMethodName[LoanMethod.EqualPrincipalInterest],
      );
      expect(schedule[0].comment).toBe('');
    });

    it('每期月供相同', () => {
      const monthlyRate = annualToMonthlyRate(4.9);
      const startDate = new Date(2024, 0, 15);
      const schedule = generateSchedule(
        100000,
        12,
        monthlyRate,
        4.9,
        startDate,
        LoanMethod.EqualPrincipalInterest,
      );

      const firstPayment = schedule[0].monthlyPayment;
      for (const item of schedule) {
        expect(item.monthlyPayment).toBe(firstPayment);
      }
    });

    it('还款日期使用 REPAYMENT_DAY（15号）', () => {
      const monthlyRate = annualToMonthlyRate(4.9);
      const startDate = new Date(2024, 0, 15);
      const schedule = generateSchedule(
        100000,
        6,
        monthlyRate,
        4.9,
        startDate,
        LoanMethod.EqualPrincipalInterest,
      );

      expect(schedule[0].paymentDate).toBe('2024-02-15');
      expect(schedule[5].paymentDate).toBe('2024-07-15');
    });
  });

  describe('等额本金', () => {
    it('生成完整还款计划', () => {
      const monthlyRate = annualToMonthlyRate(4.9);
      const startDate = new Date(2024, 0, 15);
      const schedule = generateSchedule(
        120000,
        12,
        monthlyRate,
        4.9,
        startDate,
        LoanMethod.EqualPrincipal,
      );

      expect(schedule).toHaveLength(12);
      expect(schedule[11].remainingTerm).toBe(0);
      expect(schedule[11].remainingLoan).toBeCloseTo(0, 0);
      expect(schedule[0].loanMethod).toBe(
        LoanMethodName[LoanMethod.EqualPrincipal],
      );
    });

    it('每期本金固定，月供递减', () => {
      const monthlyRate = annualToMonthlyRate(4.9);
      const startDate = new Date(2024, 0, 15);
      const schedule = generateSchedule(
        120000,
        12,
        monthlyRate,
        4.9,
        startDate,
        LoanMethod.EqualPrincipal,
      );

      const firstPrincipal = schedule[0].principal;
      for (const item of schedule) {
        expect(item.principal).toBe(firstPrincipal);
      }

      // 月供递减（因为利息递减）
      expect(schedule[0].monthlyPayment).toBeGreaterThan(
        schedule[11].monthlyPayment,
      );
    });
  });
});

describe('findRemainingInfo', () => {
  const makeItem = (
    period: number,
    paymentDate: string,
    remainingLoan: number,
    remainingTerm: number,
    annualInterestRate = 4.9,
  ): PaymentScheduleItem => ({
    period,
    paymentDate,
    monthlyPayment: 1000,
    principal: 500,
    interest: 500,
    remainingLoan,
    remainingTerm,
    annualInterestRate,
    loanMethod: '等额本息',
    comment: '',
  });

  it('空数组返回 null', () => {
    expect(findRemainingInfo([], new Date(2024, 5, 1))).toBeNull();
  });

  it('changeDate 早于所有还款日期时返回 null', () => {
    const schedule = [
      makeItem(1, '2024-06-15', 90000, 11),
      makeItem(2, '2024-07-15', 80000, 10),
    ];
    // 2024-05-01 早于第一期 2024-06-15
    expect(findRemainingInfo(schedule, new Date(2024, 4, 1))).toBeNull();
  });

  it('正常查找已还期数和剩余信息', () => {
    const schedule = [
      makeItem(1, '2024-06-15', 90000, 11),
      makeItem(2, '2024-07-15', 80000, 10),
      makeItem(3, '2024-08-15', 70000, 9),
    ];
    // 2024-07-20 在第2期和第3期之间
    const result = findRemainingInfo(schedule, new Date(2024, 6, 20));
    expect(result).not.toBeNull();
    expect(result!.paidPeriods).toBe(2);
    expect(result!.remainingLoan).toBe(80000);
    expect(result!.remainingTerm).toBe(10);
    expect(result!.annualInterestRate).toBe(4.9);
    expect(result!.lastPaymentDate).toBe('2024-07-15');
    expect(result!.lastRegularPaymentDate).toBe('2024-07-15');
  });

  it('changeDate 恰好等于某期还款日', () => {
    const schedule = [
      makeItem(1, '2024-06-15', 90000, 11),
      makeItem(2, '2024-07-15', 80000, 10),
    ];
    // 使用字符串构造日期以避免 UTC/本地时区差异
    const result = findRemainingInfo(schedule, new Date('2024-06-15T12:00:00'));
    expect(result).not.toBeNull();
    expect(result!.paidPeriods).toBe(1);
    expect(result!.remainingLoan).toBe(90000);
  });

  it('changeDate 晚于所有期数时返回最后一期信息', () => {
    const schedule = [
      makeItem(1, '2024-06-15', 90000, 11),
      makeItem(2, '2024-07-15', 80000, 10),
    ];
    const result = findRemainingInfo(schedule, new Date(2025, 0, 1));
    expect(result).not.toBeNull();
    expect(result!.paidPeriods).toBe(2);
    expect(result!.remainingLoan).toBe(80000);
  });

  it('含 period=0 提前还款行时 lastRegularPaymentDate 取最后一个 period>0 的日期', () => {
    const schedule = [
      makeItem(1, '2024-06-15', 90000, 11),
      makeItem(0, '2024-06-20', 70000, 11), // 提前还款行，period=0
      makeItem(2, '2024-07-15', 60000, 10),
    ];
    // changeDate 在提前还款行之后、第2期之前
    const result = findRemainingInfo(schedule, new Date(2024, 5, 25));
    expect(result).not.toBeNull();
    expect(result!.paidPeriods).toBe(2);
    expect(result!.remainingLoan).toBe(70000);
    expect(result!.lastPaymentDate).toBe('2024-06-20');
    // lastRegularPaymentDate 应为 period>0 的最后一期
    expect(result!.lastRegularPaymentDate).toBe('2024-06-15');
  });

  it('所有已还期都是 period=0 时 lastRegularDate 为空，fallback 到 ref.paymentDate', () => {
    const schedule = [
      makeItem(0, '2024-06-15', 90000, 11),
      makeItem(0, '2024-06-20', 70000, 11),
      makeItem(1, '2024-07-15', 60000, 10),
    ];
    // changeDate 仅覆盖前两个 period=0 的行
    const result = findRemainingInfo(schedule, new Date(2024, 5, 22));
    expect(result).not.toBeNull();
    expect(result!.paidPeriods).toBe(2);
    expect(result!.lastPaymentDate).toBe('2024-06-20');
    // lastRegularDate 为空，fallback 到 ref.paymentDate
    expect(result!.lastRegularPaymentDate).toBe('2024-06-20');
  });
});

describe('calculateLoan', () => {
  it('等额本息方式返回月供和计划表', () => {
    const monthlyRate = annualToMonthlyRate(4.9);
    const startDate = new Date(2024, 0, 15);
    const result = calculateLoan(
      100000,
      12,
      monthlyRate,
      4.9,
      startDate,
      LoanMethod.EqualPrincipalInterest,
    );

    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(result.schedule).toHaveLength(12);
    expect(result.schedule[0].period).toBe(1);
    expect(result.schedule[11].remainingTerm).toBe(0);
  });

  it('等额本金方式返回首月月供和计划表', () => {
    const monthlyRate = annualToMonthlyRate(4.9);
    const startDate = new Date(2024, 0, 15);
    const result = calculateLoan(
      120000,
      12,
      monthlyRate,
      4.9,
      startDate,
      LoanMethod.EqualPrincipal,
    );

    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(result.schedule).toHaveLength(12);
    expect(result.schedule[0].loanMethod).toBe(
      LoanMethodName[LoanMethod.EqualPrincipal],
    );
  });

  it('月供值与 calcMonthlyPayment 一致（经 roundTo2）', () => {
    const monthlyRate = annualToMonthlyRate(3.65);
    const startDate = new Date(2024, 0, 15);
    const result = calculateLoan(
      500000,
      240,
      monthlyRate,
      3.65,
      startDate,
      LoanMethod.EqualPrincipalInterest,
    );

    const expected =
      Math.round(
        calcMonthlyPayment(
          500000,
          240,
          monthlyRate,
          LoanMethod.EqualPrincipalInterest,
        ) * 100,
      ) / 100;
    expect(result.monthlyPayment).toBe(expected);
  });
});
