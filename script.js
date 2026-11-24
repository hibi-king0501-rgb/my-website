"use strict";

/*
    ローン返済シミュレーター

    主な前提
    ・利息は毎月計算
    ・ボーナス返済は半年ごと
    ・金額は内部では小数で計算
    ・表示時に1円単位で四捨五入
    ・最終回に端数を調整
*/

const elements = {
    amount: document.getElementById("amount"),
    annualRate: document.getElementById("annualRate"),
    years: document.getElementById("years"),
    repaymentMethod:
        document.getElementById("repaymentMethod"),

    useBonus: document.getElementById("useBonus"),
    bonusFields:
        document.getElementById("bonusFields"),
    bonusPrincipal:
        document.getElementById("bonusPrincipal"),
    firstBonusMonth:
        document.getElementById("firstBonusMonth"),

    usePrepayment:
        document.getElementById("usePrepayment"),
    prepaymentFields:
        document.getElementById("prepaymentFields"),
    prepaymentMonth:
        document.getElementById("prepaymentMonth"),
    prepaymentAmount:
        document.getElementById("prepaymentAmount"),
    prepaymentType:
        document.getElementById("prepaymentType"),

    calculateButton:
        document.getElementById("calculateButton"),
    resetButton:
        document.getElementById("resetButton"),

    errorMessage:
        document.getElementById("errorMessage"),
    resultSection:
        document.getElementById("resultSection"),

    firstPayment:
        document.getElementById("firstPayment"),
    regularPayment:
        document.getElementById("regularPayment"),
    bonusPayment:
        document.getElementById("bonusPayment"),
    totalPayment:
        document.getElementById("totalPayment"),
    totalInterest:
        document.getElementById("totalInterest"),
    actualPrepayment:
        document.getElementById("actualPrepayment"),
    actualTerm:
        document.getElementById("actualTerm"),
    reducedTerm:
        document.getElementById("reducedTerm"),

    rateComparisonBody:
        document.getElementById("rateComparisonBody"),

    scheduleBody:
        document.getElementById("scheduleBody"),
    scheduleNote:
        document.getElementById("scheduleNote"),
    toggleScheduleButton:
        document.getElementById("toggleScheduleButton")
};

let currentSchedule = [];
let showFullSchedule = false;


/* ------------------------------
   イベント設定
------------------------------ */

elements.useBonus.addEventListener(
    "change",
    updateConditionalFields
);

elements.usePrepayment.addEventListener(
    "change",
    updateConditionalFields
);

elements.calculateButton.addEventListener(
    "click",
    runSimulation
);

elements.resetButton.addEventListener(
    "click",
    resetForm
);

elements.toggleScheduleButton.addEventListener(
    "click",
    toggleSchedule
);


/* ------------------------------
   画面制御
------------------------------ */

function updateConditionalFields() {
    elements.bonusFields.classList.toggle(
        "hidden",
        !elements.useBonus.checked
    );

    elements.prepaymentFields.classList.toggle(
        "hidden",
        !elements.usePrepayment.checked
    );
}


function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.add("visible");

    elements.errorMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


function clearError() {
    elements.errorMessage.textContent = "";
    elements.errorMessage.classList.remove("visible");
}


function resetForm() {
    elements.amount.value = 10000000;
    elements.annualRate.value = 1.5;
    elements.years.value = 10;
    elements.repaymentMethod.value = "equalPayment";

    elements.useBonus.checked = false;
    elements.bonusPrincipal.value = 2000000;
    elements.firstBonusMonth.value = 6;

    elements.usePrepayment.checked = false;
    elements.prepaymentMonth.value = 24;
    elements.prepaymentAmount.value = 1000000;
    elements.prepaymentType.value = "term";

    currentSchedule = [];
    showFullSchedule = false;

    elements.resultSection.classList.add("hidden");

    clearError();
    updateConditionalFields();
}


/* ------------------------------
   入力値の取得・検証
------------------------------ */

