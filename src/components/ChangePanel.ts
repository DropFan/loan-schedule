import type { LoanChangeRecord } from '../types/loan.types';
import { type LoanMethod, LoanMethodName } from '../types/loan.types';
import { BaseComponent } from './BaseComponent';

export class ChangePanel extends BaseComponent {
  constructor() {
    super('#result');
  }

  render(changeList: ReadonlyArray<LoanChangeRecord>): void {
    const container = document.getElementById('loan-change-list');
    if (!container) return;

    // 清空现有内容
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    for (const record of changeList) {
      const dateStr = record.date.toISOString().split('T')[0];

      // 日期 + 说明行
      const pDate = document.createElement('p');
      const spanDate = document.createElement('span');
      spanDate.className = 'loan-change-date';
      spanDate.textContent = dateStr;
      pDate.appendChild(spanDate);

      const spanComment = document.createElement('span');
      spanComment.className = 'loan-change-comment';
      spanComment.textContent = ` ${record.comment}`;
      pDate.appendChild(spanComment);
      container.appendChild(pDate);

      // 详情行
      const pDetail = document.createElement('p');
      pDetail.className = 'loan-change-detail';
      pDetail.textContent = [
        `每月还款金额： ${record.monthlyPayment.toFixed(2)} 元`,
        `剩余贷款本金： ${record.loanAmount.toFixed(2)} 元`,
        `剩余期数： ${record.remainingTerm} 月`,
        `还款方式：${LoanMethodName[record.loanMethod as LoanMethod]}`,
        `利率：${record.annualInterestRate}%`,
      ].join('   ');
      container.appendChild(pDetail);
    }
  }
}
