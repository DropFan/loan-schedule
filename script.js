
const LoanMethodName = {
    "equal-principal-interest": "等额本息",
    "equal-principal": "等额本金",
    "interest-only": "先息后本 (仅付利息，到期还本)",
    "bullet-repayment": "一次性还本付息",
    "flexible-repayment": "灵活还款 (需满足每月最低还款额)",
};

// 初始化模拟的贷款还款计划
let _loanSchedule = [];

_loanSchedule.Clear = function () {
    this.length = 0;
    document.getElementById("schedule-table").innerHTML = ""; // 清空之前数据
}

// 变更列表，用于记录每次利率变更或提前还款等变更的贷款金额和月供变化
let _loanChangeList = [];

_loanChangeList.GetLastMonthlyPayment = function () {
    if (this.length === 0) {
        return 0;
    }

    return this[this.length - 1].monthlyPayment;
};

_loanChangeList.Clear = function () {
    this.length = 0;
    document.getElementById("loan-change-list").innerHTML = ""; // 清空之前数据
}

// 计算等额本息每月还款金额
function calculateEqualPrincipalInterest(loanAmount, loanTerm, interestRate) {
    // console.log(
    //     `计算等额本息每月还款金额: loanAmount = ${loanAmount}, loanTerm = ${loanTerm}, interestRate = ${interestRate}`
    // );

    // 等额本息月供 = [贷款本金 * 月利率 * (1 + 月利率)^还款期数] / [(1 + 月利率)^还款期数 - 1]
    const result =
        (loanAmount * (interestRate * Math.pow(1 + interestRate, loanTerm))) /
        (Math.pow(1 + interestRate, loanTerm) - 1);
    // console.log(`月还款金额: ${result}`);
    return result;
}

// 计算等额本金每月还款金额
function calculateEqualPrincipal(loanAmount, loanTerm, interestRate) {
    // console.log(
    //     `计算等额本金每月还款金额: loanAmount = ${loanAmount}, loanTerm = ${loanTerm}, interestRate = ${interestRate}`
    // );
    // 等额本金首次月供 = 贷款本金 / 还款期数 + 贷款本金 * 月利率
    const result = loanAmount / loanTerm + loanAmount * interestRate;
    // console.log(`月还款金额: ${result}`);
    return result;
}


// 生成还款计划表
function generateLoanSchedule(loanAmount, loanTerm, interestRate, startDate, loanMethod) {
    console.log(
        `生成还款计划:loanAmount = ${loanAmount}, loanTerm = ${loanTerm}, interestRate = ${interestRate},loanMethod=${loanMethod}, startDate = ${startDate}`
    );

    let schedule = [];
    let remainingLoan = 0;
    remainingLoan = loanAmount;
    let currentDate = new Date(startDate);

    for (let i = 1; i <= loanTerm; i++) {
        let monthlyPayment = 0, principal = 0, interest = 0;

        if (loanMethod === "equal-principal-interest") {
            monthlyPayment = calculateEqualPrincipalInterest(loanAmount, loanTerm, interestRate);
        } else if (loanMethod === "equal-principal") {
            monthlyPayment = calculateEqualPrincipal(loanAmount, loanTerm, interestRate);
        }
        interest = remainingLoan * interestRate;
        principal = monthlyPayment - interest;

        remainingLoan -= principal;

        currentDate.setMonth(currentDate.getMonth() + 1, 16); // 次月开始还款，移动到下个月

        schedule.push({
            period: i,
            paymentDate: currentDate.toISOString().split("T")[0], // 格式化为 YYYY-MM-DD
            monthlyPayment: monthlyPayment,
            principal: principal,
            interest: interest,
            remainingLoan: remainingLoan > 0 ? remainingLoan : 0,
            remainingTerm: loanTerm - i, // 剩余期数
            annualInterestRate: (interestRate * 12 * 100).toFixed(2), // 年化利率，以百分比显示
            loanMethod: LoanMethodName[loanMethod],
            comment: "",
        });
    }

    console.log("还款计划：", schedule);

    return schedule;
}

