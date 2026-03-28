# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个贷款计算器和还贷模拟器的 Web 应用，支持存量房贷的利率调整和提前还款计算。基于 TypeScript + Vite 构建，无框架依赖。

线上地址：https://loan.v2dl.net

## 开发命令

```bash
npm run dev          # 启动本地开发服务器
npm run type-check   # TypeScript 类型检查
npm run build        # 生产构建
npm run preview      # 预览构建结果
npm run lint         # Biome 检查（lint + format + import 排序）
npm run lint:fix     # 自动修复可安全修复的问题
npm run format       # 仅格式化
```

## 部署

通过 GitHub Actions 自动部署到 GitHub Pages，触发条件为 push 到 master 分支。部署配置在 `.github/workflows/static.yml`，执行 `npm ci && npm run build` 后上传 `dist/` 目录。

## 架构

```
src/
├── main.ts                    # 应用入口，组件实例化与事件连接
├── vite-env.d.ts              # Vite 客户端类型声明（TS6+ 必需）
├── types/
│   └── loan.types.ts          # TypeScript 类型/接口/枚举定义
├── models/
│   └── LoanSchedule.ts        # 数据模型：状态管理 + 发布订阅
├── services/
│   ├── LoanCalculator.ts      # 纯计算函数（零副作用）
│   └── ExcelExporter.ts       # Excel 导出（动态 import xlsx）
├── components/
│   ├── BaseComponent.ts       # 组件基类
│   ├── LoanForm.ts            # 贷款表单 + 变更表单
│   ├── ScheduleTable.ts       # 还款计划表格
│   └── ChangePanel.ts         # 变更记录列表展示
├── utils/
│   ├── formatHelper.ts        # 金额/日期/利率格式化 + roundTo2
│   └── validator.ts           # 输入验证
├── constants/
│   └── app.constants.ts       # 应用常量
└── styles/
    ├── variables.css           # CSS 变量
    ├── main.css                # 全局样式入口
    └── components/
        ├── form.css
        ├── table.css
        └── button.css
```

### 数据流

```
用户输入 → LoanForm 组件 → main.ts 回调 → LoanSchedule 模型
    → LoanCalculator 计算 → 事件通知 → ScheduleTable/ChangePanel 更新 DOM
```

### 核心设计

- **LoanSchedule 模型**: 管理还款计划和变更记录状态，通过 `on(event, callback)` 发布订阅通知 UI
- **applyChange()**: 统一处理利率变更和提前还款，通过 `ChangeType` 区分
- **LoanCalculator**: 纯计算函数，无副作用，所有金额使用 `roundTo2()` 控制精度
- **组件层**: BaseComponent 提供容器内查询和事件绑定，各组件只负责 DOM 渲染

### 计算逻辑要点

- 按月计算，不考虑具体天数
- 使用 `addMonths()` 替代 `setMonth()` 避免日期溢出
- 等额本金每期重新计算月供（固定本金 + 当期利息）
- `findRemainingInfo()` 返回 `null` 替代越界访问
- 变更操作当月生效，当月利息与银行可能有差异（银行按天计算）

## 代码规范

- 使用 Biome 统一 lint + format，配置在 `biome.json`（2 空格缩进、单引号、自动 import 排序）
- 修改代码后运行 `npm run lint` 验证，提交前确保零错误
- 无测试框架，修改后通过 `npm run type-check` 和 `npm run build` 验证正确性

## 注意事项

- xlsx 通过 npm 安装，动态 `import()` 按需加载（xlsx 0.18.5 有已知漏洞但无修复版，仅用于导出，风险可控）
- 静态资源（logo、favicon、manifest、service-worker）在 `public/` 目录
- `LoanMethod` 枚举替代字符串字面量
- CSS 使用变量统一管理颜色和间距，支持响应式布局
