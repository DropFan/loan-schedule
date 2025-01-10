// 初始化模拟的贷款还款计划（用于测试）
let loanSchedule = [];

// 计算等额本息每月还款金额
function calculateEqualPrincipalInterest(loanAmount, loanTerm, interestRate) {
    console.log(
        `计算等额本息每月还款金额: loanAmount = ${loanAmount}, loanTerm = ${loanTerm}, interestRate = ${interestRate}`
    );
    const result =
        (loanAmount * (interestRate * Math.pow(1 + interestRate, loanTerm))) /
        (Math.pow(1 + interestRate, loanTerm) - 1);
    console.log(`月还款金额: ${result}`);
    return result;
}

// 计算等额本金每月还款金额
function calculateEqualPrincipal(loanAmount, loanTerm, interestRate) {
    console.log(
        `计算等额本金每月还款金额: loanAmount = ${loanAmount}, loanTerm = ${loanTerm}, interestRate = ${interestRate}`
    );
    const result = loanAmount / loanTerm + loanAmount * interestRate;
    console.log(`月还款金额: ${result}`);
    return result;
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
        let principal =
            calculateEqualPrincipalInterest(
                loanAmount,
                loanTerm,
                interestRate
            ) - interest;
        remainingLoan -= principal;
        currentDate.setMonth(currentDate.getMonth() + 1); // 移动到下一个月

        console.log(
            `期数 ${i}: 本期利息 = ${interest.toFixed(
                2
            )}, 本期本金 = ${principal.toFixed(
                2
            )}, 剩余贷款 = ${remainingLoan.toFixed(2)}, 日期 = ${
                currentDate.toISOString().split("T")[0]
            }`
        );

        schedule.push({
            period: i,
            paymentDate: currentDate.toISOString().split("T")[0], // 格式化为 YYYY-MM-DD
            monthlyPayment: calculateEqualPrincipalInterest(
                loanAmount,
                loanTerm,
                interestRate
            ),
            principal: principal,
            interest: interest,
            remainingLoan: remainingLoan > 0 ? remainingLoan : 0,
            annualInterestRate: (interestRate * 12 * 100).toFixed(2), // 年化利率，以百分比显示
        });
    }

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
        currentDate.setMonth(currentDate.getMonth() + 1); // 移动到下一个月

        console.log(
            `期数 ${i}: 本期利息 = ${interest.toFixed(
                2
            )}, 本期本金 = ${principal.toFixed(
                2
            )}, 剩余贷款 = ${remainingLoan.toFixed(2)}, 日期 = ${
                currentDate.toISOString().split("T")[0]
            }`
        );

        schedule.push({
            period: i,
            paymentDate: currentDate.toISOString().split("T")[0], // 格式化为 YYYY-MM-DD
            monthlyPayment: principal + interest,
            principal: principal,
            interest: interest,
            remainingLoan: remainingLoan > 0 ? remainingLoan : 0,
            annualInterestRate: (interestRate * 12 * 100).toFixed(2), // 年化利率，以百分比显示
        });
    }

    return schedule;
}

// 获取当前贷款还款计划的已还期数和剩余贷款
function getRemainingSchedule(startDate) {
    if (loanSchedule.length === 0) {
        console.log("loanSchedule 还款计划为空");
        return;
    }

    if (!startDate || startDate === "") {
        console.log("startDate 为空");
        return;
    }

    // const today = new Date();
    const currentPeriod = loanSchedule.findIndex(
        (item) => new Date(item.paymentDate) > startDate
    );

    const paidPeriods = currentPeriod === 0 ? 0 : currentPeriod; // 如果当前日期之前没有支付过任何款项
    const remainingLoan = loanSchedule[currentPeriod - 1]
        ? loanSchedule[currentPeriod - 1].remainingLoan
        : loanSchedule[loanSchedule.length - 1].remainingLoan;

    console.log(`当前已还期数: ${paidPeriods}, 剩余贷款: ${remainingLoan}`);
    return {
        paidPeriods, // 已还期数
        remainingLoan, // 剩余贷款
    };
}

