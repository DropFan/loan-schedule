import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoanSchedule as LoanScheduleType } from '../models/LoanSchedule';

/**
 * 构建测试所需的 DOM 结构。
 * 使用 innerHTML 是安全的，因为这仅在测试环境中运行，内容为硬编码的测试 fixture。
 */
function setupDOM(options?: { noUndoBtn?: boolean }) {
  document.body.innerHTML = [
    '<div class="container">',
    '  <form id="loan-form">',
    '    <input id="loan-amount" type="number" value="1000000" />',
    '    <input id="loan-term" type="number" value="30" />',
    '    <input id="interest-rate" type="number" value="4.9" />',
    '    <select id="loan-method">',
    '      <option value="equal-principal-interest" selected>等额本息</option>',
    '      <option value="equal-principal">等额本金</option>',
    '    </select>',
    '    <input id="loan-start-date" type="date" value="2024-01-15" />',
    '    <button type="submit">计算</button>',
    '  </form>',
    '  <div id="payment-schedule">',
    '    <table id="schedule-table"><tbody></tbody></table>',
    '    <button id="export-excel">导出 Excel</button>',
    '  </div>',
    '  <div id="result">',
    '    <div id="loan-change-list"></div>',
    '  </div>',
    '  <div>',
    '    <input id="new-interest-rate" type="number" value="3.65" />',
    '    <input id="interest-change-date" type="date" value="2025-01-15" />',
    '    <button id="update-interest-rate">调整利率</button>',
    '  </div>',
    '  <div>',
    '    <input id="prepay-amount" type="number" value="100000" />',
    '    <input id="prepay-date" type="date" value="2025-06-15" />',
    '    <select id="prepay-mode">',
    '      <option value="reduce-payment" selected>减少月供</option>',
    '      <option value="shorten-term">缩短年限</option>',
    '    </select>',
    '    <button id="prepay-loan">提前还款</button>',
    '  </div>',
    options?.noUndoBtn ? '' : '  <button id="undo-change">撤销</button>',
    '  <span class="app-version-info"></span>',
    '  <span class="app-version-info"></span>',
    '</div>',
  ].join('\n');
}

// mock CSS import
vi.mock('../styles/main.css', () => ({}));

