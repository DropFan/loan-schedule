import { DEFAULT_REPAYMENT_DAY } from '@/constants/app.constants';
import type { LoanChangeParams, LoanParameters } from '@/core/types/loan.types';
import type { RateEntry } from '@/stores/useLoanStore';
import { useLoanStore } from '@/stores/useLoanStore';

const EXPORT_VERSION = 1;

interface ExportLoan {
  name: string;
  params: LoanParameters;
  changeParams: LoanChangeParams[];
  rateTable: RateEntry[];
}

interface ExportData {
  version: number;
  exportedAt: string;
  appVersion: string;
  loans: ExportLoan[];
  rateTables: Array<{
    name: string;
    entries: RateEntry[];
    source: 'custom' | 'lpr';
    basisPoints?: number;
  }>;
}

export function exportData() {
  const state = useLoanStore.getState();
  const loans: ExportLoan[] = [];

  // 当前活跃的未保存方案
  if (state.params && !state.activeLoanId) {
    loans.push({
      name: '未保存的方案',
      params: state.params,
      changeParams: state.changes
        .map((c) => c.changeParams)
        .filter((p): p is LoanChangeParams => p != null),
      rateTable: state.rateTable,
    });
  }

  // 已保存的方案
  for (const loan of state.savedLoans) {
    if (!loan.params) continue;
    loans.push({
      name: loan.name,
      params: loan.params,
      changeParams: loan.changes
        .map((c) => c.changeParams)
        .filter((p): p is LoanChangeParams => p != null),
      rateTable: loan.rateTable,
    });
  }

  const data: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '2.1.0',
    loans,
    rateTables: state.savedRateTables.map((t) => ({
      name: t.name,
      entries: t.entries,
      source: t.source,
      basisPoints: t.basisPoints,
    })),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loan-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ExportData;
        if (!data.version || !data.loans) {
          reject(new Error('无效的数据文件'));
          return;
        }

        const store = useLoanStore.getState();
        let importedCount = 0;

        for (const loan of data.loans) {
          if (!loan.params) continue;

          // 恢复 Date 对象，兼容旧数据
          loan.params.startDate = new Date(loan.params.startDate);
          loan.params.repaymentDay ??= DEFAULT_REPAYMENT_DAY;
          for (const cp of loan.changeParams) {
            cp.date = new Date(cp.date);
          }

          // 断开与前一个方案的关联，确保 saveLoan 创建新条目
          useLoanStore.setState({ activeLoanId: null });
          store.initialize(loan.params);

          // 按时间排序后逐条应用
          const sorted = [...loan.changeParams].sort(
            (a, b) => a.date.getTime() - b.date.getTime(),
          );
          for (const cp of sorted) {
            useLoanStore.getState().applyChange(cp);
          }

          // 恢复利率表
          if (loan.rateTable?.length > 0) {
            useLoanStore.getState().updateRateTable(loan.rateTable);
          }

          // 保存为方案
          useLoanStore.getState().saveLoan(loan.name);
          importedCount++;
        }

        // 导入利率表
        for (const rt of data.rateTables ?? []) {
          useLoanStore.getState().updateRateTable(rt.entries);
          useLoanStore
            .getState()
            .saveRateTable(rt.name, rt.source, rt.basisPoints);
        }

        resolve(
          `导入成功：${importedCount} 个方案，${data.rateTables?.length ?? 0} 个利率表`,
        );
      } catch (e) {
        reject(
          new Error(`解析失败：${e instanceof Error ? e.message : '未知错误'}`),
        );
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
