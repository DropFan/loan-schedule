import { describe, expect, it, vi } from 'vitest';
import { REPAYMENT_DAY } from '../../constants/app.constants';
import {
  ChangeType,
  LoanMethod,
  type LoanParameters,
} from '../../types/loan.types';
import { LoanSchedule } from '../LoanSchedule';

/** 创建默认贷款参数的辅助函数 */
function makeParams(overrides: Partial<LoanParameters> = {}): LoanParameters {
  return {
    loanAmount: 1_000_000,
    loanTermMonths: 360,
    annualInterestRate: 4.2,
    loanMethod: LoanMethod.EqualPrincipalInterest,
    startDate: new Date(2024, 0, REPAYMENT_DAY), // 1月15日，与还款日一致
    ...overrides,
  };
}

describe('LoanSchedule', () => {
  // ===================== getters =====================

  describe('初始状态', () => {
    it('schedule 默认为空数组', () => {
      const ls = new LoanSchedule();
      expect(ls.schedule).toEqual([]);
    });

    it('changeList 默认为空数组', () => {
      const ls = new LoanSchedule();
      expect(ls.changeList).toEqual([]);
    });

    it('params 默认为 null', () => {
      const ls = new LoanSchedule();
      expect(ls.params).toBeNull();
    });

    it('canUndo 默认为 false', () => {
      const ls = new LoanSchedule();
      expect(ls.canUndo).toBe(false);
    });
  });

  // ===================== initialize =====================

  describe('initialize', () => {
    it('放款日 === 还款日时，无首期额外利息', () => {
      const ls = new LoanSchedule();
      const params = makeParams({
        startDate: new Date(2024, 0, REPAYMENT_DAY),
      });
      ls.initialize(params);

      expect(ls.params).toBe(params);
      expect(ls.schedule.length).toBe(360);
      expect(ls.changeList.length).toBe(1);
      expect(ls.changeList[0].comment).toBe('初始贷款');
      // 首期无额外利息，comment 为空
      expect(ls.schedule[0].comment).toBe('');
    });

    it('放款日 < 还款日时，首期按天计息（startDay < repaymentDay 分支）', () => {
      const ls = new LoanSchedule();
      // 1月10日放款，15日还款 => extraDays = 15 - 10 + 1 = 6
      const params = makeParams({ startDate: new Date(2024, 0, 10) });
      ls.initialize(params);

      expect(ls.schedule[0].comment).toContain('首期按天计息');
      expect(ls.changeList[0].comment).toContain('初始贷款，首期按天计息');

      // 验证计算：extraDays = 6, dailyRate = monthlyRate / 30
      const monthlyRate = 4.2 / 100 / 12;
      const dailyRate = monthlyRate / 30;
      const extraInterest = 1_000_000 * dailyRate * 6;
      expect(ls.schedule[0].comment).toContain(extraInterest.toFixed(2));
    });

    it('放款日 > 还款日时，跨月计算 extraDays（else 分支）', () => {
      const ls = new LoanSchedule();
      // 1月20日放款，15日还款 => daysInMonth(2024,1) = 31
      // extraDays = 31 - 20 + 1 + (15 - 1) = 12 + 14 = 26
      const params = makeParams({ startDate: new Date(2024, 0, 20) });
      ls.initialize(params);

      expect(ls.schedule[0].comment).toContain('首期按天计息');

      const monthlyRate = 4.2 / 100 / 12;
      const dailyRate = monthlyRate / 30;
      const extraDays = 31 - 20 + 1 + (REPAYMENT_DAY - 1);
      const extraInterest = 1_000_000 * dailyRate * extraDays;
      expect(ls.schedule[0].comment).toContain(extraInterest.toFixed(2));
    });

    it('等额本金方式初始化', () => {
      const ls = new LoanSchedule();
      const params = makeParams({
        loanMethod: LoanMethod.EqualPrincipal,
        startDate: new Date(2024, 0, REPAYMENT_DAY),
      });
      ls.initialize(params);

      expect(ls.schedule.length).toBe(360);
      expect(ls.changeList[0].loanMethod).toBe(LoanMethod.EqualPrincipal);
      // 等额本金月供递减，第一期 > 最后一期
      expect(ls.schedule[0].monthlyPayment).toBeGreaterThan(
        ls.schedule[359].monthlyPayment,
      );
    });

    it('重复初始化时重置历史和变更列表', () => {
      const ls = new LoanSchedule();
      ls.initialize(makeParams());
      // 触发一次变更以产生历史
      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });
      expect(ls.canUndo).toBe(true);
      expect(ls.changeList.length).toBe(2);

      // 重新初始化
      ls.initialize(makeParams());
      expect(ls.canUndo).toBe(false);
      expect(ls.changeList.length).toBe(1);
    });
  });

  // ===================== applyChange =====================

  describe('applyChange', () => {
    it('未初始化时调用，直接返回不做任何操作', () => {
      const ls = new LoanSchedule();
      const cb = vi.fn();
      ls.on('changed', cb);

      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });

      expect(cb).not.toHaveBeenCalled();
      expect(ls.schedule.length).toBe(0);
    });

    it('findRemainingInfo 返回 null 时，回退 _history', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );

      // 使用早于所有还款日的日期，使 findRemainingInfo 返回 null
      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2020, 0, 1),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.5,
      });

      // 历史不应增长
      expect(ls.canUndo).toBe(false);
      expect(ls.changeList.length).toBe(1);
    });

    describe('利率变更 (RateChange)', () => {
      it('deltaDay === 0 时无 extraInterest', () => {
        const ls = new LoanSchedule();
        ls.initialize(
          makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
        );

        // 使用与 findRemainingInfo 相同的日期解析方式，保证 deltaDay === 0
        // new Date('YYYY-MM-DD') 统一解析为 UTC 午夜
        const changeDate = new Date(ls.schedule[11].paymentDate);

        ls.applyChange({
          type: ChangeType.RateChange,
          date: changeDate,
          loanMethod: LoanMethod.EqualPrincipalInterest,
          newAnnualRate: 3.8,
        });

        expect(ls.canUndo).toBe(true);
        expect(ls.changeList.length).toBe(2);
        const lastChange = ls.changeList[1];
        expect(lastChange.annualInterestRate).toBe(3.8);
        expect(lastChange.comment).toContain('利率变更为 3.80%');
        // 无按天息差
        expect(lastChange.comment).not.toContain('按天息差');
      });

      it('deltaDay > 0 时有 extraInterest', () => {
        const ls = new LoanSchedule();
        ls.initialize(
          makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
        );

        // 变更日期在两个还款日之间，产生 deltaDay > 0
        ls.applyChange({
          type: ChangeType.RateChange,
          date: new Date(2025, 0, 25), // 1月25日，上一个还款日是1月15日，deltaDay=10
          loanMethod: LoanMethod.EqualPrincipalInterest,
          newAnnualRate: 3.8,
        });

        const lastChange = ls.changeList[1];
        expect(lastChange.comment).toContain('利率变更为 3.80%');
        expect(lastChange.comment).toContain('按天息差');
      });

      it('利率变更时 extraInterest 加到新计划首期', () => {
        const ls = new LoanSchedule();
        ls.initialize(
          makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
        );

        ls.applyChange({
          type: ChangeType.RateChange,
          date: new Date(2025, 0, 25),
          loanMethod: LoanMethod.EqualPrincipalInterest,
          newAnnualRate: 3.8,
        });

        // 变更后，新计划第一期的 comment 应包含日期和变更信息
        const changedPeriod = ls.schedule.find((item) =>
          item.comment.includes('利率变更'),
        );
        expect(changedPeriod).toBeDefined();
      });
    });

    describe('提前还款 (Prepayment)', () => {
      it('deltaDay === 0 时无 extraInterest', () => {
        const ls = new LoanSchedule();
        ls.initialize(
          makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
        );

        // 使用与 findRemainingInfo 相同的日期解析方式
        const changeDate = new Date(ls.schedule[11].paymentDate);

        ls.applyChange({
          type: ChangeType.Prepayment,
          date: changeDate,
          loanMethod: LoanMethod.EqualPrincipalInterest,
          prepayAmount: 100_000,
        });

        const lastChange = ls.changeList[1];
        expect(lastChange.comment).toContain('提前还款 100000 元');
        expect(lastChange.comment).not.toContain('按天息差');

        // 提前还款行
        const prepayItem = ls.schedule.find((item) => item.period === 0);
        expect(prepayItem).toBeDefined();
        expect(prepayItem!.principal).toBe(100_000);
        expect(prepayItem!.interest).toBe(0); // deltaDay=0 无额外利息
      });

      it('deltaDay > 0 时有 extraInterest', () => {
        const ls = new LoanSchedule();
        ls.initialize(
          makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
        );

        ls.applyChange({
          type: ChangeType.Prepayment,
          date: new Date(2025, 0, 25), // deltaDay = 10
          loanMethod: LoanMethod.EqualPrincipalInterest,
          prepayAmount: 100_000,
        });

        const lastChange = ls.changeList[1];
        expect(lastChange.comment).toContain('提前还款 100000 元');
        expect(lastChange.comment).toContain('按天息差');

        // 提前还款行的利息 > 0
        const prepayItem = ls.schedule.find((item) => item.period === 0);
        expect(prepayItem).toBeDefined();
        expect(prepayItem!.interest).toBeGreaterThan(0);
      });

      it('提前还款插入独立记录行，remainingLoan 不为负', () => {
        const ls = new LoanSchedule();
        ls.initialize(
          makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
        );

        ls.applyChange({
          type: ChangeType.Prepayment,
          date: new Date(2025, 0, REPAYMENT_DAY),
          loanMethod: LoanMethod.EqualPrincipalInterest,
          prepayAmount: 100_000,
        });

        const prepayItem = ls.schedule.find((item) => item.period === 0);
        expect(prepayItem).toBeDefined();
        expect(prepayItem!.remainingLoan).toBeGreaterThanOrEqual(0);
      });
    });

    describe('月供变化 comment 分支', () => {
      it('月供减少（diff < 0）', () => {
        const ls = new LoanSchedule();
        ls.initialize(
          makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
        );

        // 降低利率 => 月供减少
        ls.applyChange({
          type: ChangeType.RateChange,
          date: new Date(2025, 0, REPAYMENT_DAY),
          loanMethod: LoanMethod.EqualPrincipalInterest,
          newAnnualRate: 3.0,
        });

        expect(ls.changeList[1].comment).toContain('月供减少');
      });

      it('月供增加（diff > 0）', () => {
        const ls = new LoanSchedule();
        ls.initialize(
          makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
        );

        // 提高利率 => 月供增加
        ls.applyChange({
          type: ChangeType.RateChange,
          date: new Date(2025, 0, REPAYMENT_DAY),
          loanMethod: LoanMethod.EqualPrincipalInterest,
          newAnnualRate: 5.5,
        });

        expect(ls.changeList[1].comment).toContain('月供增加');
      });

      it('月供不变（diff === 0）', () => {
        const ls = new LoanSchedule();
        ls.initialize(
          makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
        );

        // 利率不变 => 月供不变
        ls.applyChange({
          type: ChangeType.RateChange,
          date: new Date(2025, 0, REPAYMENT_DAY),
          loanMethod: LoanMethod.EqualPrincipalInterest,
          newAnnualRate: 4.2,
        });

        expect(ls.changeList[1].comment).toContain('月供不变');
      });
    });

    it('等额本金方式变更', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({
          loanMethod: LoanMethod.EqualPrincipal,
          startDate: new Date(2024, 0, REPAYMENT_DAY),
        }),
      );

      ls.applyChange({
        type: ChangeType.Prepayment,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipal,
        prepayAmount: 200_000,
      });

      expect(ls.changeList.length).toBe(2);
      expect(ls.changeList[1].loanMethod).toBe(LoanMethod.EqualPrincipal);
    });
  });

  // ===================== undo =====================

  describe('undo', () => {
    it('有历史时返回 true 并恢复状态', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );

      const scheduleBeforeChange = [...ls.schedule];
      const changeListBeforeChange = [...ls.changeList];

      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });

      expect(ls.canUndo).toBe(true);
      const result = ls.undo();

      expect(result).toBe(true);
      expect(ls.canUndo).toBe(false);
      expect(ls.schedule.length).toBe(scheduleBeforeChange.length);
      expect(ls.changeList.length).toBe(changeListBeforeChange.length);
    });

    it('无历史时返回 false', () => {
      const ls = new LoanSchedule();
      expect(ls.undo()).toBe(false);
    });

    it('undo 触发 changed 事件', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );
      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });

      const cb = vi.fn();
      ls.on('changed', cb);
      ls.undo();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  // ===================== clear =====================

  describe('clear', () => {
    it('重置所有状态', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );

      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });

      ls.clear();

      expect(ls.schedule.length).toBe(0);
      expect(ls.changeList.length).toBe(0);
      expect(ls.params).toBeNull();
      expect(ls.canUndo).toBe(false);
    });

    it('clear 触发 cleared 事件', () => {
      const ls = new LoanSchedule();
      const cb = vi.fn();
      ls.on('cleared', cb);
      ls.clear();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  // ===================== 事件系统 =====================

  describe('事件系统 (on/emit)', () => {
    it('initialize 触发 initialized 事件', () => {
      const ls = new LoanSchedule();
      const cb = vi.fn();
      ls.on('initialized', cb);
      ls.initialize(makeParams());
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('applyChange 触发 changed 事件', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );

      const cb = vi.fn();
      ls.on('changed', cb);

      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('支持同一事件注册多个回调', () => {
      const ls = new LoanSchedule();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      ls.on('initialized', cb1);
      ls.on('initialized', cb2);
      ls.initialize(makeParams());
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('未注册事件时 emit 不报错', () => {
      const ls = new LoanSchedule();
      // clear 会 emit('cleared')，但没有注册 listener，不应报错
      expect(() => ls.clear()).not.toThrow();
    });
  });

  // ===================== getLastMonthlyPayment =====================

  describe('getLastMonthlyPayment（通过 applyChange 间接测试）', () => {
    it('changeList 为空时返回 0，月供变化 comment 不追加', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );

      // 手动清空 changeList 模拟防御性分支
      (ls as any)._changeList = [];

      const changeDate = new Date(ls.schedule[11].paymentDate);
      ls.applyChange({
        type: ChangeType.RateChange,
        date: changeDate,
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });

      // oldMonthlyPayment === 0 → if (oldMonthlyPayment > 0) 为 false → 无月供变化 comment
      const lastChange = ls.changeList[ls.changeList.length - 1];
      expect(lastChange.comment).not.toContain('月供');
    });
  });

  // ===================== canUndo =====================

  describe('canUndo', () => {
    it('初始化后 canUndo 为 false', () => {
      const ls = new LoanSchedule();
      ls.initialize(makeParams());
      expect(ls.canUndo).toBe(false);
    });

    it('applyChange 后 canUndo 为 true', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );
      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });
      expect(ls.canUndo).toBe(true);
    });

    it('undo 后如果无更多历史，canUndo 为 false', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );
      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });
      ls.undo();
      expect(ls.canUndo).toBe(false);
    });

    it('多次 applyChange 后可多次 undo', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );

      ls.applyChange({
        type: ChangeType.RateChange,
        date: new Date(2025, 0, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.8,
      });
      ls.applyChange({
        type: ChangeType.Prepayment,
        date: new Date(2025, 6, REPAYMENT_DAY),
        loanMethod: LoanMethod.EqualPrincipalInterest,
        prepayAmount: 50_000,
      });

      expect(ls.undo()).toBe(true);
      expect(ls.canUndo).toBe(true);
      expect(ls.undo()).toBe(true);
      expect(ls.canUndo).toBe(false);
    });
  });

  // ===================== 利率变更 result.schedule 为空的边界 =====================

  describe('边界情况', () => {
    it('利率变更后 result.schedule 为空时不报错（极端情况）', () => {
      const ls = new LoanSchedule();
      // 只有 1 期的贷款
      ls.initialize(
        makeParams({
          loanTermMonths: 1,
          startDate: new Date(2024, 0, REPAYMENT_DAY),
        }),
      );

      // 使用与 schedule 中相同的日期解析方式，确保 findRemainingInfo 能匹配
      // 1 期贷款 → schedule[0].paymentDate = '2024-02-15'，remainingTerm = 0
      const changeDate = new Date(ls.schedule[0].paymentDate);
      ls.applyChange({
        type: ChangeType.RateChange,
        date: changeDate,
        loanMethod: LoanMethod.EqualPrincipalInterest,
        newAnnualRate: 3.5,
      });

      // remainingTerm = 0 → 生成空 schedule → result.schedule.length === 0 分支
      expect(ls.changeList.length).toBe(2);
    });

    it('applyChange 中 type 为 Prepayment 但 prepayAmount 为 undefined 时不崩溃', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );

      const changeDate = new Date(ls.schedule[11].paymentDate);
      // prepayAmount 未提供，else-if 条件不满足，走到默认路径
      ls.applyChange({
        type: ChangeType.Prepayment,
        date: changeDate,
        loanMethod: LoanMethod.EqualPrincipalInterest,
        // prepayAmount 故意不传
      });

      expect(ls.changeList.length).toBe(2);
    });

    it('applyChange 中 type 为 RateChange 但 newAnnualRate 为 undefined 时不崩溃', () => {
      const ls = new LoanSchedule();
      ls.initialize(
        makeParams({ startDate: new Date(2024, 0, REPAYMENT_DAY) }),
      );

      const changeDate = new Date(ls.schedule[11].paymentDate);
      ls.applyChange({
        type: ChangeType.RateChange,
        date: changeDate,
        loanMethod: LoanMethod.EqualPrincipalInterest,
        // newAnnualRate 故意不传
      });

      expect(ls.changeList.length).toBe(2);
    });
  });
});
