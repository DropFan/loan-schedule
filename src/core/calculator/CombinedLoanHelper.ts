import type {
  LoanChangeRecord,
  LoanScheduleSummary,
  PaymentScheduleItem,
} from '@/core/types/loan.types';
import { calcScheduleSummary } from './LoanCalculator';

export interface CombinedScheduleItem {
  period: number;
  paymentDateA: string;
  paymentDateB: string;
  monthlyPayment: number;
  principal: number;
  interest: number;
  remainingLoan: number;
  detailA: PaymentScheduleItem;
  detailB: PaymentScheduleItem;
}

export interface CombinedSummary {
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  termMonths: number;
  summaryA: LoanScheduleSummary;
  summaryB: LoanScheduleSummary;
}

function emptyItem(period: number, date: string): PaymentScheduleItem {
  return {
    period,
    paymentDate: date,
    monthlyPayment: 0,
    principal: 0,
    interest: 0,
    remainingLoan: 0,
    remainingTerm: 0,
    annualInterestRate: 0,
    loanMethod: '',
    comment: '',
  };
}

/**
 * 按 period 对齐合并两个还款计划。
 * - 常规行（period > 0）按 period 对齐，期数不等时短方案补零
 * - period=0 行（提前还款）按日期匹配：同日合并，不同日各自独立
 */
export function mergeCombinedSchedule(
  scheduleA: PaymentScheduleItem[],
  scheduleB: PaymentScheduleItem[],
): CombinedScheduleItem[] {
  // 分离 period=0 行和常规行
  const regularA = scheduleA.filter((s) => s.period > 0);
  const regularB = scheduleB.filter((s) => s.period > 0);
  const zeroA = scheduleA.filter((s) => s.period === 0);
  const zeroB = scheduleB.filter((s) => s.period === 0);

  // 常规行按 period 对齐
  const maxPeriod = Math.max(
    regularA.length > 0 ? regularA[regularA.length - 1].period : 0,
    regularB.length > 0 ? regularB[regularB.length - 1].period : 0,
  );

  const mapA = new Map<number, PaymentScheduleItem>();
  for (const item of regularA) mapA.set(item.period, item);
  const mapB = new Map<number, PaymentScheduleItem>();
  for (const item of regularB) mapB.set(item.period, item);

  const result: CombinedScheduleItem[] = [];

  // 收集每个 period 前面的 period=0 行
  // 构建 period=0 按日期索引
  const zeroByDateA = new Map<string, PaymentScheduleItem[]>();
  for (const item of zeroA) {
    const list = zeroByDateA.get(item.paymentDate) ?? [];
    list.push(item);
    zeroByDateA.set(item.paymentDate, list);
  }
  const zeroByDateB = new Map<string, PaymentScheduleItem[]>();
  for (const item of zeroB) {
    const list = zeroByDateB.get(item.paymentDate) ?? [];
    list.push(item);
    zeroByDateB.set(item.paymentDate, list);
  }

  // 合并 period=0 行：同日期合并，不同日期独立
  const allZeroDates = new Set([...zeroByDateA.keys(), ...zeroByDateB.keys()]);
  const mergedZeros: CombinedScheduleItem[] = [];

  for (const date of allZeroDates) {
    const itemsA = zeroByDateA.get(date) ?? [];
    const itemsB = zeroByDateB.get(date) ?? [];
    const count = Math.max(itemsA.length, itemsB.length);

    for (let i = 0; i < count; i++) {
      const a = itemsA[i] ?? emptyItem(0, date);
      const b = itemsB[i] ?? emptyItem(0, date);
      mergedZeros.push({
        period: 0,
        paymentDateA: a.paymentDate,
        paymentDateB: b.paymentDate,
        monthlyPayment: a.monthlyPayment + b.monthlyPayment,
        principal: a.principal + b.principal,
        interest: a.interest + b.interest,
        remainingLoan: a.remainingLoan + b.remainingLoan,
        detailA: a,
        detailB: b,
      });
    }
  }

  // 按日期排序 period=0 行
  mergedZeros.sort((a, b) => a.paymentDateA.localeCompare(b.paymentDateA));

  // 构建最终结果：插入 period=0 行到对应常规行之后
  // 策略：先放所有在第一个常规行日期之前的 period=0 行，
  // 然后每个常规行后面放日期 <= 当前行但 > 上一行的 period=0 行
  let zeroIdx = 0;

  for (let p = 1; p <= maxPeriod; p++) {
    const a = mapA.get(p) ?? emptyItem(p, '');
    const b = mapB.get(p) ?? emptyItem(p, '');

    // 插入当前期之前的 period=0 行（日期 <= 当前期的还款日期）
    const currentDate = a.paymentDate || b.paymentDate;
    while (
      zeroIdx < mergedZeros.length &&
      (mergedZeros[zeroIdx].paymentDateA ||
        mergedZeros[zeroIdx].paymentDateB) <= currentDate
    ) {
      result.push(mergedZeros[zeroIdx]);
      zeroIdx++;
    }

    result.push({
      period: p,
      paymentDateA: a.paymentDate,
      paymentDateB: b.paymentDate,
      monthlyPayment: a.monthlyPayment + b.monthlyPayment,
      principal: a.principal + b.principal,
      interest: a.interest + b.interest,
      remainingLoan: a.remainingLoan + b.remainingLoan,
      detailA: a,
      detailB: b,
    });
  }

  // 追加剩余的 period=0 行
  while (zeroIdx < mergedZeros.length) {
    result.push(mergedZeros[zeroIdx]);
    zeroIdx++;
  }

  return result;
}