// mock xlsx for ScheduleTable -> ExcelExporter dependency
vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('main.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDOM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('导入后 DOMContentLoaded 事件触发 displayAppInfo', async () => {
    await import('../main');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const versionEls = document.querySelectorAll('.app-version-info');
    expect(versionEls.length).toBe(2);
    for (const el of versionEls) {
      expect(el.textContent).toMatch(/^v\d+\.\d+\.\d+ Release \d+$/);
    }
  });

  it('表单提交触发 model.initialize，渲染还款计划', async () => {
    await import('../main');

    const form = document.getElementById('loan-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // 提交后 schedule table 应该有渲染内容
    const tbody = document.querySelector(
      '#schedule-table tbody',
    ) as HTMLTableSectionElement;
    expect(tbody.children.length).toBeGreaterThan(0);

    // changeList 也应该渲染
    const changeList = document.getElementById(
      'loan-change-list',
    ) as HTMLElement;
    expect(changeList.children.length).toBeGreaterThan(0);
  });

  it('撤销按钮点击触发 model.undo', async () => {
    await import('../main');

    // 先初始化贷款
    const form = document.getElementById('loan-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const undoBtn = document.getElementById('undo-change') as HTMLButtonElement;

    // 初始化后无历史，undo 按钮应禁用
    expect(undoBtn.disabled).toBe(true);

    // 执行一次利率变更，产生历史记录
    const rateBtn = document.getElementById(
      'update-interest-rate',
    ) as HTMLButtonElement;
    rateBtn.click();

    // 变更后 undo 按钮应启用
    expect(undoBtn.disabled).toBe(false);

    // 点击撤销
    undoBtn.click();

    // 撤销后无历史，undo 按钮应禁用
    expect(undoBtn.disabled).toBe(true);
  });

  describe('Service Worker 注册', () => {
    it('注册成功时输出日志', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const fakeReg = { scope: 'http://localhost/' };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue(fakeReg),
        },
        configurable: true,
        writable: true,
      });

      await import('../main');

      // 触发 window load 事件
      window.dispatchEvent(new Event('load'));

      // 等待 Promise 链完成
      await vi.waitFor(() => {
        expect(logSpy).toHaveBeenCalledWith(
          'Service Worker registered:',
          'http://localhost/',
        );
      });

      logSpy.mockRestore();
    });

    it('注册失败时输出错误日志', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const fakeError = new Error('SW failed');

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockRejectedValue(fakeError),
        },
        configurable: true,
        writable: true,
      });

      await import('../main');

      window.dispatchEvent(new Event('load'));

      await vi.waitFor(() => {
        expect(logSpy).toHaveBeenCalledWith(
          'Service Worker registration failed:',
          fakeError,
        );
      });

      logSpy.mockRestore();
    });
  });

  it('undoBtn 不存在时 updateUndoBtn 为空操作，不报错', async () => {
    vi.resetModules();
    setupDOM({ noUndoBtn: true });

    await import('../main');
    expect(document.getElementById('undo-change')).toBeNull();

    // 触发表单提交，使 initialized 事件调用 updateUndoBtn(undoBtn 为 null)
    const form = document.getElementById('loan-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // 不报错即可
    const tbody = document.querySelector(
      '#schedule-table tbody',
    ) as HTMLTableSectionElement;
    expect(tbody.children.length).toBeGreaterThan(0);
  });

  it('利率变更按钮触发 model.applyChange', async () => {
    await import('../main');

    // 先初始化
    const form = document.getElementById('loan-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const tbody = document.querySelector(
      '#schedule-table tbody',
    ) as HTMLTableSectionElement;
    const rowsBefore = tbody.children.length;
    expect(rowsBefore).toBeGreaterThan(0);

    // 执行利率变更
    const rateBtn = document.getElementById(
      'update-interest-rate',
    ) as HTMLButtonElement;
    rateBtn.click();

    // 变更后 changeList 应多一条记录
    const changeList = document.getElementById(
      'loan-change-list',
    ) as HTMLElement;
    // 初始化有 1 条，利率变更后有 2 条（每条变更有 2 个 p 元素：日期行 + 详情行）
    expect(changeList.children.length).toBe(4);
  });

  it('提前还款按钮触发 model.applyChange', async () => {
    await import('../main');

    // 先初始化
    const form = document.getElementById('loan-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // 执行提前还款
    const prepayBtn = document.getElementById(
      'prepay-loan',
    ) as HTMLButtonElement;
    prepayBtn.click();

    const changeList = document.getElementById(
      'loan-change-list',
    ) as HTMLElement;
    // 初始化 1 条 + 提前还款 1 条 = 2 条变更，每条 2 个 p 元素
    expect(changeList.children.length).toBe(4);
  });

  it('model.clear 触发 cleared 事件回调，清空 UI', async () => {
    vi.resetModules();
    setupDOM();

    // 拦截 LoanSchedule 构造函数以捕获 model 实例
    let capturedModel: LoanScheduleType = undefined!;
    const actual = await vi.importActual<
      typeof import('../models/LoanSchedule')
    >('../models/LoanSchedule');
    vi.doMock('../models/LoanSchedule', () => ({
      LoanSchedule: class extends actual.LoanSchedule {
        constructor() {
          super();
          capturedModel = this;
        }
      },
    }));

    await import('../main');

    // 先初始化产生数据
    const form = document.getElementById('loan-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const tbody = document.querySelector(
      '#schedule-table tbody',
    ) as HTMLTableSectionElement;
    expect(tbody.children.length).toBeGreaterThan(1);

    // 调用 clear 触发 cleared 事件回调
    capturedModel.clear();

    // 表格应被清空为默认占位行
    expect(tbody.children.length).toBe(1);
    expect(tbody.children[0].children[0].textContent).toBe('-');
  });
});
