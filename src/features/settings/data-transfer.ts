import { APP_VERSION, DEFAULT_REPAYMENT_DAY } from '@/constants/app.constants';
import {
  type LoanChangeParams,
  type LoanParameters,
  LoanType,
} from '@/core/types/loan.types';
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
    source: 'custom' | 'lpr' | 'gjj';
    basisPoints?: number;
    gjjAbove5Y?: boolean;
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
    appVersion: APP_VERSION,
    loans,
    rateTables: state.savedRateTables.map((t) => ({
      name: t.name,
      entries: t.entries,
      source: t.source,
      basisPoints: t.basisPoints,
      gjjAbove5Y: t.gjjAbove5Y,
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

/** 同名自动追加序号：如果 existingNames 中已有 name，返回 "name (2)"、"name (3)"... */
function deduplicateName(name: string, existingNames: Set<string>): string {
  if (!existingNames.has(name)) return name;
  let i = 2;
  while (existingNames.has(`${name} (${i})`)) i++;
  return `${name} (${i})`;
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

        // 收集已有名称用于去重
        const loanNames = new Set(store.savedLoans.map((l) => l.name));
        const rtNames = new Set(store.savedRateTables.map((t) => t.name));

        for (const loan of data.loans) {
          if (!loan.params) continue;

          // 恢复 Date 对象，兼容旧数据
          loan.params.startDate = new Date(loan.params.startDate);
          loan.params.repaymentDay ??= DEFAULT_REPAYMENT_DAY;
          loan.params.loanType ??= LoanType.Commercial;
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

          // 保存为方案（同名自动重命名）
          const uniqueName = deduplicateName(loan.name, loanNames);
          loanNames.add(uniqueName);
          useLoanStore.getState().saveLoan(uniqueName);
          importedCount++;
        }

        // 导入利率表
        for (const rt of data.rateTables ?? []) {
          const uniqueRtName = deduplicateName(rt.name, rtNames);
          rtNames.add(uniqueRtName);
          useLoanStore.setState({ activeRateTableId: null });
          useLoanStore.getState().updateRateTable(rt.entries);
          useLoanStore
            .getState()
            .saveRateTable(
              uniqueRtName,
              rt.source,
              rt.basisPoints,
              rt.gjjAbove5Y,
            );
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