// 生成等额本息的还款计划
function generateEqualPrincipalInterestSchedule(
    loanAmount,
    loanTerm,
    interestRate,
    startDate
) {
    console.log(
        `生成等额本息还款计划: loanAmount = ${loanAmount}, loanTerm = ${loanTerm}, interestRate = ${interestRate}, startDate = ${startDate}`
    );
    let schedule = [];
    let remainingLoan = loanAmount;
    let currentDate = new Date(startDate);

    for (let i = 1; i <= loanTerm; i++) {
        let interest = remainingLoan * interestRate;
        let monthlyPayment = calculateEqualPrincipalInterest(
            loanAmount,
            loanTerm,
            interestRate
        );
        let principal = monthlyPayment - interest;
        remainingLoan -= principal;
        currentDate.setMonth(currentDate.getMonth() + 1, 15); // 移动到下一个月

        schedule.push({
            period: i,
            paymentDate: currentDate.toISOString().split("T")[0], // 格式化为 YYYY-MM-DD
            monthlyPayment: monthlyPayment,
            principal: principal,
            interest: interest,
            remainingLoan: remainingLoan > 0 ? remainingLoan : 0,
            remainingTerm: loanTerm - i, // 剩余期数
            annualInterestRate: (interestRate * 12 * 100).toFixed(2), // 年化利率，以百分比显示
            loanMethod: "等额本息",
            comment: "",
        });
    }

    console.log("等额本息还款计划:", schedule);

    return schedule;
}


// 生成等额本金的还款计划
function generateEqualPrincipalSchedule(
    loanAmount,
    loanTerm,
    interestRate,
    startDate
) {
    console.log(
        `生成等额本金还款计划: loanAmount = ${loanAmount}, loanTerm = ${loanTerm}, interestRate = ${interestRate}, startDate = ${startDate}`
    );
    let schedule = [];
    let remainingLoan = loanAmount;
    let currentDate = new Date(startDate);

    for (let i = 1; i <= loanTerm; i++) {
        let interest = remainingLoan * interestRate;
        let principal = loanAmount / loanTerm;
        remainingLoan -= principal;
        currentDate.setMonth(currentDate.getMonth() + 1, 15); // 移动到下一个月

        schedule.push({
            period: i,
            paymentDate: currentDate.toISOString().split("T")[0], // 格式化为 YYYY-MM-DD
            monthlyPayment: principal + interest,
            principal: principal,
            interest: interest,
            remainingLoan: remainingLoan > 0 ? remainingLoan : 0,
            remainingTerm: loanTerm - i, // 剩余期数
            annualInterestRate: (interestRate * 12 * 100).toFixed(2), // 年化利率，以百分比显示
            loanMethod: "等额本金",
            comment: "",
        });
    }

    console.log("等额本金还款计划:", schedule);

    return schedule;
}

// 获取当前贷款还款计划的已还期数和剩余贷款
function getRemainingSchedule(startDate) {
    if (_loanSchedule.length === 0) {
        console.log("loanSchedule 还款计划为空");
        return;
    }

    if (!startDate || startDate === "") {
        console.log("startDate 为空");
        return;
    }

    // const today = new Date();
    const currentIndex = _loanSchedule.findIndex((item) => {
        if (new Date(item.paymentDate) > startDate) {
            if (item.monthlyPayment > 0) {
                return true;
            }
        }
    });

    const paidPeriods =
        currentIndex === 0 ? 0 : _loanSchedule[currentIndex].period; // 如果当前日期之前没有支付过任何款项
    const remainingLoan = _loanSchedule[currentIndex - 1]
        ? _loanSchedule[currentIndex - 1].remainingLoan
        : _loanSchedule[_loanSchedule.length - 1].remainingLoan;
    const remainingTerm = _loanSchedule[currentIndex - 1]
        ? _loanSchedule[currentIndex - 1].remainingTerm
        : _loanSchedule[_loanSchedule.length - 1].remainingTerm;
    const annualInterestRate = _loanSchedule[currentIndex - 1]
        ? _loanSchedule[currentIndex - 1].annualInterestRate
        : _loanSchedule[_loanSchedule.length - 1].annualInterestRate;
    console.log(
        `当前已还期数：${paidPeriods}, 剩余贷款：${remainingLoan}, 剩余期数：${remainingTerm}，当前利率：${annualInterestRate}`
    );

    return {
        paidPeriods, // 已还期数
        remainingLoan, // 剩余贷款
        remainingTerm, // 剩余期数
        annualInterestRate: annualInterestRate, // 当前年化利率
    };
}
function refreshLoanChangeList(changeDetail) {
    const changeDate = new Date(changeDetail.date);
    const {
        loanAmount,
        remainingTerm,
        monthlyPayment,
        annualInterestRate,
        loanMethod,
        comment,
    } = changeDetail;
    _loanChangeList.push({
        date: changeDate,
        loanAmount,
        remainingTerm,
        monthlyPayment,
        annualInterestRate,
        loanMethod,
        comment,
    });
    const divLoanChangeList = document.getElementById("loan-change-list");
    // divLoanChangeList.innerHTML = ""; // 清空之前数据
    divLoanChangeList.innerHTML += `
        <p><span id="loan-change-date">
        ${changeDate.toISOString().split("T")[0]}</span> <span class="loan-change-comment">${comment}</span></p>
        <p class="loan-change-detail">每月还款金额： <span class="monthly-payment">${monthlyPayment.toFixed(2)}</span> 元 &nbsp;
        剩余贷款本金： <span class="remaining-loan">${loanAmount.toFixed(2)}</span> 元 &nbsp;
        剩余期数： <span class="remaining-term">${remainingTerm}</span> 月 &nbsp;
        还款方式：<span class="loan-method">${LoanMethodName[loanMethod]}</span> &nbsp;
        利率：<span class="interest-rate">${annualInterestRate}%</span></p>
`;
}
// 显示还款计划表
function refreshPaymentSchedule(schedule) {
    const tbody = document.querySelector("#schedule-table tbody");
    tbody.innerHTML = ""; // 清空之前的表格数据
    rows = [];
    schedule.forEach((item) => {
        rows.push(`<tr><td>${item.period}</td>
            <td>${item.paymentDate}</td>
            <td>${item.monthlyPayment.toFixed(2)}</td>
            <td>${item.principal.toFixed(2)}</td>
            <td>${item.interest.toFixed(2)}</td>
            <td>${item.remainingLoan.toFixed(2)}</td>
            <td>${item.remainingTerm}</td>
            <td>${item.annualInterestRate}%</td>
            <td>${item.loanMethod}</td>
            <td>${item.comment}</td></tr>`);
    });
    tbody.innerHTML = rows.join("");
}

