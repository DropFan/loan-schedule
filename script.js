document
    .getElementById("loan-form")
    .addEventListener("submit", function (event) {
        event.preventDefault();

        const loanAmount = parseFloat(
            document.getElementById("loan-amount").value
        );
        const loanTerm =
            parseInt(document.getElementById("loan-term").value) * 12; // Convert years to months
        const interestRate =
            parseFloat(document.getElementById("interest-rate").value) /
            100 /
            12; // Convert annual rate to monthly rate
        const loanMethod = document.getElementById("loan-method").value;
        const loanStartDate = new Date(
            document.getElementById("loan-start-date").value
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

        document.getElementById("monthly-payment").textContent =
            monthlyPayment.toFixed(2);
        document.getElementById("remaining-loan").textContent =
            loanAmount.toFixed(2);

        displayPaymentSchedule(schedule);
    });

document
    .getElementById("update-interest-rate")
    .addEventListener("click", function () {
        const newInterestRate =
            parseFloat(document.getElementById("new-interest-rate").value) /
            100 /
            12; // New monthly interest rate
        const loanAmount = parseFloat(
            document.getElementById("loan-amount").value
        );
        const loanTerm =
            parseInt(document.getElementById("loan-term").value) * 12;
        const loanMethod = document.getElementById("loan-method").value;
        const interestChangeDate = new Date(
            document.getElementById("interest-change-date").value
        );

        let monthlyPayment, schedule;

        if (loanMethod === "equal-principal-interest") {
            monthlyPayment = calculateEqualPrincipalInterest(
                loanAmount,
                loanTerm,
                newInterestRate
            );
            schedule = generateEqualPrincipalInterestSchedule(
                loanAmount,
                loanTerm,
                newInterestRate,
                interestChangeDate
            );
        } else if (loanMethod === "equal-principal") {
            monthlyPayment = calculateEqualPrincipal(
                loanAmount,
                loanTerm,
                newInterestRate
            );
            schedule = generateEqualPrincipalSchedule(
                loanAmount,
                loanTerm,
                newInterestRate,
                interestChangeDate
            );
        }

        document.getElementById("monthly-payment").textContent =
            monthlyPayment.toFixed(2);
        displayPaymentSchedule(schedule);
    });

document.getElementById("prepay-loan").addEventListener("click", function () {
    const prepayAmount = parseFloat(
        document.getElementById("prepay-amount").value
    );
    const loanAmount =
        parseFloat(document.getElementById("loan-amount").value) - prepayAmount; // Update remaining loan amount
    const prepayDate = new Date(document.getElementById("prepay-date").value);
    const loanTerm = parseInt(document.getElementById("loan-term").value) * 12;
    const interestRate =
        parseFloat(document.getElementById("interest-rate").value) / 100 / 12;
    const loanMethod = document.getElementById("loan-method").value;

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
            prepayDate
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
            prepayDate
        );
    }

    document.getElementById("remaining-loan").textContent =
        loanAmount.toFixed(2);
    displayPaymentSchedule(schedule);
});

function calculateEqualPrincipalInterest(loanAmount, loanTerm, interestRate) {
    return (
        (loanAmount * (interestRate * Math.pow(1 + interestRate, loanTerm))) /
        (Math.pow(1 + interestRate, loanTerm) - 1)
    );
}

function calculateEqualPrincipal(loanAmount, loanTerm, interestRate) {
    return loanAmount / loanTerm + loanAmount * interestRate;
}

function generateEqualPrincipalInterestSchedule(
    loanAmount,
    loanTerm,
    interestRate,
    startDate
) {
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
        currentDate.setMonth(currentDate.getMonth() + 1); // Move to the next month

        schedule.push({
            period: i,
            paymentDate: currentDate.toISOString().split("T")[0], // Format to YYYY-MM-DD
            monthlyPayment: calculateEqualPrincipalInterest(
                loanAmount,
                loanTerm,
                interestRate
            ),
            principal: principal,
            interest: interest,
            remainingLoan: remainingLoan > 0 ? remainingLoan : 0,
        });
    }

    return schedule;
}

function generateEqualPrincipalSchedule(
    loanAmount,
    loanTerm,
    interestRate,
    startDate
) {
    let schedule = [];
    let remainingLoan = loanAmount;
    let currentDate = new Date(startDate);

    for (let i = 1; i <= loanTerm; i++) {
        let interest = remainingLoan * interestRate;
        let principal = loanAmount / loanTerm;
        remainingLoan -= principal;
        currentDate.setMonth(currentDate.getMonth() + 1); // Move to the next month

        schedule.push({
            period: i,
            paymentDate: currentDate.toISOString().split("T")[0], // Format to YYYY-MM-DD
            monthlyPayment: principal + interest,
            principal: principal,
            interest: interest,
            remainingLoan: remainingLoan > 0 ? remainingLoan : 0,
        });
    }

    return schedule;
}

function displayPaymentSchedule(schedule) {
    const tbody = document.querySelector("#schedule-table tbody");
    tbody.innerHTML = ""; // Clear previous rows

    schedule.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.period}</td>
            <td>${item.paymentDate}</td>
            <td>${item.monthlyPayment.toFixed(2)}</td>
            <td>${item.principal.toFixed(2)}</td>
            <td>${item.interest.toFixed(2)}</td>
            <td>${item.remainingLoan.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}
