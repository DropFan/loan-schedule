# UI 重构设计文档

> 贷款计算器 & 还贷模拟器 — 从 vanilla TypeScript 迁移到 React + Shadcn/ui

## 1. 背景与目标

### 现状问题
- 纯文本单页布局，UI 简陋，用户体验差
- vanilla TypeScript 组件通过手动 DOM 操作和事件订阅通信，迭代成本高
- 无数据可视化，用户难以直观理解利率变更/提前还款的影响
- 无数据持久化，刷新即丢失

### 重构目标
1. **全量迁移到 React**，提升开发效率和可维护性
2. **全新 UI 设计**，Dashboard + 模块化卡片布局，接近原生 App 体验
3. **响应式设计**，桌面端侧边导航 + 移动端底部 Tab
4. **数据持久化**，localStorage 起步，存储层可替换
5. **数据可视化**，还款趋势图（MVP），完整分析页面（后续迭代）
6. **自定义利率表**，通用利率时间线，预留 LPR 扩展
7. **PWA 离线支持**，保持现有能力

### 未来方向（本次设计需预留）
- App 化（React Native / Capacitor）
- 多贷款叠加展示（组合贷）
- LPR 动态利率
- 云端同步

## 2. 技术栈

### 框架与核心依赖

| 类别 | 选型 | 说明 |
|------|------|------|
| 包管理 | pnpm | 严格依赖，磁盘效率高，monorepo 就绪 |
| 构建 | Vite 8 + @vitejs/plugin-react | 保留现有构建工具 |
| 语言 | TypeScript 6 | 保留 |
| UI 框架 | React 19 | 生态最大，App 化路径最成熟 |
| 路由 | React Router 7 | 页面导航 |
| 状态管理 | Zustand | 轻量，内置 persist 中间件 |
| 样式 | Tailwind CSS 4 | 原子化 CSS |
| UI 组件 | Shadcn/ui (Radix UI) | 可定制组件，内置无障碍 |
| 图表 | ECharts (按需引入) | 功能最全，中文文档好，移动端手势支持 |
| 虚拟滚动 | @tanstack/react-virtual | 还款计划表性能 |
| PWA | vite-plugin-pwa | Service Worker 生成 |
| lint/format | Biome 2 | 保留，已支持 JSX/TSX |
| 测试 | Vitest + @testing-library/react + jsdom | 组件测试用 RTL |

### 复用资产（零改动）

| 文件 | 说明 |
|------|------|
| `types/loan.types.ts` | 所有类型定义 |
| `services/LoanCalculator.ts` | 纯计算函数 |
| `utils/formatHelper.ts` | 格式化工具 |
| `utils/validator.ts` | 输入验证 |
| `services/ExcelExporter.ts` | Excel 导出 |
| 计算层测试用例 | 直接复用 |

### 移除

| 文件 | 原因 |
|------|------|
| `components/BaseComponent.ts` | React 替代 |
| `models/LoanSchedule.ts` 事件系统 | Zustand 替代 |
| `happy-dom` | 替换为 jsdom |

## 3. 项目结构

```
src/
├── app/
│   ├── App.tsx                    # 根组件，路由 + 布局
│   ├── routes.tsx                 # 路由配置
│   └── providers.tsx              # Context providers 组合
├── components/
│   ├── ui/                        # shadcn/ui 组件（Button, Input, Card, Sheet 等）
│   ├── layout/
│   │   ├── Sidebar.tsx            # 桌面端侧边导航
│   │   ├── BottomTabs.tsx         # 移动端底部 Tab
│   │   └── AppShell.tsx           # 响应式布局壳（自动切换 Sidebar/BottomTabs）
│   └── shared/                    # 业务通用组件（CurrencyInput, DatePicker 等）
├── features/
│   ├── calculator/                # 贷款计算模块
│   │   ├── components/            # LoanForm, SummaryCards, ScheduleTable
│   │   ├── hooks/                 # useLoanCalculation, useSchedule
│   │   └── index.ts
│   ├── changes/                   # 变更操作模块（利率变更、提前还款）
│   ├── rate-table/                # 利率表模块
│   ├── charts/                    # 数据可视化模块（分期实现）
│   └── settings/                  # 设置模块（导出、数据管理、关于）
├── core/
│   ├── calculator/                # ← 复用 LoanCalculator.ts
│   ├── types/                     # ← 复用 loan.types.ts
│   └── utils/                     # ← 复用 formatHelper.ts, validator.ts
├── stores/
│   ├── useLoanStore.ts            # Zustand store
│   └── storage-adapter.ts         # 存储适配器接口
└── styles/
    └── globals.css                # Tailwind 入口 + CSS 变量
```

