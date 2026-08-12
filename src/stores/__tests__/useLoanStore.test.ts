import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_REPAYMENT_DAY } from '@/constants/app.constants';
import {
  ChangeType,
  LoanMethod,
  LoanType,
  PrepaymentMode,
  ReamortizeTarget,
} from '@/core/types/loan.types';
import { useLoanStore } from '../useLoanStore';

describe('useLoanStore', () => {
  beforeEach(() => {
    useLoanStore.getState().clear();
  });

  it('initialize 应生成还款计划和初始变更记录', () => {
    useLoanStore.getState().initialize({
      loanType: LoanType.Commercial,
      loanAmount: 1_000_000,
      loanTermMonths: 360,
      annualInterestRate: 3.5,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      startDate: new Date(2024, 0, 15),
      repaymentDay: DEFAULT_REPAYMENT_DAY,
    });

    const state = useLoanStore.getState();
    expect(state.params).not.toBeNull();
    expect(state.schedule.length).toBe(360);
    expect(state.changes.length).toBe(1);
    expect(state.changes[0].comment).toContain('初始贷款');
    expect(state.summary).not.toBeNull();
    expect(state.summary!.totalPayment).toBeGreaterThan(1_000_000);
    expect(state.canUndo).toBe(false);
  });

  it('clear 应重置所有状态', () => {
    useLoanStore.getState().initialize({
      loanType: LoanType.Commercial,
      loanAmount: 500_000,
      loanTermMonths: 120,
      annualInterestRate: 4.0,
      loanMethod: LoanMethod.EqualPrincipal,
      startDate: new Date(2024, 0, 15),
      repaymentDay: DEFAULT_REPAYMENT_DAY,
    });

    useLoanStore.getState().clear();

    const state = useLoanStore.getState();
    expect(state.params).toBeNull();
    expect(state.schedule).toHaveLength(0);
    expect(state.changes).toHaveLength(0);
    expect(state.summary).toBeNull();
  });

  it('rehydrate 应恢复当前方案、快照和已保存方案中的嵌套日期', async () => {
    useLoanStore.getState().initialize({
      loanType: LoanType.Commercial,
      loanAmount: 1_000_000,
      loanTermMonths: 360,
      annualInterestRate: 3.5,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      startDate: new Date(2024, 0, 15),
      repaymentDay: DEFAULT_REPAYMENT_DAY,
    });
    useLoanStore.getState().applyChange({
      type: ChangeType.RateChange,
      date: new Date(2024, 6, 15),
      loanMethod: LoanMethod.EqualPrincipalInterest,
      newAnnualRate: 4,
    });
    useLoanStore.getState().applyChange({
      type: ChangeType.RateChange,
      date: new Date(2025, 0, 15),
      loanMethod: LoanMethod.EqualPrincipalInterest,
      newAnnualRate: 3.8,
    });
    useLoanStore.getState().saveLoan('日期恢复测试');

    const persisted = localStorage.getItem('loan-app-state');
    expect(persisted).not.toBeNull();

    useLoanStore.getState().clear();
    localStorage.setItem('loan-app-state', persisted!);
    await useLoanStore.persist.rehydrate();

    const state = useLoanStore.getState();
    expect(state.changes[1].date).toBeInstanceOf(Date);
    expect(state.changes[1].changeParams?.date).toBeInstanceOf(Date);
    expect(state.history[1].params?.startDate).toBeInstanceOf(Date);
    expect(state.history[1].changeList[1].date).toBeInstanceOf(Date);
    expect(state.history[1].changeList[1].changeParams?.date).toBeInstanceOf(
      Date,
    );

    const saved = state.savedLoans.find((loan) => loan.name === '日期恢复测试');
    expect(saved?.changes[1].changeParams?.date).toBeInstanceOf(Date);
    expect(saved?.history[1].params?.startDate).toBeInstanceOf(Date);
    expect(saved?.history[1].changeList[1].changeParams?.date).toBeInstanceOf(
      Date,
    );
  });
});