/**
 * 将合并计划转为标准 PaymentScheduleItem[]，供图表等组件复用
 */
export function combinedToSchedule(
  combined: CombinedScheduleItem[],
): PaymentScheduleItem[] {
  return combined.map((item) => ({
    period: item.period,
    paymentDate: item.paymentDateA || item.paymentDateB,
    monthlyPayment: item.monthlyPayment,
    principal: item.principal,
    interest: item.interest,
    remainingLoan: item.remainingLoan,
    remainingTerm: Math.max(
      item.detailA.remainingTerm,
      item.detailB.remainingTerm,
    ),
    annualInterestRate: 0,
    loanMethod: '',
    comment: '',
  }));
}

/**
 * 计算两个还款计划的组合汇总
 */
export function calcCombinedSummary(
  scheduleA: PaymentScheduleItem[],
  scheduleB: PaymentScheduleItem[],
): CombinedSummary {
  const summaryA = calcScheduleSummary(scheduleA);
  const summaryB = calcScheduleSummary(scheduleB);

  return {
    totalPayment: summaryA.totalPayment + summaryB.totalPayment,
    totalInterest: summaryA.totalInterest + summaryB.totalInterest,
    totalPrincipal: summaryA.totalPrincipal + summaryB.totalPrincipal,
    termMonths: Math.max(summaryA.termMonths, summaryB.termMonths),
    summaryA,
    summaryB,
  };
}

/** 子方案的历史数据（不依赖 store 类型） */
export interface LoanHistoryData {
  name: string;
  schedule: PaymentScheduleItem[];
  changes: LoanChangeRecord[];
  history: Array<{ schedule: PaymentScheduleItem[] }>;
}

/** buildCombinedHistory 的返回值，可直接传给 ComparisonChart / InterestSavingsChart */
export interface CombinedHistoryResult {
  schedule: PaymentScheduleItem[];
  changes: LoanChangeRecord[];
  history: Array<{
    schedule: PaymentScheduleItem[];
    changeList: LoanChangeRecord[];
  }>;
}

/**
 * 构造组合历史快照。
 * 按时间顺序合并两个子方案的变更事件，在每个事件点计算合并后的 before schedule。
 * 返回值的 schedule/changes/history 格式与图表组件的 props 一致。
 */
export function buildCombinedHistory(
  a: LoanHistoryData,
  b: LoanHistoryData,
): CombinedHistoryResult {
  // 每个子方案的状态序列：[初始, 变更1后, 变更2后, ..., 当前]
  const statesA = [...a.history.map((h) => h.schedule), a.schedule];
  const statesB = [...b.history.map((h) => h.schedule), b.schedule];

  // 收集所有变更事件（跳过 changes[0] 初始记录），按时间排序
  interface Event {
    source: 'A' | 'B';
    stateIdx: number; // 变更前在 states 中的索引
    change: LoanChangeRecord;
  }
  const events: Event[] = [];
  for (let i = 1; i < a.changes.length && i <= a.history.length; i++) {
    events.push({ source: 'A', stateIdx: i - 1, change: a.changes[i] });
  }
  for (let i = 1; i < b.changes.length && i <= b.history.length; i++) {
    events.push({ source: 'B', stateIdx: i - 1, change: b.changes[i] });
  }
  events.sort((x, y) => {
    const dx =
      x.change.date instanceof Date
        ? x.change.date.getTime()
        : new Date(x.change.date).getTime();
    const dy =
      y.change.date instanceof Date
        ? y.change.date.getTime()
        : new Date(y.change.date).getTime();
    return dx - dy;
  });

  // 逐事件构造合并快照
  let idxA = 0;
  let idxB = 0;
  const combinedHistory: CombinedHistoryResult['history'] = [];
  const combinedChanges: LoanChangeRecord[] = [];

  // 加一条占位初始记录（与单方案格式对齐：changes[0] 是初始，图表从 changes[1] 开始）
  if (a.changes.length > 0) {
    combinedChanges.push(a.changes[0]);
  }

  for (const event of events) {
    // 变更前的合并 schedule
    const beforeSchedule = combinedToSchedule(
      mergeCombinedSchedule(statesA[idxA], statesB[idxB]),
    );
    combinedHistory.push({ schedule: beforeSchedule, changeList: [] });

    // 推进对应子方案的状态
    if (event.source === 'A') idxA++;
    else idxB++;

    // 变更记录加来源标注
    combinedChanges.push({
      ...event.change,
      comment: `[${event.source === 'A' ? a.name : b.name}] ${event.change.comment}`,
    });
  }

  // 当前合并 schedule（所有变更之后）
  const currentSchedule = combinedToSchedule(
    mergeCombinedSchedule(statesA[idxA], statesB[idxB]),
  );

  return {
    schedule: currentSchedule,
    changes: combinedChanges,
    history: combinedHistory,
  };
}
