import { useMemo } from 'react';
import {
  type CombinedScheduleItem,
  type CombinedSummary,
  calcCombinedSummary,
  mergeCombinedSchedule,
} from '@/core/calculator/CombinedLoanHelper';
import type { LoanGroup, PaymentScheduleItem } from '@/core/types/loan.types';
import { type SavedLoan, useLoanStore } from '@/stores/useLoanStore';

interface CombinedLoanResult {
  group: LoanGroup | undefined;
  loanA: SavedLoan | undefined;
  loanB: SavedLoan | undefined;
  combinedSchedule: CombinedScheduleItem[];
  combinedSummary: CombinedSummary | null;
  isCombinedMode: boolean;
}

export function useCombinedLoan(): CombinedLoanResult {
  const activeGroupId = useLoanStore((s) => s.activeGroupId);
  const savedGroups = useLoanStore((s) => s.savedGroups);
  const savedLoans = useLoanStore((s) => s.savedLoans);
  const activeLoanId = useLoanStore((s) => s.activeLoanId);
  const currentSchedule = useLoanStore((s) => s.schedule);

  const group = savedGroups.find((g) => g.id === activeGroupId);
  const loanA = savedLoans.find((l) => l.id === group?.loanIds[0]);
  const loanB = savedLoans.find((l) => l.id === group?.loanIds[1]);

  // 获取子方案的 schedule，优先使用工作区未保存的数据
  const scheduleA = useMemo((): PaymentScheduleItem[] => {
    if (!loanA) return [];
    if (activeLoanId === loanA.id) return currentSchedule;
    return loanA.schedule;
  }, [loanA, activeLoanId, currentSchedule]);

  const scheduleB = useMemo((): PaymentScheduleItem[] => {
    if (!loanB) return [];
    if (activeLoanId === loanB.id) return currentSchedule;
    return loanB.schedule;
  }, [loanB, activeLoanId, currentSchedule]);

  const combinedSchedule = useMemo(
    () =>
      scheduleA.length > 0 && scheduleB.length > 0
        ? mergeCombinedSchedule(scheduleA, scheduleB)
        : [],
    [scheduleA, scheduleB],
  );

  const combinedSummary = useMemo(
    () =>
      scheduleA.length > 0 && scheduleB.length > 0
        ? calcCombinedSummary(scheduleA, scheduleB)
        : null,
    [scheduleA, scheduleB],
  );

  return {
    group,
    loanA,
    loanB,
    combinedSchedule,
    combinedSummary,
    isCombinedMode: !!activeGroupId,
  };
}
