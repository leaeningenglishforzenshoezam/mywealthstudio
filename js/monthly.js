"use strict";

/* ------------------------------
   Monthly form
------------------------------ */

function readMonthlyForm() {
  const record =
    createBlankMonthlyRecord();

  record.income.me =
    Number(
      getElement("incomeMe").value || 0
    );

  record.income.spouse =
    Number(
      getElement("incomeSpouse").value || 0
    );

  record.income.other =
    Number(
      getElement("incomeOther").value || 0
    );

  record.assets.cash =
    Number(
      getElement("cash").value || 0
    );

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      record.assets[account.key] = {
        principal:
          Number(
            getElement(
              account.principalId
            ).value || 0
          ),

        value:
          Number(
            getElement(
              account.valueId
            ).value || 0
          )
      };
    }
  );

  record.liabilities.mortgageBalance =
    Number(
      getElement(
        "mortgageBalance"
      ).value || 0
    );

  record.liabilities.otherDebt =
    Number(
      getElement(
        "otherDebt"
      ).value || 0
    );

  record.expenses.housing =
    Number(
      getElement(
        "expenseHousing"
      ).value || 0
    );

  record.expenses.food =
    Number(
      getElement(
        "expenseFood"
      ).value || 0
    );

  record.expenses.dailyGoods =
    Number(
      getElement(
        "expenseDailyGoods"
      ).value || 0
    );

  record.expenses.utilities =
    Number(
      getElement(
        "expenseUtilities"
      ).value || 0
    );

  record.expenses.communication =
    Number(
      getElement(
        "expenseCommunication"
      ).value || 0
    );

  record.expenses.transportation =
    Number(
      getElement(
        "expenseTransportation"
      ).value || 0
    );

  record.expenses.diningAndEntertainment =
    Number(
      getElement(
        "expenseDiningEntertainment"
      ).value || 0
    );

  record.expenses.insurance =
    Number(
      getElement(
        "expenseInsurance"
      ).value || 0
    );

  record.expenses.medical =
    Number(
      getElement(
        "expenseMedical"
      ).value || 0
    );

  record.expenses.education =
    Number(
      getElement(
        "expenseEducation"
      ).value || 0
    );

  record.expenses.other =
    Number(
      getElement(
        "expenseOther"
      ).value || 0
    );

  record.expenses.eventExpense =
    Number(
      getElement(
        "eventExpense"
      ).value || 0
    );

  record.note =
    getElement("monthlyNote").value.trim();

  return record;
}

function fillMonthlyForm(month) {
  const record =
    appData.monthlyData[month] ||
    createBlankMonthlyRecord();

  getElement("monthlyMonth").value =
    month;

  getElement("incomeMe").value =
    record.income?.me || "";

  getElement("incomeSpouse").value =
    record.income?.spouse || "";

  getElement("incomeOther").value =
    record.income?.other || "";

  getElement("cash").value =
    record.assets?.cash || "";

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      getElement(
        account.principalId
      ).value =
        record.assets
          ?.[account.key]
          ?.principal || "";

      getElement(
        account.valueId
      ).value =
        record.assets
          ?.[account.key]
          ?.value || "";
    }
  );

  getElement("mortgageBalance").value =
    record.liabilities
      ?.mortgageBalance || "";

  getElement("otherDebt").value =
    record.liabilities
      ?.otherDebt || "";

  getElement("expenseHousing").value =
    record.expenses
      ?.housing || "";

  getElement("expenseFood").value =
    record.expenses
      ?.food || "";

  getElement("expenseDailyGoods").value =
    record.expenses
      ?.dailyGoods || "";

  getElement("expenseUtilities").value =
    record.expenses
      ?.utilities || "";

  getElement(
    "expenseCommunication"
  ).value =
    record.expenses
      ?.communication || "";

  getElement(
    "expenseTransportation"
  ).value =
    record.expenses
      ?.transportation || "";

  getElement(
    "expenseDiningEntertainment"
  ).value =
    record.expenses
      ?.diningAndEntertainment || "";

  getElement("expenseInsurance").value =
    record.expenses
      ?.insurance || "";

  getElement("expenseMedical").value =
    record.expenses
      ?.medical || "";

  getElement("expenseEducation").value =
    record.expenses
      ?.education || "";

  getElement("expenseOther").value =
    record.expenses
      ?.other || "";

  getElement("eventExpense").value =
    record.expenses
      ?.eventExpense || "";

  getElement("monthlyNote").value =
    record.note || "";

  updateMonthlyCalculations();

  currentMonthlySnapshot =
    JSON.stringify(
      readMonthlyForm()
    );

  setMonthlyDirty(false);

  renderSavedMonthList();
}

