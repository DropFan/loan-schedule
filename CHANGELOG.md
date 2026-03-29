Changelog
===

[2.2.0] - 2026-03-30
---

### 新功能

* [New] 贷款类型 — 新增商业贷款/公积金贷款类型区分，影响利率变更时的计息方式。
* [New] 自由还款 — 新增还款方式，用户自定义月供金额（建议不低于等额本息的 85%），先扣利息后冲本金，最后一期还清剩余本金。
* [New] 调整月供 — 自由还款模式下新增变更类型，替代提前还款，通过调整月供实现灵活还款。
* [New] 公积金利率表 — 内置 2015 年至今公积金贷款利率（5 年以上/以下首套），支持基点偏移（如二套房上浮）。
* [New] 公积金 30/360 按天计息 — 公积金贷款利率变更采用 30/360 天数计算，基于放款日拆分计息周期，与银行实际账单一致。

### 改进

* 自由还款利率变更后级联更新后续所有期的利息/本金/剩余，确保数据一致。
* 利率表数据源新增"公积金"选项，支持期限选择（5 年以上/以下）。
* 数据导入导出兼容新增的贷款类型和公积金利率表。

[2.1.0] - 2026-03-29
---

### 新功能

* [New] 利率表独立管理 — 利率表支持保存、加载、重命名、删除，独立于贷款方案。
* [New] 利率变更自动同步 — 利率变更操作自动将新利率写入自定义利率表。
* [New] 一键导入利率表 — 利率变更 tab 支持选择已保存的利率表，一键批量应用所有利率变更。
* [New] 数据导入导出 — 设置页支持导出/导入 JSON 文件，跨设备同步贷款方案和利率表数据。导出仅保存参数和变更记录，导入时自动重放计算。

### 性能优化

* [Perf] echarts 懒加载 — 将 echarts 从主包拆分为独立 chunk（React.lazy），主包体积从 1.67MB 降至 612KB，首屏加载大幅提升。

### 修复

* [Fix] 修复乱序变更导致后续变更失效 — applyChange 检测到乱序插入时自动全量重放，确保还款计划按时间先后正确计算。
* [Fix] 修复 Select 下拉选项文字重叠问题。
* [Fix] 统一提前还款变更方式的显示文案（trigger 与选项一致）。

### PWA 优化

* 优化 manifest.json — 新增 lang/dir/orientation/categories/display_override/launch_handler/shortcuts/screenshots。
* 新增 192x192 图标，拆分 512 的 any/maskable 为独立条目。
* workbox SW 输出改为 service-worker.js，修复系统安装提示识别问题。
* pwa-install 组件不再拦截 Chrome 原生安装提示。

[2.0.0] - 2026-03-29
---

### 全量重构

从 vanilla TypeScript 全量迁移到 React 19 + Shadcn/ui + Tailwind CSS 4 + Zustand 技术栈。
包管理从 npm 切换到 pnpm。

### 全新 UI

* Dashboard 风格布局，桌面端侧边导航 + 移动端底部 Tab。
* Shadcn/ui (Radix UI) 组件库，无障碍支持。
* 亮色/暗色/跟随系统三种主题模式。
* 响应式设计适配手机、平板、桌面。

### 新功能

* [New] 数据分析页面 — 还款概览环形图、变更前后对比线图、利息节省柱图、详细趋势图。
* [New] 贷款方案管理 — 支持保存、加载、重命名、删除多个贷款方案。
* [New] LPR 内置利率表 — 5 年期 LPR 历史数据（2019-08 至 2026-03），支持基点偏移自动计算。
* [New] 自定义利率表 — 通用利率时间线管理器，预留多数据源扩展。
* [New] 数据持久化 — localStorage 自动保存/恢复，刷新不丢失数据。
* [New] 还款计划虚拟滚动 — 360 期数据流畅滚动（@tanstack/react-virtual）。
* [New] 还款趋势面积图 — 本金/利息占比可视化，变更点竖线标注（ECharts）。
* [New] Excel 导出保留。

### 架构

* `core/` 纯计算逻辑与 UI 框架解耦，可跨平台复用。
* `features/` 按功能分区，模块化卡片设计，新增功能 = 新增目录。
* Zustand 状态管理替代事件订阅模型，persist 中间件对接 localStorage。
* StorageAdapter 接口抽象存储层，未来可替换为 IndexedDB 或云端同步。
* RateProvider 接口预留 LPR 等多数据源扩展。
* vite-plugin-pwa 自动 Service Worker 注册。

### 工程化

* pnpm 严格依赖模式。
* Vitest + @testing-library/react + jsdom 测试。
* CI 新增 PR check workflow（type-check + lint + test + build）。
* Biome 2 支持 JSX/TSX。

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