function calculateLoan(loanAmount, loanTerm, interestRate, startDate, loanMethod) {
    let monthlyPayment=0, schedule=[];

    switch (loanMethod) {
        case "equal-principal-interest":
            monthlyPayment = calculateEqualPrincipalInterest(loanAmount, loanTerm, interestRate);
            break;
        case "equal-principal":
            monthlyPayment = calculateEqualPrincipal(loanAmount, loanTerm, interestRate);
            break;
    }
    schedule = generateLoanSchedule(loanAmount, loanTerm, interestRate, startDate, loanMethod);

    return {
        monthlyPayment,
        schedule,
    };
}

// 处理贷款表单提交
document
    .getElementById("loan-form")
    .addEventListener("submit", function (event) {
        event.preventDefault();

        const loanAmount = parseFloat(document.getElementById("loan-amount").value);
        const loanTerm = parseInt(document.getElementById("loan-term").value) * 12; // 将年转换为月
        const annualInterestRate = parseFloat(document.getElementById("interest-rate").value);
        const interestRate = annualInterestRate / 100 / 12; // 转换为月利率
        const loanMethod = document.getElementById("loan-method").value;
        const loanStartDate = new Date(document.getElementById("loan-start-date").value);

        console.log(
            `贷款金额：${loanAmount}, 贷款期数：${loanTerm}, 利率：${annualInterestRate}%, 还款方式：${loanMethod}, 贷款开始日期：${loanStartDate}`
        );

        result = calculateLoan(
            loanAmount,
            loanTerm,
            interestRate,
            loanStartDate,
            loanMethod
        );

        // 更新贷款计划
        _loanSchedule = result.schedule;

        _loanChangeList.Clear();

        refreshLoanChangeList({
            comment: "初始贷款",
            date: loanStartDate,
            loanAmount: loanAmount,
            monthlyPayment: result.monthlyPayment,
            annualInterestRate: annualInterestRate,
            loanMethod: loanMethod,
            remainingTerm: loanTerm,
        });

        refreshPaymentSchedule(result.schedule);
    });

