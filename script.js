document
    .getElementById("calculateButton")
    .addEventListener("click", calculateLoan);


function calculateLoan() {

    const amount =
        Number(document.getElementById("amount").value);

    const annualRate =
        Number(document.getElementById("rate").value);

    const years =
        Number(document.getElementById("years").value);


    if (amount <= 0 || annualRate < 0 || years <= 0) {

        alert("正しい借入条件を入力してください。");

        return;
    }


    const numberOfPayments = years * 12;

    let monthlyPayment;


    if (annualRate === 0) {

        monthlyPayment =
            amount / numberOfPayments;

    } else {

        const monthlyRate =
            annualRate / 100 / 12;

        monthlyPayment =
            amount *
            monthlyRate *
            Math.pow(1 + monthlyRate, numberOfPayments) /
            (
                Math.pow(
                    1 + monthlyRate,
                    numberOfPayments
                ) - 1
            );
    }


    const totalPayment =
        monthlyPayment * numberOfPayments;

    const totalInterest =
        totalPayment - amount;


    document.getElementById("monthlyPayment").textContent =
        formatYen(monthlyPayment);

    document.getElementById("totalPayment").textContent =
        formatYen(totalPayment);

    document.getElementById("totalInterest").textContent =
        formatYen(totalInterest);
}


function formatYen(number) {

    return Math.round(number).toLocaleString("ja-JP") + " 円";

}