function getInputValues() {
    return {
        amount: Number(elements.amount.value),
        annualRate:
            Number(elements.annualRate.value),
        years: Number(elements.years.value),
        repaymentMethod:
            elements.repaymentMethod.value,

        useBonus: elements.useBonus.checked,
        bonusPrincipal:
            elements.useBonus.checked
                ? Number(elements.bonusPrincipal.value)
                : 0,
        firstBonusMonth:
            Number(elements.firstBonusMonth.value),

        usePrepayment:
            elements.usePrepayment.checked,
        prepaymentMonth:
            Number(elements.prepaymentMonth.value),
        prepaymentAmount:
            Number(elements.prepaymentAmount.value),
        prepaymentType:
            elements.prepaymentType.value
    };
}


function validateInputs(input) {
    const totalMonths = input.years * 12;

    if (
        !Number.isFinite(input.amount) ||
        input.amount <= 0
    ) {
        return "借入金額を1円以上で入力してください。";
    }

    if (
        !Number.isFinite(input.annualRate) ||
        input.annualRate < 0 ||
        input.annualRate > 100
    ) {
        return "年利は0％以上100％以下で入力してください。";
    }

    if (
        !Number.isInteger(input.years) ||
        input.years < 1 ||
        input.years > 50
    ) {
        return "返済期間は1年以上50年以下で入力してください。";
    }

    if (input.useBonus) {
        if (
            !Number.isFinite(input.bonusPrincipal) ||
            input.bonusPrincipal <= 0
        ) {
            return "ボーナス返済に充てる元金を入力してください。";
        }

        if (input.bonusPrincipal >= input.amount) {
            return "ボーナス返済の元金は、借入金額未満にしてください。";
        }

        if (
            input.firstBonusMonth < 1 ||
            input.firstBonusMonth > 6
        ) {
            return "最初のボーナス返済月は1～6か月目で指定してください。";
        }
    }

    if (input.usePrepayment) {
        if (
            !Number.isInteger(input.prepaymentMonth) ||
            input.prepaymentMonth < 1 ||
            input.prepaymentMonth > totalMonths
        ) {
            return `繰上返済月は1～${totalMonths}か月目で入力してください。`;
        }

        if (
            !Number.isFinite(input.prepaymentAmount) ||
            input.prepaymentAmount <= 0
        ) {
            return "繰上返済額を1円以上で入力してください。";
        }

        if (input.prepaymentAmount >= input.amount) {
            return "繰上返済額は借入金額未満にしてください。";
        }
    }

    return "";
}


/* ------------------------------
   支払額計算
------------------------------ */

function calculateAnnuityPayment(
    principal,
    ratePerPeriod,
    periods
) {
    if (principal <= 0 || periods <= 0) {
        return 0;
    }

    if (ratePerPeriod === 0) {
        return principal / periods;
    }

    const factor = Math.pow(
        1 + ratePerPeriod,
        periods
    );

    return (
        principal *
        ratePerPeriod *
        factor /
        (factor - 1)
    );
}


function countBonusPayments(
    startMonth,
    endMonth,
    firstBonusMonth
) {
    let count = 0;

    for (
        let month = startMonth;
        month <= endMonth;
        month += 1
    ) {
        if (isBonusMonth(month, firstBonusMonth)) {
            count += 1;
        }
    }

    return count;
}


function isBonusMonth(month, firstBonusMonth) {
    if (month < firstBonusMonth) {
        return false;
    }

    return (
        (month - firstBonusMonth) % 6 === 0
    );
}


/* ------------------------------
   シミュレーション本体
------------------------------ */

