# 公积金贷款支持：自由还款 + 公积金利率表

> 日期：2026-03-30

## 概述

新增公积金贷款的自由还款方式，以及公积金利率表数据源。

## 需求

1. 新增还款方式：自由还款（FreeRepayment），与等额本息/等额本金并列
2. 自由还款逻辑：用户设定每月固定还款额（>= 建议最低还款额），先扣利息后冲本金，最后一期还清剩余本金
3. 建议最低还款额：等额本息月供 × 85%
4. 月供调整：通过现有变更机制，新增 `PaymentChange` 变更类型（仅自由还款可用）
5. 自由还款模式下不提供提前还款，调整月供即可实现同等效果
6. 公积金利率表：新增 `gjj` 数据源（类似 LPR），包含 2015 年至今的利率变化点

## 设计（方案 C：最小侵入 + 利率表分类标签）

### 类型定义

- `LoanMethod` 枚举新增 `FreeRepayment = 'free-repayment'`
- `LoanParameters` 新增 `monthlyPaymentAmount?: number`（自由还款时的月供额）
- `ChangeType` 枚举新增 `PaymentChange = 'payment-change'`
- `LoanChangeParams` 新增 `newMonthlyPayment?: number`
- `RateEntry.source` / `SavedRateTable.source` 扩展 `'gjj'`

### 计算逻辑

- `calcFreeRepaymentMinPayment(principal, termMonths, monthlyRate)` = 等额本息月供 × 0.85
- `generateSchedule` 自由还款分支：每月 `利息 = 剩余本金 × 月利率`，`本金 = 固定月供 - 利息`，最后一期还清剩余
- 实际期数可能 < termMonths（用户设定高月供时提前还清）
- `calcMonthlyPayment` / `calculateLoan` 签名扩展，增加 `monthlyPaymentAmount` 参数

### Store 层

- `initialize()` 透传 `monthlyPaymentAmount`
- `applyChange()` 新增 `PaymentChange` 分支，验证 >= 最低还款额后重新生成计划
- 乱序重放机制天然兼容新变更类型

### 公积金利率表

- 新增 `gjj-history.ts`：5年以上首套（3.25% → 3.10% → 2.85% → 2.60%）和 5年以下首套
- 新增 `GjjRateProvider`（与 `LprRateProvider` 结构一致），支持期限选择 + 基点偏移
- 利率表 UI 新增 `gjj` 数据源选项

### UI 层

- `LoanForm`：还款方式下拉新增"自由还款"，选中时显示月供输入框 + 建议最低值
- 变更表单：根据 `loanMethod` 切换可用操作（自由还款 → 利率变更 + 调整月供）
- 利率表管理：新增公积金数据源选项 + 期限选择
- 还款计划表：无需改动（数据结构一致）

## 改动文件

| 文件 | 改动类型 |
|---|---|
| `core/types/loan.types.ts` | 修改 |
| `core/calculator/LoanCalculator.ts` | 修改 |
| `stores/useLoanStore.ts` | 修改 |
| `features/rate-table/data/gjj-history.ts` | 新增 |
| `features/rate-table/rate-provider.ts` | 修改 |
| `features/calculator/components/LoanForm.tsx` | 修改 |
| `features/changes/` 下变更表单组件 | 修改 |
| `features/rate-table/components/RateTablePage.tsx` | 修改 |
