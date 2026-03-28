import {
  annualToMonthlyRate,
  calculateLoan,
  findRemainingInfo,
} from '../services/LoanCalculator';
import {
  ChangeType,
  type LoanChangeParams,
  type LoanChangeRecord,
  type LoanEventCallback,
  type LoanEventType,
  LoanMethodName,
  type LoanParameters,
  type PaymentScheduleItem,
} from '../types/loan.types';
import { formatDate } from '../utils/formatHelper';

interface Snapshot {
  schedule: PaymentScheduleItem[];
  changeList: LoanChangeRecord[];
}

export class LoanSchedule {
  private _schedule: PaymentScheduleItem[] = [];
  private _changeList: LoanChangeRecord[] = [];
  private _params: LoanParameters | null = null;
  private _listeners: Map<LoanEventType, LoanEventCallback[]> = new Map();
  private _history: Snapshot[] = [];

  get schedule(): ReadonlyArray<PaymentScheduleItem> {
    return this._schedule;
  }

  get changeList(): ReadonlyArray<LoanChangeRecord> {
    return this._changeList;
  }

  get params(): LoanParameters | null {
    return this._params;
  }

  get canUndo(): boolean {
    return this._history.length > 0;
  }

  on(event: LoanEventType, callback: LoanEventCallback): void {
    const list = this._listeners.get(event) ?? [];
    list.push(callback);
    this._listeners.set(event, list);
  }

  private emit(event: LoanEventType): void {
    const list = this._listeners.get(event) ?? [];
    for (const cb of list) cb();
  }

  /** 初始化贷款计划 */
  initialize(params: LoanParameters): void {
    this._params = params;
    const monthlyRate = annualToMonthlyRate(params.annualInterestRate);
    const result = calculateLoan(
      params.loanAmount,
      params.loanTermMonths,
      monthlyRate,
      params.startDate,
      params.loanMethod,
    );

    // 首期按天计息：放款日和还款日不一致时，首期产生额外利息
    const startDay = params.startDate.getDate();
    const repaymentDay = 15;
    let firstPeriodComment = '';

    if (startDay !== repaymentDay && result.schedule.length > 0) {
      const dailyRate = monthlyRate / 30;
      let extraDays: number;

      if (startDay < repaymentDay) {
        // 放款日在还款日之前（如11号放款，15号还款）
        extraDays = repaymentDay - startDay + 1;
      } else {
        // 放款日在还款日之后，需跨月计算
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

    this._schedule = result.schedule;
    this._changeList = [];
    this._history = [];
    this._changeList.push({
      date: params.startDate,
      loanAmount: params.loanAmount,
      remainingTerm: params.loanTermMonths,
      monthlyPayment: result.monthlyPayment,
      annualInterestRate: params.annualInterestRate,
      loanMethod: params.loanMethod,
      comment: firstPeriodComment
        ? `初始贷款，${firstPeriodComment}`
        : '初始贷款',
    });

    this.emit('initialized');
  }

  /** 统一处理利率变更和提前还款 */
  applyChange(changeParams: LoanChangeParams): void {
    if (!this._params || this._schedule.length === 0) return;

    // 保存快照用于撤销
    this._history.push({
      schedule: this._schedule.map((item) => ({ ...item })),
      changeList: [...this._changeList],
    });

    const remaining = findRemainingInfo(this._schedule, changeParams.date);
    if (!remaining) {
      this._history.pop();
      return;
    }

    let remainingLoan = remaining.remainingLoan;
    let annualRate = remaining.annualInterestRate;
    const remainingTerm = remaining.remainingTerm;
    const method = changeParams.loanMethod;
    let comment = '';

    // 按天计算额外利息（基于最后一期常规还款日，而非提前还款行日期）
    const lastRegularDate = new Date(remaining.lastRegularPaymentDate);
    const deltaDay =
      (changeParams.date.getTime() - lastRegularDate.getTime()) / 86400000;
    let extraInterest = 0;

    if (
      changeParams.type === ChangeType.RateChange &&
      changeParams.newAnnualRate != null
    ) {
      // 利率变更：更新利率，本金不变
      annualRate = changeParams.newAnnualRate;
      comment = `利率变更为 ${annualRate.toFixed(2)}%`;

      // 变更日前按旧利率计息，与新利率的差值按天折算
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
      // 提前还款：本金减少，利率不变
      const prepayAmount = changeParams.prepayAmount;
      remainingLoan = remaining.remainingLoan - prepayAmount;
      comment = `提前还款 ${prepayAmount} 元`;

      // 提前还的本金在还款日前仍按原利率计息
      if (deltaDay > 0) {
        extraInterest =
          (((prepayAmount * remaining.annualInterestRate) / 100 / 12) *
            deltaDay) /
          30;
      }
    }

    // 以最后一期常规还款日为起点，addMonths(startDate, 1, 15) 自然落在下一个还款日
    const monthlyRate = annualToMonthlyRate(annualRate);
    const newStartDate = new Date(remaining.lastRegularPaymentDate);

    const result = calculateLoan(
      remainingLoan,
      remainingTerm,
      monthlyRate,
      newStartDate,
      method,
    );

    // 调整期数偏移
    for (const item of result.schedule) {
      item.period += remaining.paidPeriods;
    }

    // 计算月供变化（用常规月供对比，不含额外利息）
    const oldMonthlyPayment = this.getLastMonthlyPayment();
    if (oldMonthlyPayment > 0) {
      const diff = parseFloat(
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

    // 拼接计划
    const dateStr = formatDate(changeParams.date);
    const oldSchedule = this._schedule.slice(0, remaining.paidPeriods);

    if (
      changeParams.type === ChangeType.Prepayment &&
      changeParams.prepayAmount != null
    ) {
      // 提前还款：插入独立的提前还款记录行，按时间顺序展示
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

      this._schedule = oldSchedule.concat([prepayItem], result.schedule);
    } else {
      // 利率变更：额外利息加到新计划第一期
      if (extraInterest !== 0 && result.schedule.length > 0) {
        result.schedule[0].monthlyPayment += extraInterest;
        result.schedule[0].interest += extraInterest;
      }
      if (result.schedule.length > 0) {
        result.schedule[0].comment = ` ${dateStr}${comment}`;
      }

      this._schedule = oldSchedule.concat(result.schedule);
    }

    // 记录变更
    this._changeList.push({
      date: changeParams.date,
      loanAmount: remainingLoan,
      remainingTerm,
      monthlyPayment: result.monthlyPayment,
      annualInterestRate: annualRate,
      loanMethod: method,
      comment,
    });

    this.emit('changed');
  }

  /** 撤销上一步变更操作 */
  undo(): boolean {
    const prev = this._history.pop();
    if (!prev) return false;
    this._schedule = prev.schedule;
    this._changeList = prev.changeList;
    this.emit('changed');
    return true;
  }

  clear(): void {
    this._schedule = [];
    this._changeList = [];
    this._params = null;
    this._history = [];
    this.emit('cleared');
  }

  private getLastMonthlyPayment(): number {
    if (this._changeList.length === 0) return 0;
    return this._changeList[this._changeList.length - 1].monthlyPayment;
  }
}
