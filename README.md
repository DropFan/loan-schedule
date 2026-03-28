贷款计算器 - 还贷模拟器
===

<div class="app-desc" style="text-align:center" align="center">
    <a href="https://loan.v2dl.net/?from=github-readme" target="_blank"><img src="./public/logo-128.png" alt="贷款计算器&还贷模拟器 By Tiger https://github.com/DropFan" /></a>
    <h1>贷款计算&还贷模拟器</h1>
    <p>一个功能强大的贷款计算器和还贷模拟器。</p>
    <p>特别支持存量房贷多次调整利率和提前还款的计算，模拟用户真实的还贷情况。</p>
    <p>并支持导出 Excel 表格，帮助用户轻松管理贷款计划。</p>
    <p>由 <a href="https://github.com/DropFan">Tiger</a> 开发并开源至 <a href="https://github.com/DropFan/loan-schedule/">Github</a></p>
</div>

## 项目概述

本项目是一个贷款计算器的 Web 应用，支持用户根据贷款金额、期限、利率和还款方式，计算并显示月还款金额、剩余贷款金额和未来还款计划。

不同于网上其他房贷计算器，本项目专门针对存量房贷开发了还贷模拟功能：可以多次调整利率或提前还款，模拟用户真实还款情况，并支持将数据导出到 Excel。

这也是我写这个程序的初衷，以前一直用表格来处理这个需求，但不方便给别人用。之前有人找我要表格还得传文件，干脆写个程序部署到网上，方便大家使用。

经过测试，按照时间先后多次操作调整利率和提前还款的计算结果与我之前用 Numbers/Excel 的数据一致。变更当月由于银行按天计算利息，与按月计算会有微小差异，仅影响变动当月，不影响后续计算。

**所有代码在浏览器本地运行，不用担心数据泄露，请放心使用。**

## 在线使用

直接访问 **[loan.v2dl.net](https://loan.v2dl.net/?from=github-readme)** 即可使用，支持 PWA，可添加到手机/电脑桌面。

## 功能特性

- **贷款计算** - 支持等额本息和等额本金两种还款方式
- **利率变更** - 模拟存量房贷利率调整，变更日期后的还款计划自动重算
- **提前还款** - 模拟提前还本金，剩余还款计划自动重算
- **按天计息** - 变更当月支持按天计算利息差额
- **撤销操作** - 支持撤销最近一次变更操作
- **Excel 导出** - 还款计划表和变更记录一键导出为 Excel 文件
- **输入验证** - 完整的表单验证，防止异常输入
- **PWA 支持** - 可安装到桌面，离线可用

## 注意事项

- 生成还贷计划后，可按照时间先后顺序多次操作利率变更和提前还款。
- 本计算器按月计算，确保月份填写正确。
- 每次变更操作会刷新指定日期之后的所有数据。
- 变更操作当月生效，如当月数据与银行不一致，因变更当月银行按天计算利息，属于正常误差，仅影响当月。
- 一个月内不支持多次变更利率/提前还款，现实中通常也不存在此情况。
- 如发现数据异常，可重新生成还款计划表再次操作。

## 技术栈

- **TypeScript** + **Vite** - 类型安全的现代构建
- **Biome** - 统一代码检查与格式化
- **Vitest** + **happy-dom** - 单元测试，100% 覆盖率
- **GitHub Actions** - CI/CD 自动部署到 GitHub Pages
- 无框架依赖，原生 DOM 操作

## 项目结构

```
src/
├── main.ts                    # 应用入口，组件实例化与事件连接
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
│   ├── formatHelper.ts        # 金额/日期/利率格式化
│   └── validator.ts           # 输入验证
├── constants/
│   └── app.constants.ts       # 应用常量
└── styles/                    # CSS 变量 + 组件样式
```

### 数据流

```
用户输入 → LoanForm → main.ts 回调 → LoanSchedule 模型
    → LoanCalculator 计算 → 事件通知 → ScheduleTable / ChangePanel 更新 DOM
```

## 开发指南

### 环境要求

- Node.js >= 22
- npm

### 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run preview      # 预览构建结果
npm run type-check   # TypeScript 类型检查
npm run lint         # Biome 代码检查
npm run lint:fix     # 自动修复
npm run test         # 运行测试
npm run test:coverage # 运行测试并生成覆盖率报告
```

### 部署

通过 GitHub Actions 自动部署到 GitHub Pages。push 到 master 分支后自动执行类型检查、lint 和构建，然后部署到 [loan.v2dl.net](https://loan.v2dl.net)。

## 更新记录

* **0.7.0** (2026-03-29) — 迁移 TypeScript + Vite 架构；新增按天计息、撤销、输入验证
* **0.6.1** (2025-01-13) — 首页显示版本号
* **0.6** (2025-01-13) — 新增变更记录展示与导出
* **0.5** (2025-01-13) — 新增变更记录展示，优化页面布局
* **0.4** (2025-01-12) — PWA 支持
* **0.3** (2025-01-12) — 部署 GitHub Pages，绑定域名
* **0.2** (2025-01-11) — 新增 Excel 导出
* **0.1** (2025-01-11) — 初版发布

完整记录见 [CHANGELOG.md](./CHANGELOG.md)

## License

[CC BY-NC-SA 4.0](./LICENSE) - 由 [Tiger](https://github.com/DropFan) 开发

本项目禁止商业用途。个人学习、修改和分享需署名，且衍生作品须采用相同协议。

如有疑问或建议，欢迎提交 [Issue](https://github.com/DropFan/loan-schedule/issues)