function updateMonthlyCalculations() {
  const record =
    readMonthlyForm();

  const calculation =
    calculateMonthlyRecord(record);

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      const accountData =
        record.assets[account.key];

      const profit =
        accountData.value -
        accountData.principal;

      const profitElement =
        getElement(account.profitId);

      profitElement.textContent =
        formatSignedYen(profit);

      profitElement.style.color =
        profit > 0
          ? "var(--green)"
          : profit < 0
            ? "var(--red)"
            : "var(--muted)";
    }
  );

  getElement("formIncomeTotal")
    .textContent =
    formatYen(calculation.income);

  getElement("formLivingExpenseTotal")
    .textContent =
    formatYen(
      calculation.livingExpenseTotal
    );

  getElement("formExpenseTotal")
    .textContent =
    formatYen(calculation.totalExpense);

  const monthlyBalanceElement =
    getElement("formMonthlyBalance");

  monthlyBalanceElement.textContent =
    formatSignedYen(
      calculation.monthlyBalance
    );

  monthlyBalanceElement.style.color =
    calculation.monthlyBalance > 0
      ? "var(--green)"
      : calculation.monthlyBalance < 0
        ? "var(--red)"
        : "var(--muted)";

  getElement("formInvestmentPrincipal")
    .textContent =
    formatYen(
      calculation.investmentPrincipal
    );

  getElement("formInvestmentValue")
    .textContent =
    formatYen(
      calculation.investmentValue
    );

  getElement("formInvestmentProfit")
    .textContent =
    formatSignedYen(
      calculation.investmentProfit
    );

  getElement("formNetWorth")
    .textContent =
    formatYen(calculation.netWorth);

  validateMonthlyForm(false);
}

function setMonthlyDirty(dirty) {
  isMonthlyDirty = dirty;

  const status =
    getElement("monthlySaveStatus");

  status.classList.toggle(
    "unsaved",
    dirty
  );

  status.textContent =
    dirty
      ? "未保存の変更あり"
      : "保存済み";
}

function detectMonthlyChanges() {
  const current =
    JSON.stringify(
      readMonthlyForm()
    );

  setMonthlyDirty(
    current !== currentMonthlySnapshot
  );

  updateMonthlyCalculations();
}

function validateMonthlyForm(
  showMessage = true
) {
  const record =
    readMonthlyForm();

  const messages = [];

  const hasAnyAsset =
    record.assets.cash > 0 ||
    INVESTMENT_ACCOUNTS.some(
      account =>
        record.assets[account.key].value > 0
    );

  if (!hasAnyAsset) {
    messages.push(
      "・現金または投資評価額が入力されていません。"
    );
  }

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      const accountData =
        record.assets[account.key];

      if (
        accountData.value > 0 &&
        accountData.principal === 0
      ) {
        messages.push(
          `・評価額が入力されている口座に元本がありません。`
        );
      }
    }
  );

  const validationMessage =
    getElement("validationMessage");

  if (
    showMessage &&
    messages.length > 0
  ) {
    validationMessage.textContent =
      messages.join("\n");

    validationMessage.classList.remove(
      "hidden"
    );
  } else {
    validationMessage.classList.add(
      "hidden"
    );
  }

  return messages.length === 0;
}

function saveMonthlyForm(event) {
  event.preventDefault();

  const month =
    getElement("monthlyMonth").value;

  if (!month) {
    showToast(
      "対象月を選択してください。"
    );

    return;
  }

  validateMonthlyForm(true);

  const record =
    readMonthlyForm();

  appData.monthlyData[month] =
    record;

  saveData();

  getElement("globalMonth").value =
    month;

  currentMonthlySnapshot =
    JSON.stringify(record);

  setMonthlyDirty(false);

  renderSavedMonthList();
  renderHome();

  showToast(
    `${formatMonthJapanese(month)}を保存しました。`
  );
}

function copyPreviousMonth() {
  const month =
    getElement("monthlyMonth").value;

  const previousMonth =
    getPreviousMonth(month);

  const previousRecord =
    appData.monthlyData[previousMonth];

  if (!previousRecord) {
    showToast(
      `${formatMonthJapanese(
        previousMonth
      )}のデータがありません。`
    );

    return;
  }

  const copied =
    deepClone(previousRecord);

  copied.income = {
    ...copied.income
  };

  copied.expenses = {
    ...createBlankMonthlyRecord().expenses,
    ...(copied.expenses || {}),
    eventExpense: 0
  };

  copied.note = "";

  fillMonthlyRecordWithoutSaving(
    month,
    copied
  );

  setMonthlyDirty(true);

  showToast(
    `${formatMonthJapanese(
      previousMonth
    )}からコピーしました。`
  );
}

