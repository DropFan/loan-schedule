贷款计算器 - 还贷模拟器
===

<div class="app-desc" style="text-align:center">
    <a href="https://loan.v2dl.net" target="_blank"><img src="./logo-128.png" alt="贷款计算器&还贷模拟器 By Tiger https://github.com/DropFan" /></a>
    <p>一个功能强大的贷款计算器和还贷模拟器。</p>
    <p>特别支持存量房贷多次调整利率和提前还款的计算，模拟用户真实的还贷情况。</p>
    <p>并支持导出 Excel 表格，帮助用户轻松管理贷款计划。</p>
    <p>由 <a href="https://github.com/DropFan">Tiger</a> 开发并开源至<a href="https://github.com/DropFan/loan-schedule/">Github</a></p>
</div>

项目概述
---

本项目是一个贷款计算器的 Web 应用，支持用户根据贷款金额、期限、利率和还款方式，计算并显示月还款金额、剩余贷款金额和未来还款计划。

此外，不同于网上其他房贷计算器，我专门针对存量房贷开发了还贷模拟的特殊功能：可以多次调整利率或提前还款，模拟用户真实还款情况，并支持将数据导出到 Excel。

这也是我写这个程序的初衷，以前一直用表格来处理这个需求，但不方便给别人用。之前有人找我要表格还得传文件，干脆以后写个程序部署到网上，也方便大家使用，正好最近我闲来有心情于是就有了这个。

经过测试，按照时间先后多次操作调整利率和提前还款的计算结果与我之前用 numbers/excel 的数据一致。但每次变动时由于银行按天计算产生的利息差不在本应用考虑范围，此误差仅影响变动当月利息与真实情况有差异，不影响后续其他计算。

纯原生 HTML/Javascript/CSS 代码，直接浏览器运行，不依赖任何框架，仅 excel 导出功能引用了一个第三方类库。
**未添加任何参数验证和错误处理，大家不用测试异常数据了～**

更新记录
---

点击查看[更新记录](https://github.com/DropFan/loan-calculator/blob/main/CHANGELOG.md)

使用方法
---

1. 打开浏览器，~~访问项目的根目录下的`index.html`文件。如果需要在手机上访问，在项目根目录执行`npm run dev` 启动本地 http server，就可以访问了~~  直接访问[这个地址](https://loan.v2dl.net/)就行。
2. 根据页面提示填写贷款相关信息并进行计算。
3. 如需调整利率或提前还款，使用相应功能模块进行操作。
4. 若要导出还款计划表为 Excel 文件，点击“导出为 Excel”按钮。

注意事项
---

- 生成还贷计划后，可按照时间先后顺序多次操作利率变更和提前还款。
- 本计算器按月计算，确保月份填写正确。
- 日期中的天数不重要，但请尽量选择合理的日期以保证计算准确性。
- 每次变更操作（如调整利率或提前还款）会刷新指定日期之后的所有数据。
- 变更操作当月生效，如当月数据与银行不一致，因变更当月银行是按天计算利息，属于正常误差，仅影响当月利息，不影响其他计算。
- 如可能导致数据异常的情况，比如一个月内多次变更利率/提前还款，由于现实里不存在这种情况，本程序暂不做兼容支持。
- 如发现与实际不一致或因日期选错导致数据异常，可在上方重新生成还款计划表再次操作。
- **所有代码在浏览器本地运行，不用担心数据泄露，请放心使用。**
- **未添加任何参数验证和错误处理，大家不用测试异常数据了～**

## 功能描述

### 1. 基本贷款计算

用户可以通过填写以下信息来计算贷款：

- **贷款金额**：输入贷款本金（元）。
- **贷款期限**：选择贷款年限。
- **年利率**：输入年利率（%）。
- **还贷方式**：选择“等额本息”或“等额本金”。
- **贷款开始日期**：选择贷款开始的具体日期，次月开始还月供。

点击“计算”按钮后，页面会显示每月还款金额和剩余贷款详情，并生成详细的还款计划表。

### 2. 还款计划表

还款计划表展示了每期的还款详情，包括：

- 期数
- 还款日期
- 月还款金额
- 本金
- 利息
- 剩余本金
- 剩余期数
- 年利率
- 还款方式
- 备注说明

每次变更时会刷新指定日期之后的所有数据。全表可导出为 Excel 文件。

### 3. 调整利率

用户可以在贷款期间调整年利率：

- 输入新的年利率。
- 选择利率变更日期，选定日期之后的还贷计划会按照新利率重新计算。
- 点击“更新利率”按钮后，程序会根据新的利率重新计算从变更日期起的还款计划。

### 4. 提前还款

用户可以选择在某个日期提前还款：

- 输入提前还款金额。
- 选择提前还款日期，选定日期之后的还贷计划会按照剩余本金重新计算。
- 点击“提前还款”按钮后，程序会根据提前还款后的剩余贷款重新计算还款日期之后的还款计划。

### 5. 导出为 Excel

还贷计划表和变更操作记录可以导出为 Excel 文件，方便保存和打印。
用户点击导出按钮即可下载 Excel 文件到本地，

---

本文部分内容是 AI 生成的，开发者指南这部分感觉说了跟没说一样。。。

## 开发者指南

- **运行**：使用浏览器打开`index.html`文件即可运行。
- **调试**：可以在`script.js`中添加`console.log`语句来调试代码。
- **扩展**：可以进一步扩展功能，例如增加更多类型的还款方式或优化用户体验。

### 文件结构

- `index.html`：HTML 页面文件，包含页面结构，表单和展示内容。
- `style.css`：CSS 样式文件，用于页面布局和美化。
- `script.js`：JavaScript 脚本文件，实现贷款计算逻辑和交互功能。

### 技术栈

- **HTML5**：构建页面结构和内容。
- **CSS3**：负责页面样式和布局。
- **JavaScript**：实现业务逻辑和交互功能。

## 版权声明

本项目由 [Tiger](https://github.com/DropFan) 开发，仅供学习和参考使用。
未经许可，不得用于商业用途。

如果有任何疑问或建议，请随时联系作者本人，或提交反馈到[本项目 ISSUES](https://github.com/DropFan/loan-schedule/issues)
