"use strict";

/*
    ローン返済シミュレーター

    対応機能
    ・元利均等返済
    ・元金均等返済
    ・返済予定表
    ・印刷

    計算上は小数を保持し、
    画面表示時に1円単位で四捨五入します。
*/

const loanAmountInput =
    document.getElementById("loanAmount");

const annualRateInput =
    document.getElementById("annualRate");

const repaymentYearsInput =
    document.getElementById("repaymentYears");

const repaymentMethodSelect =
    document.getElementById("repaymentMethod");

const calculateButton =
    document.getElementById("calculateButton");

const printButton =
    document.getElementById("printButton");

const methodDescription =
    document.getElementById("methodDescription");

const errorMessage =
    document.getElementById("errorMessage");

const resultSection =
    document.getElementById("resultSection");

const firstPaymentElement =
    document.getElementById("firstPayment");

const lastPaymentElement =
    document.getElementById("lastPayment");

const totalPaymentElement =
    document.getElementById("totalPayment");

const totalInterestElement =
    document.getElementById("totalInterest");

const conditionSummary =
    document.getElementById("conditionSummary");

const methodNote =
    document.getElementById("methodNote");

const scheduleSummary =
    document.getElementById("scheduleSummary");

const scheduleBody =
    document.getElementById("scheduleBody");


repaymentMethodSelect.addEventListener(
    "change",
    updateMethodDescription
);

calculateButton.addEventListener(
    "click",
    calculateLoan
);

printButton.addEventListener(
    "click",
    function () {
        window.print();
    }
);


/* 返済方法の説明を変更 */

function updateMethodDescription() {
    if (
        repaymentMethodSelect.value ===
        "equalPayment"
    ) {
        methodDescription.textContent =
            "毎月の返済額が原則一定です。";
    } else {
        methodDescription.textContent =
            "毎月の元金返済額が一定で、返済額は徐々に減少します。";
    }
}


/* 入力内容を確認 */

function validateInputs(
    loanAmount,
    annualRate,
    repaymentYears
) {
    if (
        !Number.isFinite(loanAmount) ||
        loanAmount <= 0
    ) {
        return "借入金額を1円以上で入力してください。";
    }

    if (
        !Number.isFinite(annualRate) ||
        annualRate < 0 ||
        annualRate > 100
    ) {
        return "年利を0％以上100％以下で入力してください。";
    }

    if (
        !Number.isInteger(repaymentYears) ||
        repaymentYears < 1 ||
        repaymentYears > 50
    ) {
        return "返済期間を1年以上50年以下の整数で入力してください。";
    }

    return "";
}


/* 計算実行 */

function calculateLoan() {
    clearError();

    const loanAmount =
        Number(loanAmountInput.value);

    const annualRate =
        Number(annualRateInput.value);

    const repaymentYears =
        Number(repaymentYearsInput.value);

    const repaymentMethod =
        repaymentMethodSelect.value;

    const validationMessage =
        validateInputs(
            loanAmount,
            annualRate,
            repaymentYears
        );

    if (validationMessage) {
        showError(validationMessage);
        return;
    }

    const numberOfPayments =
        repaymentYears * 12;

    const monthlyRate =
        annualRate / 100 / 12;

    let result;

    if (
        repaymentMethod ===
        "equalPayment"
    ) {
        result =
            calculateEqualPaymentSchedule(
                loanAmount,
                monthlyRate,
                numberOfPayments
            );
    } else {
        result =
            calculateEqualPrincipalSchedule(
                loanAmount,
                monthlyRate,
                numberOfPayments
            );
    }

    displayResult(
        result,
        loanAmount,
        annualRate,
        repaymentYears,
        repaymentMethod
    );
}


/* 元利均等返済 */

function calculateEqualPaymentSchedule(
    loanAmount,
    monthlyRate,
    numberOfPayments
) {
    let monthlyPayment;

    if (monthlyRate === 0) {
        monthlyPayment =
            loanAmount / numberOfPayments;
    } else {
        const rateFactor =
            Math.pow(
                1 + monthlyRate,
                numberOfPayments
            );

        monthlyPayment =
            loanAmount *
            monthlyRate *
            rateFactor /
            (rateFactor - 1);
    }

    let remainingBalance =
        loanAmount;

    let totalPayment = 0;
    let totalInterest = 0;

    const schedule = [];

    for (
        let paymentNumber = 1;
        paymentNumber <= numberOfPayments;
        paymentNumber += 1
    ) {
        const interestPayment =
            remainingBalance * monthlyRate;

        let principalPayment =
            monthlyPayment - interestPayment;

        let actualPayment =
            monthlyPayment;

        /*
            最終回は残高と利息を全額返済し、
            小数誤差を調整する。
        */
        if (
            paymentNumber === numberOfPayments ||
            principalPayment > remainingBalance
        ) {
            principalPayment =
                remainingBalance;

            actualPayment =
                principalPayment +
                interestPayment;
        }

        remainingBalance -=
            principalPayment;

        if (
            Math.abs(remainingBalance) <
            0.000001
        ) {
            remainingBalance = 0;
        }

        totalPayment += actualPayment;
        totalInterest += interestPayment;

        schedule.push({
            paymentNumber:
                paymentNumber,
            paymentAmount:
                actualPayment,
            principalAmount:
                principalPayment,
            interestAmount:
                interestPayment,
            remainingBalance:
                remainingBalance
        });
    }

    return {
        schedule: schedule,
        totalPayment: totalPayment,
        totalInterest: totalInterest
    };
}