function fillMonthlyRecordWithoutSaving(
  month,
  record
) {
  getElement("monthlyMonth").value =
    month;

  getElement("incomeMe").value =
    record.income.me || "";

  getElement("incomeSpouse").value =
    record.income.spouse || "";

  getElement("incomeOther").value =
    record.income.other || "";

  getElement("cash").value =
    record.assets.cash || "";

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      getElement(
        account.principalId
      ).value =
        record.assets[account.key]
          .principal || "";

      getElement(
        account.valueId
      ).value =
        record.assets[account.key]
          .value || "";
    }
  );

  getElement("mortgageBalance").value =
    record.liabilities
      .mortgageBalance || "";

  getElement("otherDebt").value =
    record.liabilities
      .otherDebt || "";

  getElement("expenseHousing").value =
    record.expenses
      ?.housing || "";

  getElement("expenseFood").value =
    record.expenses
      ?.food || "";

  getElement("expenseDailyGoods").value =
    record.expenses
      ?.dailyGoods || "";

  getElement("expenseUtilities").value =
    record.expenses
      ?.utilities || "";

  getElement(
    "expenseCommunication"
  ).value =
    record.expenses
      ?.communication || "";

  getElement(
    "expenseTransportation"
  ).value =
    record.expenses
      ?.transportation || "";

  getElement(
    "expenseDiningEntertainment"
  ).value =
    record.expenses
      ?.diningAndEntertainment || "";

  getElement("expenseInsurance").value =
    record.expenses
      ?.insurance || "";

  getElement("expenseMedical").value =
    record.expenses
      ?.medical || "";

  getElement("expenseEducation").value =
    record.expenses
      ?.education || "";

  getElement("expenseOther").value =
    record.expenses
      ?.other || "";

  getElement("eventExpense").value =
    record.expenses
      ?.eventExpense || "";

  getElement("monthlyNote").value =
    record.note || "";

  updateMonthlyCalculations();
}

function deleteSelectedMonth() {
  const month =
    getElement("monthlyMonth").value;

  if (!appData.monthlyData[month]) {
    showToast(
      "この月には保存データがありません。"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `${formatMonthJapanese(
        month
      )}のデータを削除しますか？`
    );

  if (!confirmed) {
    return;
  }

  delete appData.monthlyData[month];

  saveData();

  fillMonthlyForm(month);
  renderSavedMonthList();
  renderHome();

  showToast(
    `${formatMonthJapanese(
      month
    )}を削除しました。`
  );
}

function restoreMonthlyForm() {
  const month =
    getElement("monthlyMonth").value;

  fillMonthlyForm(month);

  showToast(
    "保存済みの内容に戻しました。"
  );
}

function changeMonthlyMonth() {
  if (isMonthlyDirty) {
    const continueChange =
      window.confirm(
        "保存していない変更があります。月を切り替えますか？"
      );

    if (!continueChange) {
      getElement("monthlyMonth").value =
        getElement("globalMonth").value;

      return;
    }
  }

  const month =
    getElement("monthlyMonth").value;

  getElement("globalMonth").value =
    month;

  fillMonthlyForm(month);
  renderHome();
}

function renderSavedMonthList() {
  const list =
    getElement("savedMonthList");

  const count =
    getElement("savedMonthCount");

  const months =
    Object.keys(appData.monthlyData)
      .sort()
      .reverse();

  count.textContent =
    `${months.length}件`;

  list.innerHTML = "";

  if (months.length === 0) {
    const empty =
      document.createElement("p");

    empty.className =
      "saved-month-empty";

    empty.textContent =
      "保存済みデータはありません。";

    list.appendChild(empty);

    return;
  }

  const selectedMonth =
    getElement("monthlyMonth").value;

  months.forEach(
    month => {
      const record =
        appData.monthlyData[month];

      const calculation =
        calculateMonthlyRecord(record);

      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "saved-month-button";

      if (month === selectedMonth) {
        button.classList.add("active");
      }

      const title =
        document.createElement("strong");

      title.textContent =
        formatMonthJapanese(month);

      const value =
        document.createElement("span");

      value.textContent =
        `純資産 ${formatYen(
          calculation.netWorth
        )}`;å

      button.appendChild(title);
      button.appendChild(value);

      button.addEventListener(
        "click",
        () => {
          if (isMonthlyDirty) {
            const move =
              window.confirm(
                "保存していない変更があります。別の月を開きますか？"
              );

            if (!move) {
              return;
            }
          }

          getElement(
            "monthlyMonth"
          ).value = month;

          getElement(
            "globalMonth"
          ).value = month;

          fillMonthlyForm(month);
          renderHome();
        }
      );

      list.appendChild(button);
    }
  );
}
