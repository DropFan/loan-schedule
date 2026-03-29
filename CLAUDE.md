# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个贷款计算器和还贷模拟器的 Web 应用，支持商业贷款和公积金贷款，包含利率调整、提前还款和自由还款计算。基于 React + TypeScript + Vite + Zustand 构建，使用 Tailwind CSS + Base UI 组件库。

线上地址：https://loan.v2dl.net

## 开发命令

```bash
pnpm dev             # 启动本地开发服务器
pnpm type-check      # TypeScript 类型检查
pnpm build           # 生产构建
pnpm preview         # 预览构建结果
pnpm lint            # Biome 检查（lint + format + import 排序）
pnpm lint:fix        # 自动修复可安全修复的问题
pnpm format          # 仅格式化
```

## 部署

通过 GitHub Actions 自动部署到 GitHub Pages，触发条件为 push 到 master 分支。部署配置在 `.github/workflows/static.yml`，执行 `pnpm install && pnpm build` 后上传 `dist/` 目录。

## 架构

```
src/
├── main.tsx                       # 应用入口
├── app/
│   ├── App.tsx                    # 根组件（Providers + PWA Install）
│   ├── routes.tsx                 # 路由定义（AnalysisPage 懒加载）
│   └── providers.tsx              # Context providers
├── core/
│   ├── types/loan.types.ts        # TypeScript 类型/接口/枚举定义
│   ├── calculator/LoanCalculator.ts  # 纯计算函数（零副作用）
│   └── utils/
│       ├── formatHelper.ts        # 金额/日期/利率格式化
│       └── validator.ts           # 输入验证
├── stores/
│   └── useLoanStore.ts            # Zustand 状态管理 + localStorage 持久化
├── features/
│   ├── calculator/                # 贷款计算页（表单、汇总、还款表）
│   ├── changes/                   # 变更操作（利率变更、提前还款、调整月供、利率表导入）
│   ├── charts/                    # 数据分析页（echarts 懒加载）
│   ├── rate-table/                # 利率表管理（自定义/LPR+基点/公积金、保存/加载）
│   └── settings/                  # 设置页
├── components/
│   ├── ui/                        # Base UI 封装组件
│   ├── shared/LoanSwitcher.tsx    # 多方案切换器
│   └── layout/                    # AppShell、Sidebar、BottomTabs
├── constants/app.constants.ts     # 应用常量
└── styles/globals.css             # Tailwind 全局样式
```

### 数据流

```
用户输入 → LoanForm → useLoanStore.initialize() → LoanCalculator 计算
    → Zustand 状态更新 → React 组件自动响应渲染
变更操作 → useLoanStore.applyChange() → 重算还款计划 → 同步利率表
```

### 核心设计

- **useLoanStore**: Zustand store，管理贷款参数、还款计划、变更记录、利率表、多方案/多利率表。通过 `persist` 中间件持久化到 localStorage
- **applyChange()**: 统一处理利率变更、提前还款和月供调整，支持乱序插入（自动全量重放）。每条变更保存原始 `changeParams` 用于重放
- **LoanCalculator**: 纯计算函数，无副作用，所有金额使用 `roundTo2()` 控制精度
- **贷款类型**: `LoanType` 区分商业贷款（Commercial）和公积金贷款（ProvidentFund），影响利率变更时的计息方式
- **多方案管理**: `SavedLoan` 支持保存/加载/重命名/删除，`LoanSwitcher` 组件提供 UI
- **利率表管理**: `SavedRateTable` 独立于方案管理，支持自定义、LPR+基点和公积金三种数据源，利率变更自动同步
- **echarts 懒加载**: 通过 `React.lazy` 将 echarts（~1MB）拆分为独立 chunk，首屏不加载

### 还款方式

- **等额本息**: 每月还款额固定，由公式精确计算
- **等额本金**: 每期本金固定，月供逐月递减
- **自由还款**: 用户设定固定月供（不低于建议最低还款额），先扣利息后冲本金，最后一期还清剩余。自由还款模式下变更操作为"调整月供"替代"提前还款"

### 计算逻辑要点

- 商业贷款按月计算，利率变更时按天计算息差（基于还款日）
- 公积金贷款利率变更采用 30/360 按天计息（基于放款日）：`calc30360Days()` / `calcGjjInterestSplit()` 计算计息周期内的天数拆分
- 自由还款利率变更后级联更新后续所有期的利息/本金/剩余
- 使用 `addMonths()` 替代 `setMonth()` 避免日期溢出
- 等额本金每期重新计算月供（固定本金 + 当期利息）
- `findRemainingInfo()` 返回 `null` 替代越界访问
- 变更操作当月生效，乱序变更时自动收集所有 `changeParams` 按时间重放

## 代码规范

- 使用 Biome 统一 lint + format，配置在 `biome.json`（2 空格缩进、单引号、自动 import 排序）
- 修改代码后运行 `pnpm lint` 验证，提交前确保零错误
- 修改后通过 `pnpm type-check` 和 `pnpm build` 验证正确性

## 注意事项

- 包管理使用 **pnpm**，不使用 npm
- xlsx 通过 pnpm 安装，动态 `import()` 按需加载（xlsx 0.18.5 有已知漏洞但无修复版，仅用于导出，风险可控）
- echarts 通过 `React.lazy` 懒加载，在 `echarts-setup.ts` 中按需注册模块
- 静态资源（logo、favicon、manifest、screenshots）在 `public/` 目录
- PWA: vite-plugin-pwa 生成 `service-worker.js`（workbox precache），`@khmyznikov/pwa-install` 处理 Safari 安装引导
- `LoanType`、`LoanMethod` 枚举替代字符串字面量
- CSS 使用 Tailwind CSS，支持亮色/暗色主题切换