**设计原则：**
- `features/` 按功能分区，每个 feature 是独立单元，新增功能 = 新增目录
- `core/` 放纯逻辑，与 UI 框架无关，可跨平台复用
- `stores/` 集中状态管理，通过适配器抽象存储层

## 4. 导航与布局

### 响应式策略

| 断点 | 宽度 | 布局 | 导航 |
|------|------|------|------|
| 默认 | `< 768px` | 单列全宽 | BottomTabs |
| `md` | `≥ 768px` | 单列加宽 | BottomTabs |
| `lg` | `≥ 1024px` | 双列网格 + 侧边导航 | Sidebar |

### 导航项

| 图标 | 标签 | 路由 | 说明 |
|------|------|------|------|
| 🧮 | 贷款计算 | `/` | 主页面 |
| 📈 | 数据分析 | `/analysis` | 图表可视化（分期实现） |
| 📋 | 利率表 | `/rates` | 利率时间线管理 |
| ⚙️ | 设置 | `/settings` | 导出、数据管理、关于 |

### Sidebar（桌面端）
- 默认展开 200px（图标+文字），可折叠为 48px（纯图标）
- 折叠状态持久化到 localStorage
- 底部显示版本号

### BottomTabs（移动端）
- 固定底部，4 个等宽 Tab
- 当前激活项高亮
- iOS safe-area-inset-bottom 适配

### 页面切换
- 路由切换无动画（工具型应用，速度优先）
- 每个页面滚动位置独立保持

## 5. 贷款计算主页面（`/`）

### 桌面端布局（2 列网格）

```
┌─────────────────────┬──────────────────────┐
│   贷款参数卡片       │   还款概览卡片        │
│   (表单输入)         │   (摘要数字 + 迷你图) │
├─────────────────────┼──────────────────────┤
│   变更操作卡片       │   还款计划表卡片      │
│   (利率变更/提前还款) │   (虚拟滚动表格)     │
│                     │                      │
│   变更记录          │                      │
│   (时间线展示)       │                      │
└─────────────────────┴──────────────────────┘
```

- 左列 = 输入区（贷款参数 + 变更操作 + 变更记录）
- 右列 = 输出区（还款概览 + 还款计划表）
- 左右两列独立滚动，输入和结果始终同屏可见
- 移动端：单列纵向堆叠

### 贷款参数卡片
- 字段：贷款金额、贷款期限（年）、年利率（%）、还贷方式（下拉）、起始日期
- 底部主按钮"计算还款计划"
- 计算后表单保持可编辑，修改参数后按钮变为"重新计算"
- 如已关联利率表，利率字段旁提示"已关联利率表，将自动应用利率变更"

### 还款概览卡片
- 计算前：空状态提示
- 计算后：3 个指标横排 — 月供金额、还款总额、利息总额
- 下方：还款趋势面积图（本金/利息占比，变更点竖线标注）

### 变更操作卡片
- 计算前不渲染
- 内部 Tab 切换：利率变更 | 提前还款
  - 利率变更：新利率 + 生效日期 + 确认按钮
  - 提前还款：还款金额 + 还款日期 + 变更方式（减少月供/缩短年限）+ 确认按钮
- 底部"撤销上一步变更"按钮

### 变更记录
- 无变更时不渲染
- 时间线样式：日期 + 变更类型标签 + 详情（月供、剩余贷款、期数、利率）
- 最新变更在最上面

### 还款计划表卡片
- 列：期数、还款日期、月供、本金、利息、剩余贷款、利率、备注
- 虚拟滚动（@tanstack/react-virtual），360 行无性能问题
- 表头 sticky 固定
- 标题栏右侧"导出 Excel"按钮
- 变更行背景色高亮
- 移动端：横向可滑动，期数/月供/剩余贷款固定左侧

## 6. 利率表页面（`/rates`）

### 功能
- 通用"利率时间线"管理器
- 列表按日期升序，第一条为贷款初始利率（自动同步，不可删除）
- 添加/编辑：输入生效日期 + 新利率（Dialog 或 inline 编辑）
- 保存后自动触发还款计划重新计算

### 利率表与手动变更的关系
- 利率表是"预设的利率时间线"，手动利率变更是"一次性操作"
- 两者独立存储，计算时合并为统一的利率时间线
- **冲突优先级：** 手动变更 > 利率表。如果同一日期同时存在利率表条目和手动变更，以手动变更为准
- 利率表页面中，被手动变更覆盖的条目会标注提示

### 类型定义

```typescript
interface RateEntry {
  date: string;          // YYYY-MM-DD，生效日期
  annualRate: number;    // 年利率（%）
  source: 'custom' | 'lpr' | string;  // 数据来源
}
```

