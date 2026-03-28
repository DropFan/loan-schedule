import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangeType, LoanMethod } from '../../types/loan.types';
import type { LoanFormData } from '../LoanForm';
import { LoanForm } from '../LoanForm';

function setupDOM(): void {
  document.body.textContent = '';

  const container = document.createElement('div');
  container.className = 'container';

  // 贷款表单
  const form = document.createElement('form');
  form.id = 'loan-form';

  const loanAmount = document.createElement('input');
  loanAmount.id = 'loan-amount';
  loanAmount.type = 'text';
  form.appendChild(loanAmount);

  const loanTerm = document.createElement('input');
  loanTerm.id = 'loan-term';
  loanTerm.type = 'text';
  form.appendChild(loanTerm);

  const interestRate = document.createElement('input');
  interestRate.id = 'interest-rate';
  interestRate.type = 'text';
  form.appendChild(interestRate);

  const loanMethod = document.createElement('select');
  loanMethod.id = 'loan-method';
  const opt1 = document.createElement('option');
  opt1.value = LoanMethod.EqualPrincipalInterest;
  opt1.textContent = '等额本息';
  const opt2 = document.createElement('option');
  opt2.value = LoanMethod.EqualPrincipal;
  opt2.textContent = '等额本金';
  loanMethod.appendChild(opt1);
  loanMethod.appendChild(opt2);
  form.appendChild(loanMethod);

  const startDate = document.createElement('input');
  startDate.id = 'loan-start-date';
  startDate.type = 'date';
  form.appendChild(startDate);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = '计算';
  form.appendChild(submitBtn);

  container.appendChild(form);

  // 利率变更输入
  const newRate = document.createElement('input');
  newRate.id = 'new-interest-rate';
  newRate.type = 'text';
  container.appendChild(newRate);

  const changeDate = document.createElement('input');
  changeDate.id = 'interest-change-date';
  changeDate.type = 'date';
  container.appendChild(changeDate);

  const rateBtn = document.createElement('button');
  rateBtn.id = 'update-interest-rate';
  rateBtn.textContent = '变更利率';
  container.appendChild(rateBtn);

  // 提前还款输入
  const prepayAmountInput = document.createElement('input');
  prepayAmountInput.id = 'prepay-amount';
  prepayAmountInput.type = 'text';
  container.appendChild(prepayAmountInput);

  const prepayDate = document.createElement('input');
  prepayDate.id = 'prepay-date';
  prepayDate.type = 'date';
  container.appendChild(prepayDate);

  const prepayBtn = document.createElement('button');
  prepayBtn.id = 'prepay-loan';
  prepayBtn.textContent = '提前还款';
  container.appendChild(prepayBtn);

  document.body.appendChild(container);
}

function fillForm(values: {
  loanAmount?: string;
  loanTerm?: string;
  interestRate?: string;
  loanMethod?: string;
  startDate?: string;
}): void {
  if (values.loanAmount !== undefined)
    (document.getElementById('loan-amount') as HTMLInputElement).value =
      values.loanAmount;
  if (values.loanTerm !== undefined)
    (document.getElementById('loan-term') as HTMLInputElement).value =
      values.loanTerm;
  if (values.interestRate !== undefined)
    (document.getElementById('interest-rate') as HTMLInputElement).value =
      values.interestRate;
  if (values.loanMethod !== undefined)
    (document.getElementById('loan-method') as HTMLSelectElement).value =
      values.loanMethod;
  if (values.startDate !== undefined)
    (document.getElementById('loan-start-date') as HTMLInputElement).value =
      values.startDate;
}

