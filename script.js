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

        const monthlyPayment = calculateMonthlyPayment(
            loanAmount,
            loanTerm,
            interestRate
        );

        document.getElementById("monthly-payment").textContent =
            monthlyPayment.toFixed(2);
        document.getElementById("remaining-loan").textContent =
            loanAmount.toFixed(2);
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

        const newMonthlyPayment = calculateMonthlyPayment(
            loanAmount,
            loanTerm,
            newInterestRate
        );

        document.getElementById("monthly-payment").textContent =
            newMonthlyPayment.toFixed(2);
    });

document.getElementById("prepay-loan").addEventListener("click", function () {
    const prepayAmount = parseFloat(
        document.getElementById("prepay-amount").value
    );
    let loanAmount = parseFloat(document.getElementById("loan-amount").value);

    loanAmount -= prepayAmount;

    document.getElementById("remaining-loan").textContent =
        loanAmount.toFixed(2);

    const loanTerm = parseInt(document.getElementById("loan-term").value) * 12;
    const interestRate =
        parseFloat(document.getElementById("interest-rate").value) / 100 / 12;

    const newMonthlyPayment = calculateMonthlyPayment(
        loanAmount,
        loanTerm,
        interestRate
    );
    document.getElementById("monthly-payment").textContent =
        newMonthlyPayment.toFixed(2);
});

function calculateMonthlyPayment(loanAmount, loanTerm, interestRate) {
    return (
        (loanAmount * (interestRate * Math.pow(1 + interestRate, loanTerm))) /
        (Math.pow(1 + interestRate, loanTerm) - 1)
    );
}