// 处理利率变更
document
    .getElementById("update-interest-rate")
    .addEventListener("click", function () {

        const annualInterestRate = parseFloat(document.getElementById("new-interest-rate").value)
        const newInterestRate = annualInterestRate / 100 / 12; // 新的月利率

        const loanMethod = document.getElementById("loan-method").value;
        const interestChangeDate = new Date(document.getElementById("interest-change-date").value);

        const remainingSchedule = getRemainingSchedule(interestChangeDate); // 获取当前还款进度

        let remainingLoan = remainingSchedule.remainingLoan; // 变更后的剩余贷款
        let remainingTerm = remainingSchedule.remainingTerm; // loanTerm - remainingSchedule.paidPeriods; // 剩余期数

        console.log(`更新后的利率：${newInterestRate * 12 * 100}%`);
        console.log(`剩余贷款：${remainingLoan}, 剩余期数：${remainingTerm}`);

        // startDate = interestChangeDate.setMonth(interestChangeDate.getMonth() - 1); // 计算时日期前移一个月
        startDate = new Date(
            interestChangeDate.getFullYear(),
            interestChangeDate.getMonth() - 1,
            15
        );

        let { monthlyPayment, schedule } = calculateLoan(
            remainingLoan,
            remainingTerm,
            newInterestRate,
            startDate,
            loanMethod
        );

        // 保留之前的还款计划，并从变更日期开始更新
        schedule.map((item) => {
            item.period += remainingSchedule.paidPeriods - 1;
        });

        comment = "利率变更为 " + annualInterestRate.toFixed(2) + "%";
        // 计算原有月供
        // const oldMonthlyPayment = calculateEqualPrincipalInterest(remainingLoan, remainingTerm,
            // _loanSchedule[remainingSchedule.paidPeriods - 1].annualInterestRate / 100 / 12);
        const oldMonthlyPayment = _loanChangeList.GetLastMonthlyPayment()

        // 计算月供变化，并展示增加或减少
        if (oldMonthlyPayment < monthlyPayment) {
            comment += "，月供增加 " + (monthlyPayment - oldMonthlyPayment).toFixed(2) + " 元";
        } else if (oldMonthlyPayment > monthlyPayment) {
            comment += "，月供减少 " + (oldMonthlyPayment - monthlyPayment).toFixed(2) + " 元";
        } else {
            comment += "，月供不变";
        }

        schedule[0].comment =
            " " + interestChangeDate.toISOString().split("T")[0] + comment;

        // 将更新后的计划追加到原计划后面
        _loanSchedule = _loanSchedule
            .slice(0, remainingSchedule.paidPeriods - 1)
            .concat(schedule);

        refreshLoanChangeList({
            comment: comment,
            date: interestChangeDate,
            loanAmount: remainingLoan,
            monthlyPayment: monthlyPayment,
            annualInterestRate: annualInterestRate,
            loanMethod: loanMethod,
            remainingTerm: remainingTerm - 1,
        });
        refreshPaymentSchedule(_loanSchedule);
    });

// 处理提前还款
document.getElementById("prepay-loan").addEventListener("click", function () {
    const prepayAmount = parseFloat(document.getElementById("prepay-amount").value);
    const prepayDate = new Date(document.getElementById("prepay-date").value);
    const loanTerm = parseInt(document.getElementById("loan-term").value) * 12;
    const loanMethod = document.getElementById("loan-method").value;
    // const newInterestRate = parseFloat(document.getElementById("new-interest-rate").value) / 100 / 12; // 新的月利率
    const remainingSchedule = getRemainingSchedule(prepayDate); // 获取当前还款进度

    const annualInterestRate = _loanSchedule[remainingSchedule.paidPeriods].annualInterestRate;

    let interestRate = annualInterestRate / 100 / 12;
    let remainingLoan = remainingSchedule.remainingLoan - prepayAmount; // 提前还款后的剩余贷款
    let remainingTerm = loanTerm - remainingSchedule.paidPeriods; // 剩余期数

    // 利率还是用之前的
    interestRate = _loanSchedule[remainingSchedule.paidPeriods].annualInterestRate / 100 / 12;

    _loanSchedule[remainingSchedule.paidPeriods - 1].monthlyPayment +=
        prepayAmount;
    _loanSchedule[remainingSchedule.paidPeriods - 1].principal += prepayAmount;
    _loanSchedule[remainingSchedule.paidPeriods - 1].remainingLoan -=
        prepayAmount;

    remainingLoan = _loanSchedule[remainingSchedule.paidPeriods - 1].remainingLoan;

    // startDate = prepayDate.setMonth(prepayDate.getMonth() - 1); // 计算时日期前移一个月
    startDate = new Date(prepayDate.getFullYear(), prepayDate.getMonth(), 15);

    console.log(
        `提前还款金额: ${prepayAmount}, 剩余贷款: ${remainingLoan}, 剩余期数: ${remainingTerm}`
    );

    let { monthlyPayment, schedule } = calculateLoan(
        remainingLoan,
        remainingTerm,
        interestRate,
        startDate,
        loanMethod
    );

    // 保留之前的还款计划，并从提前还款日期开始更新
    schedule.map((item) => {
        item.period += remainingSchedule.paidPeriods;
    });

    comment = "提前还款 " + prepayAmount + " 元";
    // 计算原有月供
    const oldMonthlyPayment = _loanChangeList.GetLastMonthlyPayment()

    // 计算月供变化，并展示增加或减少
    if (oldMonthlyPayment < monthlyPayment) {
        comment += "，月供增加 " + (monthlyPayment - oldMonthlyPayment).toFixed(2) + "元";
    } else if (oldMonthlyPayment > monthlyPayment) {
        comment += "，月供减少 " + (oldMonthlyPayment - monthlyPayment).toFixed(2) + "元";
    } else {
        comment += "，月供不变";
    }

    _loanSchedule[remainingSchedule.paidPeriods - 1].comment =
        " " + prepayDate.toISOString().split("T")[0] + comment;

    // 将更新后的计划追加到原计划后面
    _loanSchedule = _loanSchedule
        .slice(0, remainingSchedule.paidPeriods)
        .concat(schedule);

    refreshLoanChangeList({
        comment: comment,
        date: prepayDate,
        loanAmount: remainingLoan,
        monthlyPayment: monthlyPayment,
        annualInterestRate: annualInterestRate,
        loanMethod: loanMethod,
        remainingTerm: remainingTerm,
    });

    refreshPaymentSchedule(_loanSchedule);
});