// 显示还款计划表
function displayPaymentSchedule(schedule) {
    const tbody = document.querySelector("#schedule-table tbody");
    tbody.innerHTML = ""; // 清空之前的表格数据

    schedule.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.period}</td>
            <td>${item.paymentDate}</td>
            <td>${item.monthlyPayment.toFixed(2)}</td>
            <td>${item.principal.toFixed(2)}</td>
            <td>${item.interest.toFixed(2)}</td>
            <td>${item.remainingLoan.toFixed(2)}</td>
            <td>${item.annualInterestRate}%</td> <!-- 显示年化利率 -->
        `;
        tbody.appendChild(row);
    });
}

// 处理贷款表单提交
document
    .getElementById("loan-form")
    .addEventListener("submit", function (event) {
        event.preventDefault();

        const loanAmount = parseFloat(
            document.getElementById("loan-amount").value
        );
        const loanTerm =
            parseInt(document.getElementById("loan-term").value) * 12; // 将年转换为月
        const interestRate =
            parseFloat(document.getElementById("interest-rate").value) /
            100 /
            12; // 转换为月利率
        const loanMethod = document.getElementById("loan-method").value;
        const loanStartDate = new Date(
            document.getElementById("loan-start-date").value
        );

        console.log(
            `贷款金额: ${loanAmount}, 贷款期数: ${loanTerm}, 利率: ${
                interestRate * 12 * 100
            }%`
        );
        let monthlyPayment, schedule;

        if (loanMethod === "equal-principal-interest") {
            monthlyPayment = calculateEqualPrincipalInterest(
                loanAmount,
                loanTerm,
                interestRate
            );
            schedule = generateEqualPrincipalInterestSchedule(
                loanAmount,
                loanTerm,
                interestRate,
                loanStartDate
            );
        } else if (loanMethod === "equal-principal") {
            monthlyPayment = calculateEqualPrincipal(
                loanAmount,
                loanTerm,
                interestRate
            );
            schedule = generateEqualPrincipalSchedule(
                loanAmount,
                loanTerm,
                interestRate,
                loanStartDate
            );
        }

        // 更新贷款计划
        loanSchedule = schedule;

        document.getElementById("monthly-payment").textContent =
            monthlyPayment.toFixed(2);
        document.getElementById("remaining-loan").textContent =
            loanAmount.toFixed(2);

        displayPaymentSchedule(schedule);

        // 滚动到页面顶部
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    });

// 处理利率变更
document
    .getElementById("update-interest-rate")
    .addEventListener("click", function () {
        const newInterestRate =
            parseFloat(document.getElementById("new-interest-rate").value) /
            100 /
            12; // 新的月利率
        const loanAmount = parseFloat(
            document.getElementById("loan-amount").value
        );
        const loanTerm =
            parseInt(document.getElementById("loan-term").value) * 12;
        const loanMethod = document.getElementById("loan-method").value;
        const interestChangeDate = new Date(
            document.getElementById("interest-change-date").value
        );

        console.log(`更新后的利率: ${newInterestRate * 12 * 100}%`);
        const currentSchedule = getRemainingSchedule(interestChangeDate); // 获取当前还款进度

        let remainingLoan = currentSchedule.remainingLoan; // 变更后的剩余贷款
        let remainingTerm = loanTerm - currentSchedule.paidPeriods; // 剩余期数

        console.log(`剩余贷款: ${remainingLoan}, 剩余期数: ${remainingTerm}`);

        let monthlyPayment, schedule;

        // 保留之前的还款计划，并从变更日期开始更新
        if (loanMethod === "equal-principal-interest") {
            monthlyPayment = calculateEqualPrincipalInterest(
                remainingLoan,
                remainingTerm,
                newInterestRate
            );
            schedule = generateEqualPrincipalInterestSchedule(
                remainingLoan,
                remainingTerm,
                newInterestRate,
                interestChangeDate
            );
        } else if (loanMethod === "equal-principal") {
            monthlyPayment = calculateEqualPrincipal(
                remainingLoan,
                remainingTerm,
                newInterestRate
            );
            schedule = generateEqualPrincipalSchedule(
                remainingLoan,
                remainingTerm,
                newInterestRate,
                interestChangeDate
            );
        }

        // 将更新后的计划追加到原计划后面
        loanSchedule = loanSchedule
            .slice(0, currentSchedule.paidPeriods)
            .concat(schedule);

        document.getElementById("monthly-payment").textContent =
            monthlyPayment.toFixed(2);
        displayPaymentSchedule(loanSchedule);

        // 滚动到页面顶部
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    });

// 处理提前还款
document.getElementById("prepay-loan").addEventListener("click", function () {
    const prepayAmount = parseFloat(
        document.getElementById("prepay-amount").value
    );
    const loanAmount =
        parseFloat(document.getElementById("loan-amount").value) - prepayAmount; // 更新剩余贷款金额
    const prepayDate = new Date(document.getElementById("prepay-date").value);
    const loanTerm = parseInt(document.getElementById("loan-term").value) * 12;
    const interestRate =
        parseFloat(document.getElementById("interest-rate").value) / 100 / 12;
    const loanMethod = document.getElementById("loan-method").value;

    const remainingSchedule = getRemainingSchedule(prepayDate); // 获取当前还款进度

    let remainingLoan = remainingSchedule.remainingLoan - prepayAmount; // 提前还款后的剩余贷款
    let remainingTerm = loanTerm - remainingSchedule.paidPeriods; // 剩余期数

    console.log(
        `提前还款金额: ${prepayAmount}, 剩余贷款: ${remainingLoan}, 剩余期数: ${remainingTerm}`
    );

    let monthlyPayment, schedule;

    // 保留之前的还款计划，并从提前还款日期开始更新
    if (loanMethod === "equal-principal-interest") {
        monthlyPayment = calculateEqualPrincipalInterest(
            remainingLoan,
            remainingTerm,
            interestRate
        );
        schedule = generateEqualPrincipalInterestSchedule(
            remainingLoan,
            remainingTerm,
            interestRate,
            prepayDate
        );
    } else if (loanMethod === "equal-principal") {
        monthlyPayment = calculateEqualPrincipal(
            remainingLoan,
            remainingTerm,
            interestRate
        );
        schedule = generateEqualPrincipalSchedule(
            remainingLoan,
            remainingTerm,
            interestRate,
            prepayDate
        );
    }

    // 将更新后的计划追加到原计划后面
    loanSchedule = loanSchedule
        .slice(0, remainingSchedule.paidPeriods)
        .concat(schedule);

    document.getElementById("remaining-loan").textContent =
        remainingLoan.toFixed(2);
    displayPaymentSchedule(loanSchedule);

    // 滚动到页面顶部
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
});