describe('useLoanStore applyChange 提前还款（基线行为）', () => {
  // 100 万 / 30 年 / 3.5% / 等额本息，起始日与还款日同为 15 号（无首期按天计息）
  const setupLoan = (method = LoanMethod.EqualPrincipalInterest) => {
    useLoanStore.getState().initialize({
      loanType: LoanType.Commercial,
      loanAmount: 1_000_000,
      loanTermMonths: 360,
      annualInterestRate: 3.5,
      loanMethod: method,
      startDate: new Date(2024, 0, 15),
      repaymentDay: DEFAULT_REPAYMENT_DAY,
    });
  };

  // 提前还款日落在第 12 期(2025-01-15)与第 13 期(2025-02-15)之间，任何时区下都计为已还 12 期
  const PREPAY_DATE = new Date(2025, 1, 10);
  const PREPAY_AMOUNT = 200_000;

  /** 用与 findRemainingInfo 相同的比较口径，取出提前还款前的剩余信息 */
  const remainingBefore = () => {
    const sched = useLoanStore.getState().schedule;
    const paid = sched.filter((i) => new Date(i.paymentDate) <= PREPAY_DATE);
    return paid[paid.length - 1];
  };

  beforeEach(() => {
    useLoanStore.getState().clear();
  });

  it('减少月供模式：期限不变、月供下降、插入提前还款行', () => {
    setupLoan();
    const initialPayment = useLoanStore.getState().changes[0].monthlyPayment;
    const before = remainingBefore();

    useLoanStore.getState().applyChange({
      type: ChangeType.Prepayment,
      date: PREPAY_DATE,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      prepayAmount: PREPAY_AMOUNT,
      prepaymentMode: PrepaymentMode.ReducePayment,
    });

    const state = useLoanStore.getState();
    const rec = state.changes[state.changes.length - 1];

    expect(state.changes).toHaveLength(2);
    // 期限不变：剩余期数与提前还款前一致
    expect(rec.remainingTerm).toBe(before.remainingTerm);
    // 月供下降
    expect(rec.monthlyPayment).toBeLessThan(initialPayment);
    // 剩余本金按还款额减少
    expect(rec.loanAmount).toBeCloseTo(before.remainingLoan - PREPAY_AMOUNT, 2);
    // 总常规期数不变（已还 12 期 + 剩余期数）
    const regularRows = state.schedule.filter((i) => i.period > 0);
    expect(regularRows).toHaveLength(360);
    // 插入一条 period=0 的提前还款行，本金等于还款额
    const prepayRow = state.schedule.find((i) => i.period === 0);
    expect(prepayRow).toBeDefined();
    expect(prepayRow!.principal).toBe(PREPAY_AMOUNT);
    expect(rec.comment).toContain('提前还款');
  });

  it('缩短年限模式：月供约不变、期限缩短、总期数减少', () => {
    setupLoan();
    const initialPayment = useLoanStore.getState().changes[0].monthlyPayment;
    const before = remainingBefore();

    useLoanStore.getState().applyChange({
      type: ChangeType.Prepayment,
      date: PREPAY_DATE,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      prepayAmount: PREPAY_AMOUNT,
      prepaymentMode: PrepaymentMode.ShortenTerm,
    });

    const state = useLoanStore.getState();
    const rec = state.changes[state.changes.length - 1];

    // 期限缩短
    expect(rec.remainingTerm).toBeLessThan(before.remainingTerm);
    // 月供约不变（因期数向上取整，重算月供略低于原值但接近）
    expect(rec.monthlyPayment).toBeLessThanOrEqual(initialPayment + 0.01);
    expect(rec.monthlyPayment).toBeGreaterThan(initialPayment * 0.95);
    // 总常规期数减少
    const regularRows = state.schedule.filter((i) => i.period > 0);
    expect(regularRows.length).toBeLessThan(360);
    expect(rec.loanAmount).toBeCloseTo(before.remainingLoan - PREPAY_AMOUNT, 2);
    expect(rec.comment).toContain('期数缩短');
  });

  it('等额本金缩短年限：期限缩短并插入提前还款行', () => {
    setupLoan(LoanMethod.EqualPrincipal);
    const before = remainingBefore();

    useLoanStore.getState().applyChange({
      type: ChangeType.Prepayment,
      date: PREPAY_DATE,
      loanMethod: LoanMethod.EqualPrincipal,
      prepayAmount: PREPAY_AMOUNT,
      prepaymentMode: PrepaymentMode.ShortenTerm,
    });

    const state = useLoanStore.getState();
    const rec = state.changes[state.changes.length - 1];

    expect(rec.remainingTerm).toBeLessThan(before.remainingTerm);
    expect(rec.loanAmount).toBeCloseTo(before.remainingLoan - PREPAY_AMOUNT, 2);
    const prepayRow = state.schedule.find((i) => i.period === 0);
    expect(prepayRow).toBeDefined();
    expect(prepayRow!.principal).toBe(PREPAY_AMOUNT);
  });

  it('全额提前结清：剩余本金清零、无后续常规还款行', () => {
    setupLoan();
    const before = remainingBefore();

    useLoanStore.getState().applyChange({
      type: ChangeType.Prepayment,
      date: PREPAY_DATE,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      prepayAmount: before.remainingLoan,
      prepaymentMode: PrepaymentMode.ReducePayment,
    });

    const state = useLoanStore.getState();
    const rec = state.changes[state.changes.length - 1];

    expect(rec.loanAmount).toBeLessThanOrEqual(0);
    const prepayRow = state.schedule.find((i) => i.period === 0);
    expect(prepayRow).toBeDefined();
    // 结清后不应再有提前还款日之后的常规还款行
    const futureRegular = state.schedule.filter(
      (i) => i.period > 0 && new Date(i.paymentDate) > PREPAY_DATE,
    );
    expect(futureRegular).toHaveLength(0);
  });
});