function simulateLoan(input) {
    const originalMonths = input.years * 12;
    const monthlyRate =
        input.annualRate / 100 / 12;

    const regularPrincipal =
        input.amount - input.bonusPrincipal;

    let regularBalance = regularPrincipal;
    let bonusBalance = input.bonusPrincipal;

    let regularPayment = 0;
    let bonusPayment = 0;

    let regularPrincipalPayment = 0;
    let bonusPrincipalPayment = 0;

    let totalInterest = 0;
    let totalPayments = 0;
    let actualPrepayment = 0;

    let prepaymentCompleted = false;
    let paymentRecalculated = false;

    const schedule = [];

    const originalBonusCount =
        countBonusPayments(
            1,
            originalMonths,
            input.firstBonusMonth
        );

    if (input.repaymentMethod === "equalPayment") {
        regularPayment =
            calculateAnnuityPayment(
                regularPrincipal,
                monthlyRate,
                originalMonths
            );

        const sixMonthRate =
            Math.pow(1 + monthlyRate, 6) - 1;

        bonusPayment =
            calculateAnnuityPayment(
                input.bonusPrincipal,
                sixMonthRate,
                originalBonusCount
            );
    } else {
        regularPrincipalPayment =
            regularPrincipal / originalMonths;

        bonusPrincipalPayment =
            originalBonusCount > 0
                ? input.bonusPrincipal /
                    originalBonusCount
                : 0;
    }

    const initialRegularPayment =
        input.repaymentMethod === "equalPayment"
            ? regularPayment
            : (
                regularPrincipalPayment +
                regularPrincipal * monthlyRate
            );

    const initialBonusAddition =
        input.useBonus
            ? (
                input.repaymentMethod ===
                    "equalPayment"
                    ? bonusPayment
                    : (
                        bonusPrincipalPayment +
                        calculateAccumulatedBonusInterest(
                            input.bonusPrincipal,
                            monthlyRate,
                            input.firstBonusMonth
                        )
                    )
            )
            : 0;

    /*
        期間短縮型では当初期間を超えてループしないが、
        丸め誤差などを考慮して上限を長めに設定する。
    */
    const maximumMonths =
        input.prepaymentType === "term"
            ? originalMonths
            : originalMonths;

    let accumulatedBonusInterest = 0;

    for (
        let month = 1;
        month <= maximumMonths;
        month += 1
    ) {
        const openingRegularBalance =
            regularBalance;

        const openingBonusBalance =
            bonusBalance;

        if (
            regularBalance <= 0.000001 &&
            bonusBalance <= 0.000001
        ) {
            break;
        }

        const regularInterest =
            regularBalance * monthlyRate;

        const bonusMonthlyInterest =
            bonusBalance * monthlyRate;

        accumulatedBonusInterest +=
            bonusMonthlyInterest;

        let regularScheduledPayment = 0;
        let regularPrincipalPaid = 0;

        let bonusScheduledPayment = 0;
        let bonusPrincipalPaid = 0;
        let bonusInterestPaid = 0;

        const bonusMonth =
            input.useBonus &&
            isBonusMonth(
                month,
                input.firstBonusMonth
            );

        /*
            通常月返済
        */
        if (regularBalance > 0) {
            if (
                input.repaymentMethod ===
                "equalPayment"
            ) {
                regularScheduledPayment =
                    Math.min(
                        regularPayment,
                        regularBalance +
                            regularInterest
                    );

                regularPrincipalPaid =
                    Math.max(
                        0,
                        regularScheduledPayment -
                            regularInterest
                    );
            } else {
                regularPrincipalPaid =
                    Math.min(
                        regularPrincipalPayment,
                        regularBalance
                    );

                regularScheduledPayment =
                    regularPrincipalPaid +
                    regularInterest;
            }

            regularBalance -= regularPrincipalPaid;
        }

        /*
            ボーナス月返済
        */
        if (
            bonusMonth &&
            bonusBalance > 0
        ) {
            bonusInterestPaid =
                accumulatedBonusInterest;

            if (
                input.repaymentMethod ===
                "equalPayment"
            ) {
                bonusScheduledPayment =
                    Math.min(
                        bonusPayment,
                        bonusBalance +
                            bonusInterestPaid
                    );

                bonusPrincipalPaid =
                    Math.max(
                        0,
                        bonusScheduledPayment -
                            bonusInterestPaid
                    );
            } else {
                bonusPrincipalPaid =
                    Math.min(
                        bonusPrincipalPayment,
                        bonusBalance
                    );

                bonusScheduledPayment =
                    bonusPrincipalPaid +
                    bonusInterestPaid;
            }

            bonusBalance -= bonusPrincipalPaid;
            accumulatedBonusInterest = 0;
        }

        /*
            繰上返済
        */
        let prepayment = 0;

        if (
            input.usePrepayment &&
            !prepaymentCompleted &&
            month === input.prepaymentMonth
        ) {
            const currentBalance =
                regularBalance + bonusBalance;

            prepayment = Math.min(
                input.prepaymentAmount,
                currentBalance
            );

            const allocation =
                allocatePrepayment(
                    regularBalance,
                    bonusBalance,
                    prepayment
                );

            regularBalance -=
                allocation.regularAmount;

            bonusBalance -=
                allocation.bonusAmount;

            actualPrepayment += prepayment;
            prepaymentCompleted = true;

            /*
                返済額軽減型の場合は
                繰上返済後の返済額を再計算する。
            */
            if (
                input.prepaymentType === "payment"
            ) {
                const remainingMonths =
                    originalMonths - month;

                if (remainingMonths > 0) {
                    if (
                        input.repaymentMethod ===
                        "equalPayment"
                    ) {
                        regularPayment =
                            calculateAnnuityPayment(
                                regularBalance,
                                monthlyRate,
                                remainingMonths
                            );

                        const remainingBonusCount =
                            countBonusPayments(
                                month + 1,
                                originalMonths,
                                input.firstBonusMonth
                            );

                        const sixMonthRate =
                            Math.pow(
                                1 + monthlyRate,
                                6
                            ) - 1;

                        bonusPayment =
                            calculateAnnuityPayment(
                                bonusBalance,
                                sixMonthRate,
                                remainingBonusCount
                            );
                    } else {
                        regularPrincipalPayment =
                            regularBalance /
                            remainingMonths;

                        const remainingBonusCount =
                            countBonusPayments(
                                month + 1,
                                originalMonths,
                                input.firstBonusMonth
                            );

                        bonusPrincipalPayment =
                            remainingBonusCount > 0
                                ? bonusBalance /
                                    remainingBonusCount
                                : 0;
                    }

                    paymentRecalculated = true;
                }
            }
        }

        regularBalance =
            Math.max(0, regularBalance);

        bonusBalance =
            Math.max(0, bonusBalance);

        /*
            最終月に残っているボーナス利息を清算する。
        */
        let finalBonusInterest = 0;

        const totalBalanceAfterPayment =
            regularBalance + bonusBalance;

        if (
            month === originalMonths &&
            accumulatedBonusInterest > 0
        ) {
            finalBonusInterest =
                accumulatedBonusInterest;

            accumulatedBonusInterest = 0;
        }

        const interestPaid =
            regularInterest +
            bonusInterestPaid +
            finalBonusInterest;

        const scheduledPayment =
            regularScheduledPayment +
            bonusScheduledPayment +
            finalBonusInterest;

        const principalPaid =
            regularPrincipalPaid +
            bonusPrincipalPaid;

        totalInterest += interestPaid;

        totalPayments +=
            scheduledPayment + prepayment;

        schedule.push({
            month: month,
            openingBalance:
                openingRegularBalance +
                openingBonusBalance,
            scheduledPayment:
                scheduledPayment,
            principalPaid:
                principalPaid,
            interestPaid:
                interestPaid,
            bonusPayment:
                bonusScheduledPayment,
            prepayment:
                prepayment,
            closingBalance:
                regularBalance +
                bonusBalance,
            isBonusMonth:
                bonusMonth,
            isPrepaymentMonth:
                prepayment > 0
        });

        if (
            regularBalance <= 0.000001 &&
            bonusBalance <= 0.000001
        ) {
            break;
        }
    }

    /*
        最終残高がわずかに残った場合は、
        最終行に加算して調整する。
    */
    const remainingBalance =
        regularBalance + bonusBalance;

    if (
        remainingBalance > 0.000001 &&
        schedule.length > 0
    ) {
        const finalRow =
            schedule[schedule.length - 1];

        finalRow.scheduledPayment +=
            remainingBalance;

        finalRow.principalPaid +=
            remainingBalance;

        finalRow.closingBalance = 0;

        totalPayments += remainingBalance;

        regularBalance = 0;
        bonusBalance = 0;
    }

    const actualMonths =
        schedule.length;

    return {
        schedule: schedule,
        initialRegularPayment:
            initialRegularPayment,
        initialBonusAddition:
            initialBonusAddition,
        initialBonusMonthPayment:
            initialRegularPayment +
            initialBonusAddition,
        firstPayment:
            schedule.length > 0
                ? schedule[0].scheduledPayment
                : 0,
        totalPayment:
            totalPayments,
        totalInterest:
            totalInterest,
        actualPrepayment:
            actualPrepayment,
        actualMonths:
            actualMonths,
        reducedMonths:
            Math.max(
                0,
                originalMonths - actualMonths
            ),
        paymentRecalculated:
            paymentRecalculated
    };
}