### LPR 预留接口

```typescript
interface RateProvider {
  type: 'custom' | 'lpr' | string;
  getRate(date: Date): number;
  getRateTimeline(): RateEntry[];
}
```

- 当前只实现 `CustomRateProvider`
- 未来加 LPR：新增 `LprRateProvider`（内置数据 + 基点偏移），页面加数据源切换下拉
- 计算层只调用 `RateProvider.getRateTimeline()`，对数据源无感知

## 7. 数据可视化（分期实现）

### 第一期（MVP）
- 还款趋势面积图，放在还款概览卡片内
- 月供中本金和利息占比随时间变化，双色面积堆叠
- 变更点竖线标注
- ECharts 按需引入：LineChart + CanvasRenderer

### 第二期（`/analysis` 路由）
- 还款概览仪表盘（环形图）
- 变更前后对比（双线叠加，虚线 vs 实线）
- 利息节省计算（柱状图）
- 未来：多贷款叠加展示

### ECharts 集成
- 按需引入，MVP 只打包用到的图表类型
- 每个图表独立 React 组件
- 响应式 resize（监听容器宽度）
- 移动端 dataZoom 手势缩放

## 8. 状态管理与数据持久化

### Zustand Store

```typescript
interface LoanState {
  params: LoanParameters | null;
  schedule: PaymentScheduleItem[];
  changes: LoanChangeRecord[];
  rateTable: RateEntry[];
  history: LoanSnapshot[];

  initialize(params: LoanParameters): void;
  applyChange(change: ChangeParams): void;
  undo(): void;
  clear(): void;
  updateRateTable(entries: RateEntry[]): void;
}
```

### 存储适配器

```typescript
interface StorageAdapter {
  save(key: string, data: unknown): void;
  load<T>(key: string): T | null;
  remove(key: string): void;
  clear(): void;
}
```

- 初期实现 `LocalStorageAdapter`
- 未来可替换为 `IndexedDBAdapter` 或 `CloudSyncAdapter`
- 通过 Zustand persist 中间件对接

### 持久化策略
- 存储 key：`loan-app-state`
- 自动保存：state 变化即写入
- 启动恢复：应用加载时自动恢复
- 版本迁移：数据带 version 字段，结构变更通过 migrate 函数处理
- 设置页提供"清除所有数据"功能

## 9. PWA 与移动端适配

### PWA
- 使用 `vite-plugin-pwa` 处理 SW 生成和缓存
- 离线完全可用（计算逻辑全在客户端，数据在 localStorage）
- 保持现有 manifest 配置（图标、主题色等）

### 移动端特殊处理
- 表格横向可滑动，关键列固定左侧
- 金额/利率字段 `inputmode="decimal"`，日期用原生 date picker
- 底部 Tab 适配 iOS safe area
- 图表触控手势支持

### 主题
- 初期只做亮色主题
- CSS 变量预留暗色切换能力（Shadcn/ui 自带亮/暗主题变量）

## 10. 构建与部署

### 开发命令

```bash
pnpm dev             # Vite dev server
pnpm build           # 生产构建
pnpm type-check      # TypeScript 类型检查
pnpm lint            # Biome 检查
pnpm lint:fix        # 自动修复
pnpm test            # Vitest
```

### CI/CD 调整
- `.github/workflows/static.yml` 中 `npm ci` → `pnpm install --frozen-lockfile`
- 增加 pnpm 安装步骤
- 其余流程（build → upload dist/）不变

### 包管理配置
- `.npmrc`：`shamefully-hoist=false`（严格依赖模式）
- `package-lock.json` → `pnpm-lock.yaml`

## 11. MVP 范围

### 必须交付
- [ ] React 项目结构搭建 + 工具链配置
- [ ] AppShell 响应式布局（Sidebar + BottomTabs）
- [ ] 贷款计算主页面（表单 + 概览 + 变更 + 计划表）
- [ ] 虚拟滚动表格
- [ ] 自定义利率表页面
- [ ] RateProvider 接口（CustomRateProvider 实现）
- [ ] Zustand store + localStorage 持久化
- [ ] 还款趋势面积图（第一期可视化）
- [ ] Excel 导出
- [ ] PWA / 离线支持
- [ ] 设置页（数据管理、关于）
- [ ] 响应式适配（手机、平板、桌面）

### 后续迭代
- [ ] 数据分析页面（/analysis）完整可视化
- [ ] 变更前后对比图表
- [ ] LPR 内置数据 + LprRateProvider
- [ ] 暗色主题
- [ ] 多贷款叠加展示
- [ ] 云端同步
