import {
  ChangeType,
  type LoanChangeParams,
  type LoanMethod,
} from '../types/loan.types';
import { Validator } from '../utils/validator';
import { BaseComponent } from './BaseComponent';

export interface LoanFormData {
  loanAmount: number;
  loanTermYears: number;
  annualInterestRate: number;
  loanMethod: LoanMethod;
  startDate: Date;
}

export class LoanForm extends BaseComponent {
  private onSubmit: ((data: LoanFormData) => void) | null = null;
  private onRateChange: ((params: LoanChangeParams) => void) | null = null;
  private onPrepay: ((params: LoanChangeParams) => void) | null = null;

  constructor() {
    super('.container');
    this.bindEvents();
  }

  setOnSubmit(handler: (data: LoanFormData) => void): void {
    this.onSubmit = handler;
  }

  setOnRateChange(handler: (params: LoanChangeParams) => void): void {
    this.onRateChange = handler;
  }

  setOnPrepay(handler: (params: LoanChangeParams) => void): void {
    this.onPrepay = handler;
  }

  private getInput(id: string): HTMLInputElement {
    return document.getElementById(id) as HTMLInputElement;
  }

  private getSelect(id: string): HTMLSelectElement {
    return document.getElementById(id) as HTMLSelectElement;
  }

  private bindEvents(): void {
    // 贷款表单提交
    const form = document.getElementById('loan-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // 利率变更
    const rateBtn = document.getElementById('update-interest-rate');
    if (rateBtn) {
      rateBtn.addEventListener('click', () => this.handleRateChange());
    }

    // 提前还款
    const prepayBtn = document.getElementById('prepay-loan');
    if (prepayBtn) {
      prepayBtn.addEventListener('click', () => this.handlePrepay());
    }
  }

  private handleSubmit(): void {
    const loanAmount = parseFloat(this.getInput('loan-amount').value);
    const loanTermYears = parseInt(this.getInput('loan-term').value, 10);
    const annualInterestRate = parseFloat(this.getInput('interest-rate').value);
    const loanMethod = this.getSelect('loan-method').value as LoanMethod;
    const startDate = new Date(this.getInput('loan-start-date').value);

    // 验证
    const checks = [
      Validator.loanAmount(loanAmount),
      Validator.loanTermYears(loanTermYears),
      Validator.annualInterestRate(annualInterestRate),
      Validator.date(this.getInput('loan-start-date').value),
    ];

    for (const check of checks) {
      if (!check.valid) {
        alert(check.message);
        return;
      }
    }

    this.onSubmit?.({
      loanAmount,
      loanTermYears,
      annualInterestRate,
      loanMethod,
      startDate,
    });
  }

  private handleRateChange(): void {
    const annualRate = parseFloat(this.getInput('new-interest-rate').value);
    const dateStr = this.getInput('interest-change-date').value;
    const loanMethod = this.getSelect('loan-method').value as LoanMethod;

    const rateCheck = Validator.annualInterestRate(annualRate);
    if (!rateCheck.valid) {
      alert(rateCheck.message);
      return;
    }
    const dateCheck = Validator.date(dateStr);
    if (!dateCheck.valid) {
      alert(dateCheck.message);
      return;
    }

    this.onRateChange?.({
      type: ChangeType.RateChange,
      date: new Date(dateStr),
      loanMethod,
      newAnnualRate: annualRate,
    });
  }

  private handlePrepay(): void {
    const prepayAmount = parseFloat(this.getInput('prepay-amount').value);
    const dateStr = this.getInput('prepay-date').value;
    const loanMethod = this.getSelect('loan-method').value as LoanMethod;

    const dateCheck = Validator.date(dateStr);
    if (!dateCheck.valid) {
      alert(dateCheck.message);
      return;
    }

    // prepayAmount 的完整验证需要知道剩余本金，在 main.ts 层处理
    if (Number.isNaN(prepayAmount) || prepayAmount <= 0) {
      alert('提前还款金额必须大于 0');
      return;
    }

    this.onPrepay?.({
      type: ChangeType.Prepayment,
      date: new Date(dateStr),
      loanMethod,
      prepayAmount,
    });
  }
}
