import { beforeEach, describe, expect, it } from 'vitest';
import { LoanMethod, LoanType } from '@/core/types/loan.types';
import { useLoanStore } from '@/stores/useLoanStore';
import { importData } from '../data-transfer';

const baseParams = {
  loanType: LoanType.Commercial,
  loanAmount: 500_000,
  loanTermMonths: 120,
  annualInterestRate: 3.6,
  loanMethod: LoanMethod.EqualPrincipalInterest,
  startDate: '2024-01-15',
  repaymentDay: 15,
};

function createImportFile(data: unknown): File {
  return new File([JSON.stringify(data)], 'loan-data.json', {
    type: 'application/json',
  });
}

describe('importData', () => {
  beforeEach(() => {
    localStorage.clear();
    useLoanStore.setState({
      params: null,
      schedule: [],
      changes: [],
      rateTable: [],
      history: [],
      savedLoans: [],
      activeLoanId: null,
      savedGroups: [],
      activeGroupId: null,
      savedRateTables: [],
      activeRateTableId: null,
      loanDirty: false,
      rateTableDirty: false,
      summary: null,
      canUndo: false,
    });
  });

  it('后续方案解析失败时恢复导入前的完整状态', async () => {
    useLoanStore.getState().initialize({
      ...baseParams,
      startDate: new Date(baseParams.startDate),
    });
    const existingId = useLoanStore.getState().saveLoan('原有方案');
    const beforeState = useLoanStore.getState();

    const file = createImportFile({
      version: 1,
      exportedAt: '2026-08-13T00:00:00.000Z',
      appVersion: '2.8.0',
      loans: [
        {
          name: '可导入方案',
          params: baseParams,
          changeParams: [],
          rateTable: [],
        },
        {
          name: '无效自由还款方案',
          params: {
            ...baseParams,
            loanMethod: LoanMethod.FreeRepayment,
            monthlyPaymentAmount: 1_500,
          },
          changeParams: [],
          rateTable: [],
        },
      ],
      rateTables: [],
    });

    await expect(importData(file)).rejects.toThrow(
      '自由还款月供必须大于首期利息',
    );

    const state = useLoanStore.getState();
    expect(state.savedLoans).toEqual(beforeState.savedLoans);
    expect(state.activeLoanId).toBe(existingId);
    expect(state.params).toEqual(beforeState.params);
    expect(state.schedule).toEqual(beforeState.schedule);
    expect(state.changes).toEqual(beforeState.changes);
    expect(state.history).toEqual(beforeState.history);
    expect(state.savedGroups).toEqual(beforeState.savedGroups);
    expect(state.savedRateTables).toEqual(beforeState.savedRateTables);
  });

  it('拒绝数组结构不正确的数据文件且不修改状态', async () => {
    const beforeState = useLoanStore.getState();
    const file = createImportFile({
      version: 1,
      loans: {},
      rateTables: [],
    });

    await expect(importData(file)).rejects.toThrow('无效的数据文件');
    expect(useLoanStore.getState()).toEqual(beforeState);
  });
});
