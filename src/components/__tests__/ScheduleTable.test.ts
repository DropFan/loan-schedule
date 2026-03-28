import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoanSchedule } from '../../models/LoanSchedule';
import type { PaymentScheduleItem } from '../../types/loan.types';

vi.mock('../../services/ExcelExporter', () => ({
  exportToExcel: vi.fn(),
}));

import { exportToExcel } from '../../services/ExcelExporter';
import { ScheduleTable } from '../ScheduleTable';

function setupDOM(): void {
  document.body.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.id = 'payment-schedule';

  const table = document.createElement('table');
  table.id = 'schedule-table';
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  wrapper.appendChild(table);

  const btn = document.createElement('button');
  btn.id = 'export-excel';
  btn.textContent = 'Export';
  wrapper.appendChild(btn);

  document.body.appendChild(wrapper);
}

function makeItem(
  overrides: Partial<PaymentScheduleItem> = {},
): PaymentScheduleItem {
  return {
    period: 1,
    paymentDate: '2024-02-15',
    monthlyPayment: 5000.0,
    principal: 3000.0,
    interest: 2000.0,
    remainingLoan: 97000.0,
    remainingTerm: 359,
    annualInterestRate: 3.65,
    loanMethod: '等额本息',
    comment: '',
    ...overrides,
  };
}

describe('ScheduleTable', () => {
  beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('正常实例化并绑定导出按钮事件', () => {
      const table = new ScheduleTable();
      expect(table).toBeDefined();
    });

    it('没有 #export-excel 按钮时不抛错', () => {
      const btn = document.getElementById('export-excel');
      btn?.remove();
      // 重新实例化
      expect(() => new ScheduleTable()).not.toThrow();
    });
  });

  describe('render', () => {
    it('空列表时渲染一行 10 个 "-"', () => {
      const table = new ScheduleTable();
      table.render([]);

      const tbody = document.querySelector('#schedule-table tbody')!;
      const rows = tbody.querySelectorAll('tr');
      expect(rows.length).toBe(1);

      const cells = rows[0].querySelectorAll('td');
      expect(cells.length).toBe(10);
      for (const cell of cells) {
        expect(cell.textContent).toBe('-');
      }
    });

    it('有数据时渲染对应行数和内容', () => {
      const table = new ScheduleTable();
      const items = [
        makeItem({ period: 1, comment: '首期' }),
        makeItem({ period: 2, paymentDate: '2024-03-15', comment: '' }),
      ];
      table.render(items);

      const tbody = document.querySelector('#schedule-table tbody')!;
      const rows = tbody.querySelectorAll('tr');
      expect(rows.length).toBe(2);

      const firstCells = rows[0].querySelectorAll('td');
      expect(firstCells[0].textContent).toBe('1');
      expect(firstCells[1].textContent).toBe('2024-02-15');
      expect(firstCells[2].textContent).toBe('5000.00');
      expect(firstCells[3].textContent).toBe('3000.00');
      expect(firstCells[4].textContent).toBe('2000.00');
      expect(firstCells[5].textContent).toBe('97000.00');
      expect(firstCells[6].textContent).toBe('359');
      expect(firstCells[7].textContent).toBe('3.65%');
      expect(firstCells[8].textContent).toBe('等额本息');
      expect(firstCells[9].textContent).toBe('首期');
    });

    it('多次渲染时先清空旧数据', () => {
      const table = new ScheduleTable();
      table.render([makeItem()]);
      table.render([makeItem(), makeItem({ period: 2 })]);

      const tbody = document.querySelector('#schedule-table tbody')!;
      expect(tbody.querySelectorAll('tr').length).toBe(2);
    });

    it('没有 tbody 时提前返回不抛错', () => {
      const tbody = document.querySelector('#schedule-table tbody')!;
      tbody.remove();

      const table = new ScheduleTable();
      expect(() => table.render([makeItem()])).not.toThrow();
    });
  });

  describe('handleExport', () => {
    it('没有 model 时点击导出按钮不调用 exportToExcel', async () => {
      new ScheduleTable();
      const btn = document.getElementById('export-excel')!;
      btn.click();

      // 等待异步
      await vi.waitFor(() => {
        expect(exportToExcel).not.toHaveBeenCalled();
      });
    });

    it('有 model 时点击导出按钮调用 exportToExcel', async () => {
      const table = new ScheduleTable();
      const mockModel = {
        schedule: [makeItem()],
        changeList: [],
      };
      table.setModel(mockModel as unknown as LoanSchedule);

      const btn = document.getElementById('export-excel')!;
      btn.click();

      await vi.waitFor(() => {
        expect(exportToExcel).toHaveBeenCalledWith(
          mockModel.schedule,
          mockModel.changeList,
        );
      });
    });
  });
});
