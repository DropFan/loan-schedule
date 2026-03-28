import type { LoanSchedule } from '../models/LoanSchedule';
import { exportToExcel } from '../services/ExcelExporter';
import type { PaymentScheduleItem } from '../types/loan.types';
import { BaseComponent } from './BaseComponent';

export class ScheduleTable extends BaseComponent {
  private model: LoanSchedule | null = null;

  constructor() {
    super('#payment-schedule');
    this.bindExport();
  }

  setModel(model: LoanSchedule): void {
    this.model = model;
  }

  render(schedule: ReadonlyArray<PaymentScheduleItem>): void {
    const tbody = this.container.querySelector<HTMLTableSectionElement>(
      '#schedule-table tbody',
    );
    if (!tbody) return;

    // 清空现有行
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    if (schedule.length === 0) {
      const tr = document.createElement('tr');
      for (let i = 0; i < 10; i++) {
        const td = document.createElement('td');
        td.textContent = '-';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      return;
    }

    for (const item of schedule) {
      const tr = document.createElement('tr');
      const cells = [
        String(item.period),
        item.paymentDate,
        item.monthlyPayment.toFixed(2),
        item.principal.toFixed(2),
        item.interest.toFixed(2),
        item.remainingLoan.toFixed(2),
        String(item.remainingTerm),
        `${item.annualInterestRate}%`,
        item.loanMethod,
        item.comment,
      ];
      for (const text of cells) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  private bindExport(): void {
    const btn = document.getElementById('export-excel');
    if (btn) {
      btn.addEventListener('click', () => this.handleExport());
    }
  }

  private async handleExport(): Promise<void> {
    if (!this.model) return;
    await exportToExcel(this.model.schedule, this.model.changeList);
  }
}