// 导出 Excel 文件
function exportToExcel(filename, rows = _loanSchedule, changeList = _loanChangeList) {
    const worksheetData = [
        ["期数", "还款日期", "月还款金额", "本金", "利息", "剩余本金", "剩余期数",
            "利率", "还款方式", "说明"],
        ...rows.map((row) => [
            row.period,
            row.paymentDate,
            row.monthlyPayment.toFixed(2),
            row.principal.toFixed(2),
            row.interest.toFixed(2),
            row.remainingLoan.toFixed(2),
            row.remainingTerm,
            row.annualInterestRate + "%",
            row.loanMethod,
            row.comment,
            "",
        ]),
    ];

    worksheetData.push(
        ["", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "变更列表", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", ""],
        ["变更日期", "月还款金额", "剩余本金", "剩余期数","利率", "还款方式", "说明"],
        ...changeList.map((row) => [
            row.date.toISOString().split("T")[0],
            row.monthlyPayment.toFixed(2),
            row.loanAmount.toFixed(2),
            row.remainingTerm,
            row.annualInterestRate + "%",
            LoanMethodName[row.loanMethod],
            row.comment,
        ])
    );

    rightContent = [
        [
            "", "", "", "", "",
            "", "", "", "", "",
            "由微信公众号  Hacking4fun 生成",
        ],
        ["", "", "", "", "", "", "", "", "", "", " "],
        [
            "", "", "", "", "",
            "", "", "", "", "",
            "贷款计算 & 还贷模拟器 可访问：",
        ],
        ["", "", "", "", "", "", "", "", "", "", "https://loan.v2dl.net/"],
        [
            "", "", "", "", "",
            "", "", "", "", "",
            "在这个文件里留公众号像极了早年互联网分享软件和资源的各种广告行为……",
        ],
        [
            "", "", "", "", "",
            "", "", "", "", "",
            "就当是古典互联网的文艺复兴吧",
        ],
        [
            "", "", "", "", "",
            "", "", "", "", "",
            "有任何问题可通过微信公众号 Hacking4fun 或 Github 与我交流",
        ],
    ];

    while (worksheetData.length < rightContent.length) {
        worksheetData.push(["", "", "", "", "", "", "", "", "", "", ""]);
    }

    // 将右侧内容合并到相应的单元格中
    rightContent.forEach((row, index) => {
        try {
            worksheetData[index] = worksheetData[index]
                .slice(0, 10)
                .concat(row[10]);
        } catch (error) {
            console.log(error);
            console.log("index: ", index);
            console.log("row: ", row);
        }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "还款计划表 - 由公众号 Hacking4fun 生成"
    );
    XLSX.writeFile(workbook, filename);
}

// 添加导出 Excel 按钮的事件监听
document.getElementById("export-excel").addEventListener("click", function () {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0"); // 月份从 0 开始，需要加 1，并填充前导零
    const date = String(today.getDate()).padStart(2, "0"); // 填充前导零
    const hours = String(today.getHours()).padStart(2, "0"); // 填充前导零
    const minutes = String(today.getMinutes()).padStart(2, "0"); // 填充前导零
    const seconds = String(today.getSeconds()).padStart(2, "0"); // 填充前导零

    const postfix = `由公众号_Hacking4un_生成于${year}${month}${date}_${hours}${minutes}${seconds}`;
    const filename = `还款计划表_${postfix}.xlsx`;

    exportToExcel(filename, _loanSchedule);
});
