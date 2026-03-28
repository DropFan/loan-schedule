import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  annualToMonthlyRate,
  calcScheduleSummary,
  calcTermByFixedPrincipal,
  calcTermByPayment,
  calculateLoan,
  findRemainingInfo,
} from '@/core/calculator/LoanCalculator';
import {
  ChangeType,
  type LoanChangeParams,
  type LoanChangeRecord,
  LoanMethod,
  LoanMethodName,
  type LoanParameters,
  type LoanScheduleSummary,
  type PaymentScheduleItem,
  PrepaymentMode,
} from '@/core/types/loan.types';
import { formatDate } from '@/core/utils/formatHelper';
import { MS_PER_DAY, REPAYMENT_DAY } from '@/constants/app.constants';

export interface RateEntry {
  date: string;
  annualRate: number;
  source: 'custom' | 'lpr' | string;
}

interface Snapshot {
  schedule: PaymentScheduleItem[];
  changeList: LoanChangeRecord[];
}

interface LoanState {
  params: LoanParameters | null;
  schedule: PaymentScheduleItem[];
  changes: LoanChangeRecord[];
  rateTable: RateEntry[];
  history: Snapshot[];

  // derived
  summary: LoanScheduleSummary | null;
  canUndo: boolean;

  // actions
  initialize: (params: LoanParameters) => void;
  applyChange: (change: LoanChangeParams) => void;
  undo: () => void;
  clear: () => void;
  updateRateTable: (entries: RateEntry[]) => void;
}

const STORAGE_KEY = 'loan-app-state';
const STORAGE_VERSION = 1;

