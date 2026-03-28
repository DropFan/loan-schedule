import './styles/main.css';
import { ChangePanel } from './components/ChangePanel';
import { LoanForm } from './components/LoanForm';
import { ScheduleTable } from './components/ScheduleTable';
import { APP_RELEASE, APP_VERSION } from './constants/app.constants';
import { LoanSchedule } from './models/LoanSchedule';
import type { LoanMethod } from './types/loan.types';

// 初始化模型
const model = new LoanSchedule();

// 初始化组件
const loanForm = new LoanForm();
const scheduleTable = new ScheduleTable();
const changePanel = new ChangePanel();

// 连接模型到表格组件
scheduleTable.setModel(model);

// 显示版本信息
function displayAppInfo(): void {
  const versionText = `v${APP_VERSION} Release ${APP_RELEASE}`;
  document.querySelectorAll<HTMLElement>('.app-version-info').forEach((el) => {
    el.textContent = versionText;
  });
}

// 模型事件 → UI 更新
model.on('initialized', () => {
  scheduleTable.render(model.schedule);
  changePanel.render(model.changeList);
});

model.on('changed', () => {
  scheduleTable.render(model.schedule);
  changePanel.render(model.changeList);
});

model.on('cleared', () => {
  scheduleTable.render([]);
  changePanel.render([]);
});

// 表单回调 → 模型操作
loanForm.setOnSubmit((data) => {
  model.initialize({
    loanAmount: data.loanAmount,
    loanTermMonths: data.loanTermYears * 12,
    annualInterestRate: data.annualInterestRate,
    loanMethod: data.loanMethod as LoanMethod,
    startDate: data.startDate,
  });
});

loanForm.setOnRateChange((params) => {
  model.applyChange(params);
});

loanForm.setOnPrepay((params) => {
  model.applyChange(params);
});

// Service Worker 注册
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => console.log('Service Worker registered:', reg.scope))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  displayAppInfo();
});