function calculateAccumulatedBonusInterest(
    principal,
    monthlyRate,
    months
) {
    if (
        principal <= 0 ||
        monthlyRate === 0
    ) {
        return 0;
    }

    return (
        principal *
        (
            Math.pow(
                1 + monthlyRate,
                months
            ) - 1
        )
    );
}


function allocatePrepayment(
    regularBalance,
    bonusBalance,
    prepayment
) {
    const totalBalance =
        regularBalance + bonusBalance;

    if (
        totalBalance <= 0 ||
        prepayment <= 0
    ) {
        return {
            regularAmount: 0,
            bonusAmount: 0
        };
    }

    /*
        通常返済部分とボーナス返済部分の
        残高割合で按分する。
    */
    let regularAmount =
        prepayment *
        regularBalance /
        totalBalance;

    let bonusAmount =
        prepayment - regularAmount;

    regularAmount = Math.min(
        regularAmount,
        regularBalance
    );

    bonusAmount = Math.min(
        bonusAmount,
        bonusBalance
    );

    return {
        regularAmount: regularAmount,
        bonusAmount: bonusAmount
    };
}


/* ------------------------------
   実行・結果表示
------------------------------ */

function runSimulation() {
    clearError();

    const input = getInputValues();
    const validationMessage =
        validateInputs(input);

    if (validationMessage) {
        showError(validationMessage);
        return;
    }

    const result = simulateLoan(input);

    currentSchedule = result.schedule;
    showFullSchedule = false;

    displaySummary(result, input);
    displayRateComparison(input);
    renderSchedule();

    elements.resultSection.classList.remove(
        "hidden"
    );

    elements.resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function displaySummary(result, input) {
    elements.firstPayment.textContent =
        formatYen(result.firstPayment);

    elements.regularPayment.textContent =
        formatYen(
            result.initialRegularPayment
        );

    elements.bonusPayment.textContent =
        input.useBonus
            ? formatYen(
                result.initialBonusMonthPayment
            )
            : "利用なし";

    elements.totalPayment.textContent =
        formatYen(result.totalPayment);

    elements.totalInterest.textContent =
        formatYen(result.totalInterest);

    elements.actualPrepayment.textContent =
        input.usePrepayment
            ? formatYen(
                result.actualPrepayment
            )
            : "利用なし";

    elements.actualTerm.textContent =
        formatTerm(result.actualMonths);

    elements.reducedTerm.textContent =
        result.reducedMonths > 0
            ? `${result.reducedMonths}か月`
            : "短縮なし";
}


/* ------------------------------
   金利比較
------------------------------ */

function displayRateComparison(originalInput) {
    const rateCases = [
        {
            label: "現在の金利",
            increase: 0
        },
        {
            label: "金利＋0.5％",
            increase: 0.5
        },
        {
            label: "金利＋1.0％",
            increase: 1.0
        }
    ];

    elements.rateComparisonBody.innerHTML = "";

    rateCases.forEach(rateCase => {
        const comparisonInput = {
            ...originalInput,
            annualRate:
                originalInput.annualRate +
                rateCase.increase
        };

        const result =
            simulateLoan(comparisonInput);

        const row =
            document.createElement("tr");

        const difference =
            rateCase.increase === 0
                ? ""
                : (
                    result.initialRegularPayment -
                    simulateLoan({
                        ...originalInput
                    }).initialRegularPayment
                );

        row.innerHTML = `
            <td>${escapeHtml(rateCase.label)}</td>

            <td>
                ${comparisonInput.annualRate.toFixed(2)}％
            </td>

            <td>
                ${formatYen(result.initialRegularPayment)}
                ${
                    difference === ""
                        ? ""
                        : `<br><span class="positive">
                            ＋${formatYen(difference)}
                           </span>`
                }
            </td>

            <td>
                ${formatYen(result.totalInterest)}
            </td>
        `;

        elements.rateComparisonBody.appendChild(
            row
        );
    });
}


/* ------------------------------
   返済予定表
------------------------------ */

function toggleSchedule() {
    showFullSchedule = !showFullSchedule;
    renderSchedule();
}


function renderSchedule() {
    elements.scheduleBody.innerHTML = "";

    if (currentSchedule.length === 0) {
        elements.scheduleNote.textContent =
            "返済予定表はありません。";
        return;
    }

    const displayRows =
        showFullSchedule
            ? currentSchedule
            : currentSchedule.slice(0, 24);

    displayRows.forEach(item => {
        const row =
            document.createElement("tr");

        if (item.isBonusMonth) {
            row.classList.add("bonus-row");
        }

        if (item.isPrepaymentMonth) {
            row.classList.add(
                "prepayment-row"
            );
        }

        row.innerHTML = `
            <td>${item.month}</td>

            <td>
                ${formatYen(item.scheduledPayment)}
            </td>

            <td>
                ${formatYen(item.principalPaid)}
            </td>

            <td>
                ${formatYen(item.interestPaid)}
            </td>

            <td>
                ${
                    item.bonusPayment > 0
                        ? formatYen(item.bonusPayment)
                        : "-"
                }
            </td>

            <td>
                ${
                    item.prepayment > 0
                        ? formatYen(item.prepayment)
                        : "-"
                }
            </td>

            <td>
                ${formatYen(item.closingBalance)}
            </td>
        `;

        elements.scheduleBody.appendChild(row);
    });

    if (
        !showFullSchedule &&
        currentSchedule.length > 24
    ) {
        elements.scheduleNote.textContent =
            `最初の24回を表示しています。全${currentSchedule.length}回です。`;

        elements.toggleScheduleButton.textContent =
            "全期間を表示";
    } else {
        elements.scheduleNote.textContent =
            `全${currentSchedule.length}回を表示しています。`;

        elements.toggleScheduleButton.textContent =
            currentSchedule.length > 24
                ? "24回まで表示"
                : "全期間を表示";
    }

    elements.toggleScheduleButton.classList.toggle(
        "hidden",
        currentSchedule.length <= 24
    );
}


/* ------------------------------
   表示補助
------------------------------ */

function formatYen(value) {
    if (
        !Number.isFinite(value) ||
        value < 0
    ) {
        return "0円";
    }

    return (
        Math.round(value).toLocaleString(
            "ja-JP"
        ) + "円"
    );
}


function formatTerm(months) {
    const years =
        Math.floor(months / 12);

    const remainingMonths =
        months % 12;

    if (years === 0) {
        return `${remainingMonths}か月`;
    }

    if (remainingMonths === 0) {
        return `${years}年`;
    }

    return `${years}年${remainingMonths}か月`;
}


function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* 初期表示 */
updateConditionalFields();