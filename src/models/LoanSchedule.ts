import {
  PaymentScheduleItem,
  LoanParameters,
  LoanChangeRecord,
  LoanChangeParams,
  ChangeType,
  LoanEventType,
  LoanEventCallback,
} from '../types/loan.types';
import {
  calculateLoan,
  findRemainingInfo,
  annualToMonthlyRate,
} from '../services/LoanCalculator';
import { roundTo2 } from '../utils/formatHelper';

export class LoanSchedule {
  private _schedule: PaymentScheduleItem[] = [];
  private _changeList: LoanChangeRecord[] = [];
  private _params: LoanParameters | null = null;
  private _listeners: Map<LoanEventType, LoanEventCallback[]> = new Map();

  get schedule(): ReadonlyArray<PaymentScheduleItem> {
    return this._schedule;
  }

  get changeList(): ReadonlyArray<LoanChangeRecord> {
    return this._changeList;
  }

  get params(): LoanParameters | null {
    return this._params;
  }

  on(event: LoanEventType, callback: LoanEventCallback): void {
    const list = this._listeners.get(event) ?? [];
    list.push(callback);
    this._listeners.set(event, list);
  }

  private emit(event: LoanEventType): void {
    const list = this._listeners.get(event) ?? [];
    list.forEach((cb) => cb());
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

    this._schedule = result.schedule;
    this._changeList = [];
    this._changeList.push({
      date: params.startDate,
      loanAmount: params.loanAmount,
      remainingTerm: params.loanTermMonths,
      monthlyPayment: result.monthlyPayment,
      annualInterestRate: params.annualInterestRate,
      loanMethod: params.loanMethod,
      comment: '初始贷款',
    });

    this.emit('initialized');
  }

  /** 统一处理利率变更和提前还款 */
  applyChange(changeParams: LoanChangeParams): void {
    if (!this._params || this._schedule.length === 0) return;

    const remaining = findRemainingInfo(this._schedule, changeParams.date);
    if (!remaining) return;

    let remainingLoan = remaining.remainingLoan;
    let annualRate = remaining.annualInterestRate;
    const remainingTerm = remaining.remainingTerm;
    const method = changeParams.loanMethod;
    let comment = '';

    if (changeParams.type === ChangeType.RateChange && changeParams.newAnnualRate != null) {
      // 利率变更：更新利率，本金不变
      annualRate = changeParams.newAnnualRate;
      comment = `利率变更为 ${roundTo2(annualRate).toFixed(2)}%`;
    } else if (changeParams.type === ChangeType.Prepayment && changeParams.prepayAmount != null) {
      // 提前还款：本金减少，利率不变
      const prepayAmount = changeParams.prepayAmount;

      // 修改提前还款那期的数据
      if (remaining.paidPeriods > 0 && remaining.paidPeriods <= this._schedule.length) {
        const prevItem = this._schedule[remaining.paidPeriods - 1];
        prevItem.monthlyPayment = roundTo2(prevItem.monthlyPayment + prepayAmount);
        prevItem.principal = roundTo2(prevItem.principal + prepayAmount);
        prevItem.remainingLoan = roundTo2(prevItem.remainingLoan - prepayAmount);
        remainingLoan = prevItem.remainingLoan;
      } else {
        remainingLoan = roundTo2(remainingLoan - prepayAmount);
      }

      comment = `提前还款 ${prepayAmount} 元`;
    }

    // 计算新的还款计划
    const monthlyRate = annualToMonthlyRate(annualRate);
    const newStartDate = changeParams.type === ChangeType.RateChange
      ? new Date(changeParams.date.getFullYear(), changeParams.date.getMonth() - 1, 15)
      : new Date(changeParams.date.getFullYear(), changeParams.date.getMonth(), 15);

    const result = calculateLoan(remainingLoan, remainingTerm, monthlyRate, newStartDate, method);

    // 调整期数偏移
    const periodOffset = changeParams.type === ChangeType.RateChange
      ? remaining.paidPeriods - 1
      : remaining.paidPeriods;

    result.schedule.forEach((item) => {
      item.period += periodOffset;
    });

    // 计算月供变化
    const oldMonthlyPayment = this.getLastMonthlyPayment();
    if (oldMonthlyPayment > 0) {
      const diff = roundTo2(result.monthlyPayment - oldMonthlyPayment);
      if (diff > 0) {
        comment += `，月供增加 ${diff.toFixed(2)} 元`;
      } else if (diff < 0) {
        comment += `，月供减少 ${Math.abs(diff).toFixed(2)} 元`;
      } else {
        comment += '，月供不变';
      }
    }

    // 标记变更注释
    const dateStr = changeParams.date.toISOString().split('T')[0];
    result.schedule[0].comment = ` ${dateStr}${comment}`;

    // 拼接计划
    const sliceIndex = changeParams.type === ChangeType.RateChange
      ? remaining.paidPeriods - 1
      : remaining.paidPeriods;
    this._schedule = this._schedule.slice(0, sliceIndex).concat(result.schedule);

    // 记录变更
    const changeRemainingTerm = changeParams.type === ChangeType.RateChange
      ? remainingTerm - 1
      : remainingTerm;

    this._changeList.push({
      date: changeParams.date,
      loanAmount: remainingLoan,
      remainingTerm: changeRemainingTerm,
      monthlyPayment: result.monthlyPayment,
      annualInterestRate: annualRate,
      loanMethod: method,
      comment,
    });

    this.emit('changed');
  }

  clear(): void {
    this._schedule = [];
    this._changeList = [];
    this._params = null;
    this.emit('cleared');
  }

  private getLastMonthlyPayment(): number {
    if (this._changeList.length === 0) return 0;
    return this._changeList[this._changeList.length - 1].monthlyPayment;
  }
}
