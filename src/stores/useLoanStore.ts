import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_REPAYMENT_DAY, MS_PER_DAY } from '@/constants/app.constants';
import {
  annualToMonthlyRate,
  calc30360Days,
  calcGjjInterestSplit,
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
  LoanType,
  type PaymentScheduleItem,
  PrepaymentMode,
} from '@/core/types/loan.types';
import { addMonths, formatDate, roundTo2 } from '@/core/utils/formatHelper';

export interface RateEntry {
  date: string;
  annualRate: number;
  source: 'custom' | 'lpr' | 'gjj' | string;
}

export interface SavedRateTable {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  entries: RateEntry[];
  source: 'custom' | 'lpr' | 'gjj';
  basisPoints?: number;
  gjjAbove5Y?: boolean;
}

interface Snapshot {
  schedule: PaymentScheduleItem[];
  changeList: LoanChangeRecord[];
  params?: LoanParameters | null;
}

export interface SavedLoan {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  params: LoanParameters | null;
  schedule: PaymentScheduleItem[];
  changes: LoanChangeRecord[];
  rateTable: RateEntry[];
  history: Snapshot[];
}

interface LoanState {
  params: LoanParameters | null;
  schedule: PaymentScheduleItem[];
  changes: LoanChangeRecord[];
  rateTable: RateEntry[];
  history: Snapshot[];

  // multi-loan
  savedLoans: SavedLoan[];
  activeLoanId: string | null;

  // multi-rate-table
  savedRateTables: SavedRateTable[];
  activeRateTableId: string | null;

  // settings
  autoSave: boolean;
  autoUpdate: boolean;

  // dirty flags (only used when autoSave is off)
  loanDirty: boolean;
  rateTableDirty: boolean;

  // derived
  summary: LoanScheduleSummary | null;
  canUndo: boolean;

  // actions
  setAutoSave: (value: boolean) => void;
  setAutoUpdate: (value: boolean) => void;
  initialize: (params: LoanParameters) => void;
  applyChange: (change: LoanChangeParams) => void;
  undo: () => void;
  clear: () => void;
  updateRateTable: (entries: RateEntry[]) => void;

  // multi-loan actions
  saveLoan: (name: string) => string;
  loadLoan: (id: string) => void;
  deleteLoan: (id: string) => void;
  renameLoan: (id: string, name: string) => void;

  // multi-rate-table actions
  saveRateTable: (
    name: string,
    source: 'custom' | 'lpr' | 'gjj',
    basisPoints?: number,
    gjjAbove5Y?: boolean,
  ) => string;
  loadRateTable: (id: string) => void;
  deleteRateTable: (id: string) => void;
  renameRateTable: (id: string, name: string) => void;
}

const STORAGE_KEY = 'loan-app-state';
const STORAGE_VERSION = 1;