describe('useLoanStore applyChange 再分期（Reamortize）', () => {
  const CHANGE_DATE = new Date(2025, 1, 10); // 第 12 期后

  const setupLoan = () => {
    useLoanStore.getState().initialize({
      loanType: LoanType.Commercial,
      loanAmount: 1_000_000,
      loanTermMonths: 360,
      annualInterestRate: 3.5,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      startDate: new Date(2024, 0, 15),
      repaymentDay: DEFAULT_REPAYMENT_DAY,
    });
  };

  const remainingBefore = () => {
    const sched = useLoanStore.getState().schedule;
    const paid = sched.filter((i) => new Date(i.paymentDate) <= CHANGE_DATE);
    return paid[paid.length - 1];
  };

  beforeEach(() => {
    useLoanStore.getState().clear();
  });

  it('按期数（无提前还款）：期限改为目标值、月供上升、无提前还款行', () => {
    setupLoan();
    const initialPayment = useLoanStore.getState().changes[0].monthlyPayment;
    const before = remainingBefore();

    useLoanStore.getState().applyChange({
      type: ChangeType.Reamortize,
      date: CHANGE_DATE,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      reamortizeTarget: ReamortizeTarget.Term,
      targetTerm: 240,
    });

    const state = useLoanStore.getState();
    const rec = state.changes[state.changes.length - 1];

    expect(rec.remainingTerm).toBe(240);
    expect(rec.monthlyPayment).toBeGreaterThan(initialPayment); // 缩短期限→月供上升
    expect(rec.loanAmount).toBeCloseTo(before.remainingLoan, 2); // 无提前还款，本金不变
    expect(state.schedule.find((i) => i.period === 0)).toBeUndefined();
    const regularRows = state.schedule.filter((i) => i.period > 0);
    expect(regularRows).toHaveLength(12 + 240);
    expect(rec.comment).toContain('期数调整为 240 期');
  });

  it('按月供（无提前还款）：期限缩短、实际月供不超目标、末期残值收口', () => {
    setupLoan();
    const initialPayment = useLoanStore.getState().changes[0].monthlyPayment;
    const before = remainingBefore();
    const target = Math.round(initialPayment * 1.5);

    useLoanStore.getState().applyChange({
      type: ChangeType.Reamortize,
      date: CHANGE_DATE,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      reamortizeTarget: ReamortizeTarget.Payment,
      targetMonthlyPayment: target,
    });

    const state = useLoanStore.getState();
    const rec = state.changes[state.changes.length - 1];

    expect(rec.remainingTerm).toBeLessThan(before.remainingTerm);
    expect(rec.monthlyPayment).toBeGreaterThan(initialPayment);
    expect(rec.monthlyPayment).toBeLessThanOrEqual(target); // 实际月供不超过目标
    // 末期残值在 1 元容差内收口
    const lastRegular = state.schedule.filter((i) => i.period > 0).pop();
    expect(Math.abs(lastRegular!.remainingLoan)).toBeLessThan(1);
    expect(rec.comment).toContain('按目标月供重算为');
  });

  it('按期数 + 提前还款：插入提前还款行、本金按额减少、期限改为目标值', () => {
    setupLoan();
    const before = remainingBefore();

    useLoanStore.getState().applyChange({
      type: ChangeType.Reamortize,
      date: CHANGE_DATE,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      reamortizeTarget: ReamortizeTarget.Term,
      targetTerm: 200,
      prepayAmount: 150_000,
    });

    const state = useLoanStore.getState();
    const rec = state.changes[state.changes.length - 1];

    expect(rec.remainingTerm).toBe(200);
    expect(rec.loanAmount).toBeCloseTo(before.remainingLoan - 150_000, 2);
    const prepayRow = state.schedule.find((i) => i.period === 0);
    expect(prepayRow).toBeDefined();
    expect(prepayRow!.principal).toBe(150_000);
    expect(rec.comment).toContain('提前还款');
    expect(rec.comment).toContain('期数调整为 200 期');
  });

  it('乱序重放：补一条更早的利率变更后，再分期目标期数仍保持', () => {
    setupLoan();

    // 先做再分期（晚），目标 240 期
    useLoanStore.getState().applyChange({
      type: ChangeType.Reamortize,
      date: CHANGE_DATE,
      loanMethod: LoanMethod.EqualPrincipalInterest,
      reamortizeTarget: ReamortizeTarget.Term,
      targetTerm: 240,
    });

    // 再补一条更早日期的利率变更，触发全量重放
    useLoanStore.getState().applyChange({
      type: ChangeType.RateChange,
      date: new Date(2024, 6, 15),
      loanMethod: LoanMethod.EqualPrincipalInterest,
      newAnnualRate: 4.0,
    });

    const state = useLoanStore.getState();
    // changes: 初始 + 利率变更 + 再分期（按日期排序后再分期在最后）
    expect(state.changes).toHaveLength(3);
    const last = state.changes[state.changes.length - 1];
    expect(last.remainingTerm).toBe(240); // 目标期数随 changeParams 保真
    expect(last.comment).toContain('期数调整为 240 期');
  });
});
