Changelog
===

[0.8.0] - 2026-03-29
---

### 新功能

* [New] 提前还款变更方式 —— 提前还款后支持选择"减少月供（期限不变）"或"缩短年限（月供不变）"两种方式。(#2)
* [New] 等额本金缩短年限 —— 等额本金模式下保持每期固定本金不变，自动反算新期数。

### 数据结构预留

* 新增 `LoanScheduleSummary` 摘要接口和 `calcScheduleSummary()` 函数，为后续利息节省曲线功能预留。
* 新增 `ChangeType.MethodChange` 类型，为后续独立变更还款方式功能预留。

[0.7.0] - 2026-03-29
---

### 架构重构

* 从原生 HTML/JavaScript/CSS 迁移到 TypeScript + Vite 架构。
* 代码按职责分层：models / services / components / utils / types。
* 引入 BaseComponent 组件基类，统一 DOM 操作模式。
* LoanCalculator 重构为纯函数，零副作用。
* LoanSchedule 模型采用发布订阅模式通知 UI 更新。

### 新功能

* [New] 按天计息 —— 变更当月支持按天计算利息差额，更贴近银行实际算法。
* [New] 撤销操作 —— 支持撤销最近一次变更（利率调整或提前还款）。
* [New] 输入验证 —— 完整的表单验证，防止异常数据输入。

### 工程化

* 升级 TypeScript 6、Vite 8。
* 引入 Biome 统一代码检查与格式化，替代 ESLint + Prettier。
* 引入 Vitest + happy-dom 测试框架，163 个测试用例，100% 覆盖率。
* CI 流水线增加 type-check 和 lint 检查步骤。
* 补充 MIT License。

### 修复

* 修复金额精度问题，全部使用 `roundTo2()` 控制每期计算精度。
* 修复 ChangePanel 组件重复 ID 问题。
* 修复 ExcelExporter 空 catch 吞错误。

[0.6.1] - 2025-01-13
---

* [New]增加版本号并在首页显示，便于 PWA 应用识别版本。

[0.6] - 2025-01-13
---

* [New]还款过程变更记录也支持一起导出到 Excel 中。
* [New]还款过程变更记录新增字段。
* 部分文案优化。
* 文档优化

[0.5] - 2025-01-13
---

* [New]新增还款过程变更记录展示。
* 优化页面布局和样式。
* 重构部分代码。

[0.4] - 2025-01-12
---

* [New]添加网站 logo/icon
* [New]添加 PWA 应用设置，可以将 Web App 添加到手机/电脑桌面直接使用。

[0.3] - 2025-01-12
---

* [New]完善说明文档
* [New]部署到 GitHub Pages，绑定域名。

[0.2] - 2025-01-11
---

* [New]新增导出到 Excel 功能。

[0.1] - 2025-01-11
---

* [New]完成初版。
* [New]支持贷款计算、利率变更、提前还款