export const useLoanStore = create<LoanState>()(
  persist(
    (set, get) => {
      /** 自动保存当前贷款方案 / 标记脏状态 */
      const markLoanDirty = () => {
        const s = get();
        if (!s.activeLoanId) return;
        if (s.autoSave) {
          const loan = s.savedLoans.find((l) => l.id === s.activeLoanId);
          if (loan) get().saveLoan(loan.name);
        } else {
          set({ loanDirty: true });
        }
      };

      /** 自动保存当前利率表 / 标记脏状态 */
      const markRateTableDirty = () => {
        const s = get();
        if (!s.activeRateTableId) return;
        if (s.autoSave) {
          const rt = s.savedRateTables.find(
            (t) => t.id === s.activeRateTableId,
          );
          if (rt)
            get().saveRateTable(
              rt.name,
              rt.source,
              rt.basisPoints,
              rt.gjjAbove5Y,
            );
        } else {
          set({ rateTableDirty: true });
        }
      };

      return {
        params: null,
        schedule: [],
        changes: [],
        rateTable: [],
        history: [],
        savedLoans: [],
        activeLoanId: null,
        savedRateTables: [],
        activeRateTableId: null,
        autoSave: true,
        autoUpdate: true,
        loanDirty: false,
        rateTableDirty: false,
        summary: null,
        canUndo: false,

        setAutoSave: (value: boolean) => set({ autoSave: value }),
        setAutoUpdate: (value: boolean) => set({ autoUpdate: value }),

        initialize: (params: LoanParameters) => {
          const monthlyRate = annualToMonthlyRate(params.annualInterestRate);
          const repaymentDay = params.repaymentDay;
          const result = calculateLoan(
            params.loanAmount,
            params.loanTermMonths,
            monthlyRate,
            params.annualInterestRate,
            params.startDate,
            params.loanMethod,
            repaymentDay,
            params.monthlyPaymentAmount,
          );

          // 首期按天计息
          const startDay = params.startDate.getDate();
          let firstPeriodComment = '';

          const isGjjFree =
            params.loanType === LoanType.ProvidentFund &&
            params.loanMethod === LoanMethod.FreeRepayment;

          if (
            !isGjjFree &&
            startDay !== repaymentDay &&
            result.schedule.length > 0
          ) {
            const dailyRate = monthlyRate / 30;
            let extraDays: number;

            if (startDay < repaymentDay) {
              extraDays = repaymentDay - startDay + 1;
            } else {
              const daysInMonth = new Date(
                params.startDate.getFullYear(),
                params.startDate.getMonth() + 1,
                0,
              ).getDate();
              extraDays = daysInMonth - startDay + 1 + (repaymentDay - 1);
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

          markLoanDirty();
        },

        applyChange: (changeParams: LoanChangeParams) => {
          const state = get();
          if (!state.params || state.schedule.length === 0) return;

          // 检测乱序插入：如果新变更日期早于最后一条变更，则全量重放
          const lastChange =
            state.changes.length > 1
              ? state.changes[state.changes.length - 1]
              : null;
          if (lastChange && changeParams.date < lastChange.date) {
            // 收集所有已有的 changeParams（跳过初始记录）
            const existingParams = state.changes
              .slice(1)
              .map((c) => c.changeParams)
              .filter((p): p is LoanChangeParams => p != null);
            // 合并新变更，按日期排序
            const allParams = [...existingParams, changeParams].sort(
              (a, b) => a.date.getTime() - b.date.getTime(),
            );
            // 重新初始化贷款
            get().initialize(state.params);
            // 按序重放所有变更
            for (const cp of allParams) {
              get().applyChange(cp);
            }
            return;
          }

          const remaining = findRemainingInfo(
            state.schedule,
            changeParams.date,
          );
          if (!remaining) return;

          // 保存快照
          const snapshot: Snapshot = {
            schedule: state.schedule.map((item) => ({ ...item })),
            changeList: [...state.changes],
            params: state.params ? { ...state.params } : null,
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

          const isGjj = state.params.loanType === LoanType.ProvidentFund;

          if (
            changeParams.type === ChangeType.RateChange &&
            changeParams.newAnnualRate != null
          ) {
            annualRate = changeParams.newAnnualRate;
            comment = `利率变更为 ${annualRate.toFixed(2)}%`;

            if (isGjj) {
              // 公积金: 30/360 按天计息，基于放款日
              const originDay = state.params.startDate.getDate();
              const { daysOld, daysNew } = calcGjjInterestSplit(
                originDay,
                changeParams.date,
              );
              const blendedInterest =
                (remainingLoan *
                  (remaining.annualInterestRate * daysOld +
                    annualRate * daysNew)) /
                36000;
              const normalInterest = (remainingLoan * annualRate) / 1200;
              extraInterest = blendedInterest - normalInterest;
            } else if (deltaDay > 0) {
              // 商贷: 按天息差
              extraInterest =
                (((remainingLoan *
                  (remaining.annualInterestRate - annualRate)) /
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
                newTerm = calcTermByFixedPrincipal(
                  remainingLoan,
                  fixedPrincipal,
                );
              }

              if (newTerm != null && newTerm > 0) {
                const termDiff = remainingTerm - newTerm;
                remainingTerm = newTerm;
                comment += `，期数缩短 ${termDiff} 期`;
              }
            }
          } else if (
            changeParams.type === ChangeType.PaymentChange &&
            changeParams.newMonthlyPayment != null
          ) {
            comment = `月供调整为 ${changeParams.newMonthlyPayment.toFixed(2)} 元`;
          } else if (
            changeParams.type === ChangeType.RepaymentDayChange &&
            changeParams.newRepaymentDay != null
          ) {
            comment = `还款日由每月 ${state.params.repaymentDay} 日变更为 ${changeParams.newRepaymentDay} 日`;
            // extraInterest 保持 0，首期利息在 calculateLoan 后按实际天数直接替换
          }

          const monthlyRate = annualToMonthlyRate(annualRate);
          let newStartDate = new Date(remaining.lastRegularPaymentDate);

          // 自由还款调整月供时，传入新的月供额
          const newMonthlyPaymentAmount =
            changeParams.type === ChangeType.PaymentChange &&
            changeParams.newMonthlyPayment != null
              ? changeParams.newMonthlyPayment
              : state.params.monthlyPaymentAmount;

          // 还款日变更时使用新还款日
          const effectiveRepaymentDay =
            changeParams.type === ChangeType.RepaymentDayChange &&
            changeParams.newRepaymentDay != null
              ? changeParams.newRepaymentDay
              : state.params.repaymentDay;

          // 还款日变更：确保首期还款日在生效日之后
          if (
            changeParams.type === ChangeType.RepaymentDayChange &&
            changeParams.newRepaymentDay != null
          ) {
            const firstDate = addMonths(
              newStartDate,
              1,
              changeParams.newRepaymentDay,
            );
            if (firstDate <= changeParams.date) {
              newStartDate = addMonths(newStartDate, 1, newStartDate.getDate());
            }
          }

          const result = calculateLoan(
            remainingLoan,
            remainingTerm,
            monthlyRate,
            annualRate,
            newStartDate,
            method,
            effectiveRepaymentDay,
            method === LoanMethod.FreeRepayment
              ? newMonthlyPaymentAmount
              : undefined,
          );

          for (const item of result.schedule) {
            item.period += remaining.lastRegularPeriod;
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

          // 还款日变更：首期按实际天数计息（直接替换，不用差值修补）
          if (
            changeParams.type === ChangeType.RepaymentDayChange &&
            changeParams.newRepaymentDay != null &&
            result.schedule.length > 0
          ) {
            const lastRegDate = new Date(remaining.lastRegularPaymentDate);
            const firstNewDate = addMonths(
              newStartDate,
              1,
              changeParams.newRepaymentDay,
            );
            const actualDays = isGjj
              ? calc30360Days(lastRegDate, firstNewDate)
              : Math.round(
                  (firstNewDate.getTime() - lastRegDate.getTime()) / MS_PER_DAY,
                );

            if (actualDays !== 30) {
              const actualInterest = roundTo2(
                (remainingLoan * annualRate * actualDays) / 36000,
              );
              const s0 = result.schedule[0];

              if (method === LoanMethod.FreeRepayment) {
                // 自由还款：月供不变，按实际天数重算利息/本金，级联更新后续期
                s0.interest = actualInterest;
                s0.principal = roundTo2(s0.monthlyPayment - actualInterest);
                s0.remainingLoan = roundTo2(remainingLoan - s0.principal);

                const fixedPmt = s0.monthlyPayment;
                for (let i = 1; i < result.schedule.length; i++) {
                  const prevRem = result.schedule[i - 1].remainingLoan;
                  const int = roundTo2(prevRem * monthlyRate);
                  if (
                    i === result.schedule.length - 1 ||
                    prevRem + int <= fixedPmt
                  ) {
                    const pri = roundTo2(prevRem);
                    result.schedule[i].interest = int;
                    result.schedule[i].principal = pri;
                    result.schedule[i].monthlyPayment = roundTo2(pri + int);
                    result.schedule[i].remainingLoan = 0;
                    result.schedule.length = i + 1;
                    break;
                  }
                  result.schedule[i].interest = int;
                  result.schedule[i].principal = roundTo2(fixedPmt - int);
                  result.schedule[i].remainingLoan = roundTo2(
                    prevRem - result.schedule[i].principal,
                  );
                }
              } else {
                // 等额本息/等额本金：本金不变，按实际利息调整月供
                s0.interest = actualInterest;
                s0.monthlyPayment = roundTo2(s0.principal + actualInterest);
              }

              comment += `，首期按 ${actualDays} 天计息 ${actualInterest.toFixed(2)} 元`;
            }
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
            newSchedule =
              remainingLoan <= 0
                ? oldSchedule.concat([prepayItem])
                : oldSchedule.concat([prepayItem], result.schedule);
          } else {
            if (extraInterest !== 0 && result.schedule.length > 0) {
              if (method === LoanMethod.FreeRepayment) {
                // 自由还款: 月供不变，调整利息/本金拆分并级联更新后续期
                const s0 = result.schedule[0];
                s0.interest = roundTo2(s0.interest + extraInterest);
                s0.principal = roundTo2(s0.principal - extraInterest);
                s0.remainingLoan = roundTo2(s0.remainingLoan + extraInterest);

                const fixedPmt = s0.monthlyPayment;
                for (let i = 1; i < result.schedule.length; i++) {
                  const prevRem = result.schedule[i - 1].remainingLoan;
                  const int = roundTo2(prevRem * monthlyRate);
                  if (
                    i === result.schedule.length - 1 ||
                    prevRem + int <= fixedPmt
                  ) {
                    const pri = roundTo2(prevRem);
                    result.schedule[i].interest = int;
                    result.schedule[i].principal = pri;
                    result.schedule[i].monthlyPayment = roundTo2(pri + int);
                    result.schedule[i].remainingLoan = 0;
                    result.schedule.length = i + 1;
                    break;
                  }
                  result.schedule[i].interest = int;
                  result.schedule[i].principal = roundTo2(fixedPmt - int);
                  result.schedule[i].remainingLoan = roundTo2(
                    prevRem - result.schedule[i].principal,
                  );
                }
              } else {
                result.schedule[0].monthlyPayment += extraInterest;
                result.schedule[0].interest += extraInterest;
              }
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
            changeParams,
          };

          const newHistory = [...state.history, snapshot];

          // 利率变更时自动同步到自定义利率表
          let newRateTable = state.rateTable;
          if (
            changeParams.type === ChangeType.RateChange &&
            changeParams.newAnnualRate != null
          ) {
            const dateStr = formatDate(changeParams.date);
            const filtered = state.rateTable.filter((e) => e.date !== dateStr);
            newRateTable = [
              ...filtered,
              {
                date: dateStr,
                annualRate: changeParams.newAnnualRate,
                source: 'custom',
              },
            ].sort((a, b) => a.date.localeCompare(b.date));
          }

          // 还款日变更时更新 params
          const newParams =
            changeParams.type === ChangeType.RepaymentDayChange &&
            changeParams.newRepaymentDay != null &&
            state.params
              ? { ...state.params, repaymentDay: changeParams.newRepaymentDay }
              : state.params;

          set({
            params: newParams,
            schedule: newSchedule,
            changes: [...state.changes, newChange],
            rateTable: newRateTable,
            history: newHistory,
            summary: calcScheduleSummary(newSchedule),
            canUndo: true,
          });

          markLoanDirty();
        },

        undo: () => {
          const state = get();
          const prev = state.history[state.history.length - 1];
          if (!prev) return;

          const newHistory = state.history.slice(0, -1);
          set({
            params: prev.params ?? state.params,
            schedule: prev.schedule,
            changes: prev.changeList,
            history: newHistory,
            summary: calcScheduleSummary(prev.schedule),
            canUndo: newHistory.length > 0,
          });

          markLoanDirty();
        },

        clear: () => {
          set({
            params: null,
            schedule: [],
            changes: [],
            rateTable: [],
            history: [],
            loanDirty: false,
            summary: null,
            canUndo: false,
          });
        },

        updateRateTable: (entries: RateEntry[]) => {
          set({ rateTable: entries });
          markRateTableDirty();
        },

        saveLoan: (name: string) => {
          const state = get();
          const now = new Date().toISOString();
          const existing = state.activeLoanId
            ? state.savedLoans.find((l) => l.id === state.activeLoanId)
            : null;

          if (existing) {
            // 更新已有方案
            const updated = state.savedLoans.map((l) =>
              l.id === existing.id
                ? {
                    ...l,
                    name,
                    updatedAt: now,
                    params: state.params,
                    schedule: state.schedule,
                    changes: state.changes,
                    rateTable: state.rateTable,
                    history: state.history,
                  }
                : l,
            );
            set({ savedLoans: updated, loanDirty: false });
            return existing.id;
          }

          // 新建方案
          const id = `loan-${Date.now()}`;
          const newLoan: SavedLoan = {
            id,
            name,
            createdAt: now,
            updatedAt: now,
            params: state.params,
            schedule: state.schedule,
            changes: state.changes,
            rateTable: state.rateTable,
            history: state.history,
          };
          set({
            savedLoans: [...state.savedLoans, newLoan],
            activeLoanId: id,
            loanDirty: false,
          });
          return id;
        },

        loadLoan: (id: string) => {
          const state = get();
          const target = state.savedLoans.find((l) => l.id === id);
          if (!target) return;

          set({
            activeLoanId: id,
            params: target.params,
            schedule: target.schedule,
            changes: target.changes,
            rateTable: target.rateTable,
            history: target.history,
            loanDirty: false,
            summary:
              target.schedule.length > 0
                ? calcScheduleSummary(target.schedule)
                : null,
            canUndo: target.history.length > 0,
          });
        },

        deleteLoan: (id: string) => {
          const state = get();
          const filtered = state.savedLoans.filter((l) => l.id !== id);
          const updates: Partial<LoanState> = { savedLoans: filtered };
          if (state.activeLoanId === id) {
            updates.activeLoanId = null;
          }
          set(updates as LoanState);
        },

        renameLoan: (id: string, name: string) => {
          const state = get();
          const updated = state.savedLoans.map((l) =>
            l.id === id
              ? { ...l, name, updatedAt: new Date().toISOString() }
              : l,
          );
          set({ savedLoans: updated });
        },

        saveRateTable: (
          name: string,
          source: 'custom' | 'lpr' | 'gjj',
          basisPoints?: number,
          gjjAbove5Y?: boolean,
        ) => {
          const state = get();
          const now = new Date().toISOString();
          const existing = state.activeRateTableId
            ? state.savedRateTables.find(
                (t) => t.id === state.activeRateTableId,
              )
            : null;

          if (existing) {
            const updated = state.savedRateTables.map((t) =>
              t.id === existing.id
                ? {
                    ...t,
                    name,
                    updatedAt: now,
                    entries: state.rateTable,
                    source,
                    basisPoints,
                    gjjAbove5Y,
                  }
                : t,
            );
            set({ savedRateTables: updated, rateTableDirty: false });
            return existing.id;
          }

          const id = `rate-${Date.now()}`;
          const newTable: SavedRateTable = {
            id,
            name,
            createdAt: now,
            updatedAt: now,
            entries: state.rateTable,
            source,
            basisPoints,
            gjjAbove5Y,
          };
          set({
            savedRateTables: [...state.savedRateTables, newTable],
            activeRateTableId: id,
            rateTableDirty: false,
          });
          return id;
        },

        loadRateTable: (id: string) => {
          const state = get();
          const target = state.savedRateTables.find((t) => t.id === id);
          if (!target) return;

          set({
            activeRateTableId: id,
            rateTable: target.entries,
            rateTableDirty: false,
          });
        },

        deleteRateTable: (id: string) => {
          const state = get();
          const filtered = state.savedRateTables.filter((t) => t.id !== id);
          const updates: Partial<LoanState> = { savedRateTables: filtered };
          if (state.activeRateTableId === id) {
            updates.activeRateTableId = null;
          }
          set(updates as LoanState);
        },

        renameRateTable: (id: string, name: string) => {
          const state = get();
          const updated = state.savedRateTables.map((t) =>
            t.id === id
              ? { ...t, name, updatedAt: new Date().toISOString() }
              : t,
          );
          set({ savedRateTables: updated });
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          // fallback for environments without localStorage
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
      }),
      partialize: (state) => ({
        params: state.params,
        schedule: state.schedule,
        changes: state.changes,
        rateTable: state.rateTable,
        history: state.history,
        savedLoans: state.savedLoans,
        activeLoanId: state.activeLoanId,
        savedRateTables: state.savedRateTables,
        activeRateTableId: state.activeRateTableId,
        autoSave: state.autoSave,
        autoUpdate: state.autoUpdate,
        loanDirty: state.loanDirty,
        rateTableDirty: state.rateTableDirty,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Date 对象在 JSON 序列化后变成字符串，恢复时重建
        if (state.params?.startDate) {
          state.params.startDate = new Date(state.params.startDate);
          state.params.repaymentDay ??= DEFAULT_REPAYMENT_DAY;
          state.params.loanType ??= LoanType.Commercial;
        }
        for (const c of state.changes) {
          if (c.date && !(c.date instanceof Date)) {
            c.date = new Date(c.date);
          }
        }
        // savedLoans 中的 Date 也需要恢复
        for (const loan of state.savedLoans) {
          if (loan.params?.startDate) {
            loan.params.startDate = new Date(loan.params.startDate);
            loan.params.repaymentDay ??= DEFAULT_REPAYMENT_DAY;
            loan.params.loanType ??= LoanType.Commercial;
          }
          for (const c of loan.changes) {
            if (c.date && !(c.date instanceof Date)) {
              c.date = new Date(c.date);
            }
          }
        }
        if (state.schedule.length > 0) {
          state.summary = calcScheduleSummary(state.schedule);
          state.canUndo = (state.history?.length ?? 0) > 0;
        }
      },
    },
  ),
);