export const useLoanStore = create<LoanState>()(
  persist(
    (set, get) => ({
      params: null,
      schedule: [],
      changes: [],
      rateTable: [],
      history: [],
      summary: null,
      canUndo: false,

      initialize: (params: LoanParameters) => {
        const monthlyRate = annualToMonthlyRate(params.annualInterestRate);
        const result = calculateLoan(
          params.loanAmount,
          params.loanTermMonths,
          monthlyRate,
          params.annualInterestRate,
          params.startDate,
          params.loanMethod,
        );

        // 首期按天计息
        const startDay = params.startDate.getDate();
        let firstPeriodComment = '';

        if (startDay !== REPAYMENT_DAY && result.schedule.length > 0) {
          const dailyRate = monthlyRate / 30;
          let extraDays: number;

          if (startDay < REPAYMENT_DAY) {
            extraDays = REPAYMENT_DAY - startDay + 1;
          } else {
            const daysInMonth = new Date(
              params.startDate.getFullYear(),
              params.startDate.getMonth() + 1,
              0,
            ).getDate();
            extraDays = daysInMonth - startDay + 1 + (REPAYMENT_DAY - 1);
          }

          const extraInterest = params.loanAmount * dailyRate * extraDays;
          result.schedule[0].monthlyPayment += extraInterest;
          result.schedule[0].interest += extraInterest;
          firstPeriodComment = `首期按天计息 ${extraInterest.toFixed(2)} 元`;
          result.schedule[0].comment = firstPeriodComment;
        }

        const initialChange: LoanChangeRecord = {
          date: params.startDate,
          loanAmount: params.loanAmount,
          remainingTerm: params.loanTermMonths,
          monthlyPayment: result.monthlyPayment,
          annualInterestRate: params.annualInterestRate,
          loanMethod: params.loanMethod,
          comment: firstPeriodComment
            ? `初始贷款，${firstPeriodComment}`
            : '初始贷款',
        };

        set({
          params,
          schedule: result.schedule,
          changes: [initialChange],
          history: [],
          summary: calcScheduleSummary(result.schedule),
          canUndo: false,
        });
      },

      applyChange: (changeParams: LoanChangeParams) => {
        const state = get();
        if (!state.params || state.schedule.length === 0) return;

        const remaining = findRemainingInfo(state.schedule, changeParams.date);
        if (!remaining) return;

        // 保存快照
        const snapshot: Snapshot = {
          schedule: state.schedule.map((item) => ({ ...item })),
          changeList: [...state.changes],
        };

        let remainingLoan = remaining.remainingLoan;
        let annualRate = remaining.annualInterestRate;
        let remainingTerm = remaining.remainingTerm;
        const method = changeParams.loanMethod;
        let comment = '';

        const lastRegularDate = new Date(remaining.lastRegularPaymentDate);
        const deltaDay =
          (changeParams.date.getTime() - lastRegularDate.getTime()) /
          MS_PER_DAY;
        let extraInterest = 0;

        if (
          changeParams.type === ChangeType.RateChange &&
          changeParams.newAnnualRate != null
        ) {
          annualRate = changeParams.newAnnualRate;
          comment = `利率变更为 ${annualRate.toFixed(2)}%`;

          if (deltaDay > 0) {
            extraInterest =
              (((remainingLoan * (remaining.annualInterestRate - annualRate)) /
                100 /
                12) *
                deltaDay) /
              30;
          }
        } else if (
          changeParams.type === ChangeType.Prepayment &&
          changeParams.prepayAmount != null
        ) {
          const prepayAmount = changeParams.prepayAmount;
          remainingLoan = remaining.remainingLoan - prepayAmount;
          comment = `提前还款 ${prepayAmount} 元`;

          if (deltaDay > 0) {
            extraInterest =
              (((prepayAmount * remaining.annualInterestRate) / 100 / 12) *
                deltaDay) /
              30;
          }

          if (changeParams.prepaymentMode === PrepaymentMode.ShortenTerm) {
            const newMonthlyRate = annualToMonthlyRate(annualRate);
            let newTerm: number | null;

            if (method === LoanMethod.EqualPrincipalInterest) {
              const currentMonthlyPayment =
                state.changes[state.changes.length - 1]?.monthlyPayment ?? 0;
              newTerm = calcTermByPayment(
                remainingLoan,
                currentMonthlyPayment,
                newMonthlyRate,
              );
            } else {
              const lastChange = state.changes[state.changes.length - 1];
              const fixedPrincipal =
                lastChange.loanAmount / lastChange.remainingTerm;
              newTerm = calcTermByFixedPrincipal(remainingLoan, fixedPrincipal);
            }

            if (newTerm != null && newTerm > 0) {
              const termDiff = remainingTerm - newTerm;
              remainingTerm = newTerm;
              comment += `，期数缩短 ${termDiff} 期`;
            }
          }
        }

        const monthlyRate = annualToMonthlyRate(annualRate);
        const newStartDate = new Date(remaining.lastRegularPaymentDate);

        const result = calculateLoan(
          remainingLoan,
          remainingTerm,
          monthlyRate,
          annualRate,
          newStartDate,
          method,
        );

        for (const item of result.schedule) {
          item.period += remaining.paidPeriods;
        }

        // 计算月供变化
        const oldMonthlyPayment =
          state.changes[state.changes.length - 1]?.monthlyPayment ?? 0;
        if (oldMonthlyPayment > 0) {
          const diff = Number.parseFloat(
            (result.monthlyPayment - oldMonthlyPayment).toFixed(2),
          );
          if (diff > 0) {
            comment += `，月供增加 ${diff.toFixed(2)} 元`;
          } else if (diff < 0) {
            comment += `，月供减少 ${Math.abs(diff).toFixed(2)} 元`;
          } else {
            comment += '，月供不变';
          }
        }

        if (extraInterest !== 0) {
          comment += `，按天息差 ${extraInterest.toFixed(2)} 元`;
        }

        const dateStr = formatDate(changeParams.date);
        const oldSchedule = state.schedule.slice(0, remaining.paidPeriods);
        let newSchedule: PaymentScheduleItem[];

        if (
          changeParams.type === ChangeType.Prepayment &&
          changeParams.prepayAmount != null
        ) {
          const prepayItem: PaymentScheduleItem = {
            period: 0,
            paymentDate: dateStr,
            monthlyPayment: changeParams.prepayAmount + extraInterest,
            principal: changeParams.prepayAmount,
            interest: extraInterest,
            remainingLoan: Math.max(remainingLoan, 0),
            remainingTerm,
            annualInterestRate: remaining.annualInterestRate,
            loanMethod: LoanMethodName[method],
            comment: ` ${dateStr}${comment}`,
          };
          newSchedule = oldSchedule.concat([prepayItem], result.schedule);
        } else {
          if (extraInterest !== 0 && result.schedule.length > 0) {
            result.schedule[0].monthlyPayment += extraInterest;
            result.schedule[0].interest += extraInterest;
          }
          if (result.schedule.length > 0) {
            result.schedule[0].comment = ` ${dateStr}${comment}`;
          }
          newSchedule = oldSchedule.concat(result.schedule);
        }

        const newChange: LoanChangeRecord = {
          date: changeParams.date,
          loanAmount: remainingLoan,
          remainingTerm,
          monthlyPayment: result.monthlyPayment,
          annualInterestRate: annualRate,
          loanMethod: method,
          comment,
        };

        const newHistory = [...state.history, snapshot];
        set({
          schedule: newSchedule,
          changes: [...state.changes, newChange],
          history: newHistory,
          summary: calcScheduleSummary(newSchedule),
          canUndo: true,
        });
      },

      undo: () => {
        const state = get();
        const prev = state.history[state.history.length - 1];
        if (!prev) return;

        const newHistory = state.history.slice(0, -1);
        set({
          schedule: prev.schedule,
          changes: prev.changeList,
          history: newHistory,
          summary: calcScheduleSummary(prev.schedule),
          canUndo: newHistory.length > 0,
        });
      },

      clear: () => {
        set({
          params: null,
          schedule: [],
          changes: [],
          rateTable: [],
          history: [],
          summary: null,
          canUndo: false,
        });
      },

      updateRateTable: (entries: RateEntry[]) => {
        set({ rateTable: entries });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch {
            // quota exceeded or unavailable
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // unavailable
          }
        },
      },
      partialize: (state) => ({
        params: state.params,
        schedule: state.schedule,
        changes: state.changes,
        rateTable: state.rateTable,
      }),
    },
  ),
);
