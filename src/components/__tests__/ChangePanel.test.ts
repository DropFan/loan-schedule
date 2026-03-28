import { beforeEach, describe, expect, it } from 'vitest';
import type { LoanChangeRecord } from '../../types/loan.types';
import { LoanMethod } from '../../types/loan.types';
import { ChangePanel } from '../ChangePanel';

function setupDOM(includeChangeList = true): void {
  document.body.textContent = '';

  const result = document.createElement('div');
  result.id = 'result';

  if (includeChangeList) {
    const list = document.createElement('div');
    list.id = 'loan-change-list';
    result.appendChild(list);
  }

  document.body.appendChild(result);
}

function makeRecord(
  overrides: Partial<LoanChangeRecord> = {},
): LoanChangeRecord {
  return {
    date: new Date('2024-01-15T00:00:00.000Z'),
    loanAmount: 1000000,
    remainingTerm: 360,
    monthlyPayment: 5000,
    annualInterestRate: 3.65,
    loanMethod: LoanMethod.EqualPrincipalInterest,
    comment: '初始贷款',
    ...overrides,
  };
}

describe('ChangePanel', () => {
  beforeEach(() => {
    setupDOM();
  });

  describe('constructor', () => {
    it('正常实例化', () => {
      const panel = new ChangePanel();
      expect(panel).toBeDefined();
    });
  });

  describe('render', () => {
    it('空列表时容器内无子元素', () => {
      const panel = new ChangePanel();
      panel.render([]);

      const container = document.getElementById('loan-change-list')!;
      expect(container.children.length).toBe(0);
    });

    it('有记录时渲染日期、备注和详情', () => {
      const panel = new ChangePanel();
      const records = [makeRecord()];
      panel.render(records);

      const container = document.getElementById('loan-change-list')!;
      // 每条记录产生 2 个 <p> 元素
      expect(container.children.length).toBe(2);

      const pDate = container.children[0] as HTMLElement;
      const dateSpan = pDate.querySelector('.loan-change-date')!;
      expect(dateSpan.textContent).toBe('2024-01-15');

      const commentSpan = pDate.querySelector('.loan-change-comment')!;
      expect(commentSpan.textContent).toBe(' 初始贷款');

      const pDetail = container.children[1] as HTMLElement;
      expect(pDetail.className).toBe('loan-change-detail');
      expect(pDetail.textContent).toContain('每月还款金额： 5000.00 元');
      expect(pDetail.textContent).toContain('剩余贷款本金： 1000000.00 元');
      expect(pDetail.textContent).toContain('剩余期数： 360 月');
      expect(pDetail.textContent).toContain('还款方式：等额本息');
      expect(pDetail.textContent).toContain('利率：3.65%');
    });

    it('多条记录时渲染多组元素', () => {
      const panel = new ChangePanel();
      const records = [
        makeRecord(),
        makeRecord({
          date: new Date('2024-06-15T00:00:00.000Z'),
          annualInterestRate: 3.2,
          comment: '利率变更',
          loanMethod: LoanMethod.EqualPrincipal,
        }),
      ];
      panel.render(records);

      const container = document.getElementById('loan-change-list')!;
      // 2 条记录 x 2 个 <p> = 4 个子元素
      expect(container.children.length).toBe(4);

      const secondDetail = container.children[3] as HTMLElement;
      expect(secondDetail.textContent).toContain('还款方式：等额本金');
      expect(secondDetail.textContent).toContain('利率：3.2%');
    });

    it('多次渲染时先清空旧内容', () => {
      const panel = new ChangePanel();
      panel.render([makeRecord()]);
      panel.render([makeRecord()]);

      const container = document.getElementById('loan-change-list')!;
      expect(container.children.length).toBe(2);
    });

    it('没有 #loan-change-list 容器时提前返回不抛错', () => {
      setupDOM(false);
      const panel = new ChangePanel();
      expect(() => panel.render([makeRecord()])).not.toThrow();
    });
  });
});