/* 元金均等返済 */

function calculateEqualPrincipalSchedule(
    loanAmount,
    monthlyRate,
    numberOfPayments
) {
    const standardPrincipalPayment =
        loanAmount / numberOfPayments;

    let remainingBalance =
        loanAmount;

    let totalPayment = 0;
    let totalInterest = 0;

    const schedule = [];

    for (
        let paymentNumber = 1;
        paymentNumber <= numberOfPayments;
        paymentNumber += 1
    ) {
        const interestPayment =
            remainingBalance * monthlyRate;

        let principalPayment =
            standardPrincipalPayment;

        /*
            最終回は残高全額を元金返済とし、
            小数誤差を調整する。
        */
        if (
            paymentNumber === numberOfPayments ||
            principalPayment > remainingBalance
        ) {
            principalPayment =
                remainingBalance;
        }

        const actualPayment =
            principalPayment +
            interestPayment;

        remainingBalance -=
            principalPayment;

        if (
            Math.abs(remainingBalance) <
            0.000001
        ) {
            remainingBalance = 0;
        }

        totalPayment += actualPayment;
        totalInterest += interestPayment;

        schedule.push({
            paymentNumber:
                paymentNumber,
            paymentAmount:
                actualPayment,
            principalAmount:
                principalPayment,
            interestAmount:
                interestPayment,
            remainingBalance:
                remainingBalance
        });
    }

    return {
        schedule: schedule,
        totalPayment: totalPayment,
        totalInterest: totalInterest
    };
}


/* 結果表示 */

function displayResult(
    result,
    loanAmount,
    annualRate,
    repaymentYears,
    repaymentMethod
) {
    const firstSchedule =
        result.schedule[0];

    const lastSchedule =
        result.schedule[
            result.schedule.length - 1
        ];

    firstPaymentElement.textContent =
        formatYen(
            firstSchedule.paymentAmount
        );

    lastPaymentElement.textContent =
        formatYen(
            lastSchedule.paymentAmount
        );

    totalPaymentElement.textContent =
        formatYen(result.totalPayment);

    totalInterestElement.textContent =
        formatYen(result.totalInterest);

    const methodName =
        repaymentMethod === "equalPayment"
            ? "元利均等返済"
            : "元金均等返済";

    conditionSummary.textContent =
        `${formatYen(loanAmount)}・年利${annualRate.toFixed(2)}％・${repaymentYears}年・${methodName}`;

    scheduleSummary.textContent =
        `全${result.schedule.length}回の返済予定を表示しています。`;

    if (
        repaymentMethod ===
        "equalPayment"
    ) {
        methodNote.textContent =
            "元利均等返済は、元金と利息を合わせた毎月の返済額が原則として一定になる方式です。";
    } else {
        methodNote.textContent =
            "元金均等返済は、毎月返済する元金が一定です。残高の減少に伴って利息も減るため、毎月の返済額は徐々に少なくなります。";
    }

    displaySchedule(result.schedule);

    resultSection.classList.remove(
        "hidden"
    );

    resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* 返済予定表を作成 */

function displaySchedule(schedule) {
    scheduleBody.innerHTML = "";

    const fragment =
        document.createDocumentFragment();

    schedule.forEach(function (item) {
        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>
                ${item.paymentNumber}回
            </td>

            <td>
                ${formatYen(item.paymentAmount)}
            </td>

            <td>
                ${formatYen(item.principalAmount)}
            </td>

            <td>
                ${formatYen(item.interestAmount)}
            </td>

            <td>
                ${formatYen(item.remainingBalance)}
            </td>
        `;

        fragment.appendChild(row);
    });

    scheduleBody.appendChild(fragment);
}


/* エラー表示 */

function showError(message) {
    errorMessage.textContent = message;

    errorMessage.classList.add(
        "visible"
    );

    errorMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


function clearError() {
    errorMessage.textContent = "";

    errorMessage.classList.remove(
        "visible"
    );
}


/* 円表示 */

function formatYen(value) {
    if (!Number.isFinite(value)) {
        return "0円";
    }

    return (
        Math.round(value).toLocaleString(
            "ja-JP"
        ) + "円"
    );
}


/* 初期表示 */

updateMethodDescription();