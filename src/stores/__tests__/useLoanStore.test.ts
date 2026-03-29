import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_REPAYMENT_DAY } from '@/constants/app.constants';
import { LoanMethod, LoanType } from '@/core/types/loan.types';
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
});