describe('LoanForm', () => {
  let alertSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupDOM();
    alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
  });

  describe('constructor', () => {
    it('正常实例化', () => {
      const form = new LoanForm();
      expect(form).toBeDefined();
    });

    it('缺少 #loan-form 时不抛错', () => {
      document.getElementById('loan-form')?.remove();
      expect(() => new LoanForm()).not.toThrow();
    });

    it('缺少 #update-interest-rate 按钮时不抛错', () => {
      document.getElementById('update-interest-rate')?.remove();
      expect(() => new LoanForm()).not.toThrow();
    });

    it('缺少 #prepay-loan 按钮时不抛错', () => {
      document.getElementById('prepay-loan')?.remove();
      expect(() => new LoanForm()).not.toThrow();
    });
  });

  describe('handleSubmit', () => {
    it('所有验证通过时调用 onSubmit 回调', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnSubmit(handler);

      fillForm({
        loanAmount: '1000000',
        loanTerm: '30',
        interestRate: '3.65',
        loanMethod: LoanMethod.EqualPrincipalInterest,
        startDate: '2024-01-15',
      });

      const formEl = document.getElementById('loan-form')!;
      formEl.dispatchEvent(new Event('submit'));

      expect(handler).toHaveBeenCalledTimes(1);
      const data: LoanFormData = handler.mock.calls[0][0];
      expect(data.loanAmount).toBe(1000000);
      expect(data.loanTermYears).toBe(30);
      expect(data.annualInterestRate).toBe(3.65);
      expect(data.loanMethod).toBe(LoanMethod.EqualPrincipalInterest);
      expect(data.startDate).toBeInstanceOf(Date);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('贷款金额无效时弹出 alert 不调用 onSubmit', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnSubmit(handler);

      fillForm({
        loanAmount: '0',
        loanTerm: '30',
        interestRate: '3.65',
        startDate: '2024-01-15',
      });

      const formEl = document.getElementById('loan-form')!;
      formEl.dispatchEvent(new Event('submit'));

      expect(alertSpy).toHaveBeenCalledWith('贷款金额必须大于 0');
      expect(handler).not.toHaveBeenCalled();
    });

    it('贷款期限无效时弹出 alert', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnSubmit(handler);

      fillForm({
        loanAmount: '1000000',
        loanTerm: '0',
        interestRate: '3.65',
        startDate: '2024-01-15',
      });

      const formEl = document.getElementById('loan-form')!;
      formEl.dispatchEvent(new Event('submit'));

      expect(alertSpy).toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    it('利率无效时弹出 alert', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnSubmit(handler);

      fillForm({
        loanAmount: '1000000',
        loanTerm: '30',
        interestRate: '0',
        startDate: '2024-01-15',
      });

      const formEl = document.getElementById('loan-form')!;
      formEl.dispatchEvent(new Event('submit'));

      expect(alertSpy).toHaveBeenCalledWith('年利率必须大于 0');
      expect(handler).not.toHaveBeenCalled();
    });

    it('日期无效时弹出 alert', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnSubmit(handler);

      fillForm({
        loanAmount: '1000000',
        loanTerm: '30',
        interestRate: '3.65',
        startDate: '',
      });

      const formEl = document.getElementById('loan-form')!;
      formEl.dispatchEvent(new Event('submit'));

      expect(alertSpy).toHaveBeenCalledWith('请选择日期');
      expect(handler).not.toHaveBeenCalled();
    });

    it('未设置 onSubmit 回调时不抛错', () => {
      new LoanForm();

      fillForm({
        loanAmount: '1000000',
        loanTerm: '30',
        interestRate: '3.65',
        startDate: '2024-01-15',
      });

      const formEl = document.getElementById('loan-form')!;
      expect(() => formEl.dispatchEvent(new Event('submit'))).not.toThrow();
    });
  });

  describe('handleRateChange', () => {
    it('验证通过时调用 onRateChange 回调', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnRateChange(handler);

      (document.getElementById('new-interest-rate') as HTMLInputElement).value =
        '3.2';
      (
        document.getElementById('interest-change-date') as HTMLInputElement
      ).value = '2024-06-15';
      (document.getElementById('loan-method') as HTMLSelectElement).value =
        LoanMethod.EqualPrincipalInterest;

      const btn = document.getElementById('update-interest-rate')!;
      btn.click();

      expect(handler).toHaveBeenCalledTimes(1);
      const params = handler.mock.calls[0][0];
      expect(params.type).toBe(ChangeType.RateChange);
      expect(params.newAnnualRate).toBe(3.2);
      expect(params.date).toBeInstanceOf(Date);
      expect(params.loanMethod).toBe(LoanMethod.EqualPrincipalInterest);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('利率无效时弹出 alert 不调用回调', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnRateChange(handler);

      (document.getElementById('new-interest-rate') as HTMLInputElement).value =
        '0';
      (
        document.getElementById('interest-change-date') as HTMLInputElement
      ).value = '2024-06-15';

      const btn = document.getElementById('update-interest-rate')!;
      btn.click();

      expect(alertSpy).toHaveBeenCalledWith('年利率必须大于 0');
      expect(handler).not.toHaveBeenCalled();
    });

    it('日期无效时弹出 alert 不调用回调', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnRateChange(handler);

      (document.getElementById('new-interest-rate') as HTMLInputElement).value =
        '3.2';
      (
        document.getElementById('interest-change-date') as HTMLInputElement
      ).value = '';

      const btn = document.getElementById('update-interest-rate')!;
      btn.click();

      expect(alertSpy).toHaveBeenCalledWith('请选择日期');
      expect(handler).not.toHaveBeenCalled();
    });

    it('未设置 onRateChange 回调时不抛错', () => {
      new LoanForm();

      (document.getElementById('new-interest-rate') as HTMLInputElement).value =
        '3.2';
      (
        document.getElementById('interest-change-date') as HTMLInputElement
      ).value = '2024-06-15';

      const btn = document.getElementById('update-interest-rate')!;
      expect(() => btn.click()).not.toThrow();
    });
  });

  describe('handlePrepay', () => {
    it('验证通过时调用 onPrepay 回调', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnPrepay(handler);

      (document.getElementById('prepay-amount') as HTMLInputElement).value =
        '50000';
      (document.getElementById('prepay-date') as HTMLInputElement).value =
        '2024-06-15';
      (document.getElementById('loan-method') as HTMLSelectElement).value =
        LoanMethod.EqualPrincipalInterest;

      const btn = document.getElementById('prepay-loan')!;
      btn.click();

      expect(handler).toHaveBeenCalledTimes(1);
      const params = handler.mock.calls[0][0];
      expect(params.type).toBe(ChangeType.Prepayment);
      expect(params.prepayAmount).toBe(50000);
      expect(params.date).toBeInstanceOf(Date);
      expect(params.loanMethod).toBe(LoanMethod.EqualPrincipalInterest);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('日期无效时弹出 alert 不调用回调', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnPrepay(handler);

      (document.getElementById('prepay-amount') as HTMLInputElement).value =
        '50000';
      (document.getElementById('prepay-date') as HTMLInputElement).value = '';

      const btn = document.getElementById('prepay-loan')!;
      btn.click();

      expect(alertSpy).toHaveBeenCalledWith('请选择日期');
      expect(handler).not.toHaveBeenCalled();
    });

    it('提前还款金额为 NaN 时弹出 alert', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnPrepay(handler);

      (document.getElementById('prepay-amount') as HTMLInputElement).value =
        'abc';
      (document.getElementById('prepay-date') as HTMLInputElement).value =
        '2024-06-15';

      const btn = document.getElementById('prepay-loan')!;
      btn.click();

      expect(alertSpy).toHaveBeenCalledWith('提前还款金额必须大于 0');
      expect(handler).not.toHaveBeenCalled();
    });

    it('提前还款金额为 0 时弹出 alert', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnPrepay(handler);

      (document.getElementById('prepay-amount') as HTMLInputElement).value =
        '0';
      (document.getElementById('prepay-date') as HTMLInputElement).value =
        '2024-06-15';

      const btn = document.getElementById('prepay-loan')!;
      btn.click();

      expect(alertSpy).toHaveBeenCalledWith('提前还款金额必须大于 0');
      expect(handler).not.toHaveBeenCalled();
    });

    it('提前还款金额为负数时弹出 alert', () => {
      const form = new LoanForm();
      const handler = vi.fn();
      form.setOnPrepay(handler);

      (document.getElementById('prepay-amount') as HTMLInputElement).value =
        '-100';
      (document.getElementById('prepay-date') as HTMLInputElement).value =
        '2024-06-15';

      const btn = document.getElementById('prepay-loan')!;
      btn.click();

      expect(alertSpy).toHaveBeenCalledWith('提前还款金额必须大于 0');
      expect(handler).not.toHaveBeenCalled();
    });

    it('未设置 onPrepay 回调时不抛错', () => {
      new LoanForm();

      (document.getElementById('prepay-amount') as HTMLInputElement).value =
        '50000';
      (document.getElementById('prepay-date') as HTMLInputElement).value =
        '2024-06-15';

      const btn = document.getElementById('prepay-loan')!;
      expect(() => btn.click()).not.toThrow();
    });
  });
});
