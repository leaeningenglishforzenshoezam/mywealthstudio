"use strict";

/* ------------------------------
   Cash Flow page
------------------------------ */

function buildCashFlowSelectors() {
  const baseMonthSelect =
    getElement(
      "cashFlowBaseMonth"
    );

  const previousBaseMonth =
    baseMonthSelect.value;

  baseMonthSelect.innerHTML = "";

  const months =
    Object.keys(
      appData.monthlyData
    ).sort();

  months.forEach(
    month => {
      const option =
        document.createElement(
          "option"
        );

      option.value = month;

      option.textContent =
        formatMonthJapanese(month);

      baseMonthSelect.appendChild(
        option
      );
    }
  );

  if (
    previousBaseMonth &&
    months.includes(
      previousBaseMonth
    )
  ) {
    baseMonthSelect.value =
      previousBaseMonth;
  } else {
    baseMonthSelect.value =
      months.at(-1) || "";
  }

  const housingSelect =
    getElement(
      "cashFlowHousingPlan"
    );

  const previousHousingPlan =
    housingSelect.value;

  housingSelect.innerHTML = "";

  const noHousingOption =
    document.createElement(
      "option"
    );

  noHousingOption.value = "";

  noHousingOption.textContent =
    "住宅購入を反映しない";

  housingSelect.appendChild(
    noHousingOption
  );

  appData.housingPlans
    .map(normalizeHousingPlan)
    .forEach(
      plan => {
        const option =
          document.createElement(
            "option"
          );

        option.value =
          plan.id;

        option.textContent =
          `${plan.name}（${formatMonthJapanese(
            plan.purchaseMonth
          )}）`;

        housingSelect.appendChild(
          option
        );
      }
    );

  if (
    previousHousingPlan &&
    appData.housingPlans.some(
      plan =>
        plan.id ===
        previousHousingPlan
    )
  ) {
    housingSelect.value =
      previousHousingPlan;
  }
}

function renderCashFlowPage() {
  buildCashFlowSelectors();

  const baseMonth =
    getElement(
      "cashFlowBaseMonth"
    ).value;

  const housingPlan =
    getCashFlowHousingPlan();

  const result =
    runFinancialEngine({
      baseMonth,
      housingPlan
    });

  cashFlowRows =
    result.rows;

  selectedCashFlowMonth = null;

  renderCashFlowWarnings(
    result.warnings
  );

  buildCashFlowYearFilter();
  renderCashFlowSummary();
  renderCashFlowTable();
  clearCashFlowDetail();
}

function renderCashFlowWarnings(
  warnings
) {
  const warningElement =
    getElement(
      "cashFlowWarning"
    );

  if (
    !warnings ||
    warnings.length === 0
  ) {
    warningElement.classList.add(
      "hidden"
    );

    warningElement.textContent = "";

    return;
  }

  warningElement.textContent =
    warnings
      .map(
        warning =>
          `・${warning}`
      )
      .join("\n");

  warningElement.classList.remove(
    "hidden"
  );
}

function buildCashFlowYearFilter() {
  const select =
    getElement(
      "cashFlowYearFilter"
    );

  const previousValue =
    select.value;

  select.innerHTML = "";

  const allOption =
    document.createElement(
      "option"
    );

  allOption.value = "all";
  allOption.textContent =
    "すべて";

  select.appendChild(
    allOption
  );

  const years =
    [
      ...new Set(
        cashFlowRows.map(
          row =>
            getYearFromMonth(
              row.month
            )
        )
      )
    ];

  years.forEach(
    year => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        String(year);

      option.textContent =
        `${year}年`;

      select.appendChild(option);
    }
  );

  if (
    previousValue === "all" ||
    years.includes(
      Number(previousValue)
    )
  ) {
    select.value =
      previousValue || "all";
  }
}

function renderCashFlowSummary() {
  if (
    cashFlowRows.length === 0
  ) {
    [
      "cashFlowEndingCash",
      "cashFlowEndingInvestment",
      "cashFlowEndingMortgage",
      "cashFlowEndingNetWorth",
      "cashFlowMinimumCash",
      "cashFlowMinimumNetWorth"
    ].forEach(
      id => {
        getElement(id).textContent =
          formatYen(0);
      }
    );

    getElement(
      "cashFlowFirstNegativeMonth"
    ).textContent =
      "計算データなし";

    return;
  }

  const endingRow =
    cashFlowRows.at(-1);

  const minimumCashRow =
    cashFlowRows.reduce(
      (minimum, row) =>
        row.cash < minimum.cash
          ? row
          : minimum
    );

  const minimumNetWorthRow =
    cashFlowRows.reduce(
      (minimum, row) =>
        row.netWorth <
        minimum.netWorth
          ? row
          : minimum
    );

  const firstNegativeRow =
    cashFlowRows.find(
      row =>
        row.cash < 0
    );

  getElement(
    "cashFlowEndingCash"
  ).textContent =
    formatYen(
      Math.round(
        endingRow.cash
      )
    );

  getElement(
    "cashFlowEndingInvestment"
  ).textContent =
    formatYen(
      Math.round(
        endingRow.investmentAsset
      )
    );

  getElement(
    "cashFlowEndingMortgage"
  ).textContent =
    formatYen(
      Math.round(
        endingRow.mortgageBalance
      )
    );

  getElement(
    "cashFlowEndingNetWorth"
  ).textContent =
    formatYen(
      Math.round(
        endingRow.netWorth
      )
    );

  getElement(
    "cashFlowFirstNegativeMonth"
  ).textContent =
    firstNegativeRow
      ? formatMonthJapanese(
          firstNegativeRow.month
        )
      : "なし";

  getElement(
    "cashFlowMinimumCash"
  ).textContent =
    `${formatYen(
      Math.round(
        minimumCashRow.cash
      )
    )}（${formatMonthJapanese(
      minimumCashRow.month
    )}）`;

  getElement(
    "cashFlowMinimumNetWorth"
  ).textContent =
    `${formatYen(
      Math.round(
        minimumNetWorthRow.netWorth
      )
    )}（${formatMonthJapanese(
      minimumNetWorthRow.month
    )}）`;
}

function getVisibleCashFlowRows() {
  const yearFilter =
    getElement(
      "cashFlowYearFilter"
    ).value;

  if (yearFilter === "all") {
    return cashFlowRows;
  }

  return cashFlowRows.filter(
    row =>
      String(
        getYearFromMonth(
          row.month
        )
      ) === yearFilter
  );
}

function aggregateCashFlowByYear(
  rows
) {
  const yearMap =
    new Map();

  rows.forEach(
    row => {
      const year =
        getYearFromMonth(
          row.month
        );

      if (!yearMap.has(year)) {
        yearMap.set(year, {
          month: String(year),

          income: 0,
          livingAndEventExpense: 0,
          housingExpense: 0,
          eventExpense: 0,
          investmentContribution: 0,
          monthlyBalance: 0,

          cash: 0,
          investmentAsset: 0,
          mortgageBalance: 0,
          netWorth: 0,

          sourceRows: []
        });
      }

      const yearRow =
        yearMap.get(year);

      yearRow.income +=
        row.income;

      yearRow.livingAndEventExpense +=
        row.livingAndEventExpense;

      yearRow.housingExpense +=
        row.housingExpense;

      yearRow.eventExpense +=
        row.eventExpense;

      yearRow.investmentContribution +=
        row.investmentContribution;

      yearRow.monthlyBalance +=
        row.monthlyBalance;

      yearRow.cash =
        row.cash;

      yearRow.investmentAsset =
        row.investmentAsset;

      yearRow.mortgageBalance =
        row.mortgageBalance;

      yearRow.netWorth =
        row.netWorth;

      yearRow.sourceRows.push(row);
    }
  );

  return [
    ...yearMap.values()
  ];
}

function createCashFlowCell(
  value,
  signed = false
) {
  const cell =
    document.createElement("td");

  cell.textContent =
    signed
      ? formatSignedYen(
          Math.round(value)
        )
      : formatYen(
          Math.round(value)
        );

  if (
    signed &&
    value > 0
  ) {
    cell.classList.add(
      "cashflow-positive"
    );
  }

  if (
    signed &&
    value < 0
  ) {
    cell.classList.add(
      "cashflow-negative"
    );
  }

  return cell;
}

function renderCashFlowTable() {
  const body =
    getElement(
      "cashFlowTableBody"
    );

  body.innerHTML = "";

  const displayMode =
    getElement(
      "cashFlowDisplayMode"
    ).value;

  const visibleRows =
    getVisibleCashFlowRows();

  const displayRows =
    displayMode === "yearly"
      ? aggregateCashFlowByYear(
          visibleRows
        )
      : visibleRows;

  getElement(
    "cashFlowRowCount"
  ).textContent =
    `${displayRows.length}件`;

  if (
    displayRows.length === 0
  ) {
    const row =
      document.createElement("tr");

    const cell =
      document.createElement("td");

    cell.colSpan = 11;

    cell.textContent =
      "表示できる計算結果がありません。";

    cell.style.textAlign =
      "center";

    cell.style.padding =
      "35px";

    row.appendChild(cell);
    body.appendChild(row);

    return;
  }

  displayRows.forEach(
    rowData => {
      const row =
        document.createElement("tr");

      row.className =
        displayMode === "yearly"
          ? "cashflow-year-row"
          : "cashflow-table-row";

      if (
        displayMode === "monthly" &&
        rowData.month ===
          selectedCashFlowMonth
      ) {
        row.classList.add("active");
      }

      if (rowData.cash < 0) {
        row.classList.add(
          "negative-cash"
        );
      }

      const monthCell =
        document.createElement("td");

      monthCell.textContent =
        displayMode === "yearly"
          ? `${rowData.month}年`
          : formatMonthJapanese(
              rowData.month
            );

      row.appendChild(monthCell);

      row.appendChild(
        createCashFlowCell(
          rowData.income
        )
      );

      row.appendChild(
        createCashFlowCell(
          rowData.livingAndEventExpense
        )
      );

      row.appendChild(
        createCashFlowCell(
          rowData.housingExpense
        )
      );

      row.appendChild(
        createCashFlowCell(
          rowData.eventExpense
        )
      );

      row.appendChild(
        createCashFlowCell(
          rowData.investmentContribution
        )
      );

      row.appendChild(
        createCashFlowCell(
          rowData.monthlyBalance,
          true
        )
      );

      row.appendChild(
        createCashFlowCell(
          rowData.cash
        )
      );

      row.appendChild(
        createCashFlowCell(
          rowData.investmentAsset
        )
      );

      row.appendChild(
        createCashFlowCell(
          rowData.mortgageBalance
        )
      );

      row.appendChild(
        createCashFlowCell(
          rowData.netWorth
        )
      );

      if (
        displayMode === "monthly"
      ) {
        row.addEventListener(
          "click",
          () => {
            selectedCashFlowMonth =
              rowData.month;

            renderCashFlowTable();
            renderCashFlowDetail(
              rowData
            );
          }
        );
      }

      body.appendChild(row);
    }
  );
}

function createBreakdownRow(
  label,
  value,
  signed = false
) {
  const row =
    document.createElement("div");

  row.className =
    "cashflow-breakdown-row";

  const labelElement =
    document.createElement("span");

  labelElement.textContent =
    label;

  const valueElement =
    document.createElement("strong");

  valueElement.textContent =
    signed
      ? formatSignedYen(
          Math.round(value)
        )
      : formatYen(
          Math.round(value)
        );

  row.appendChild(
    labelElement
  );

  row.appendChild(
    valueElement
  );

  return row;
}

function appendBreakdownItems(
  container,
  items,
  signed = false
) {
  container.innerHTML = "";

  if (
    !items ||
    items.length === 0
  ) {
    container.appendChild(
      createBreakdownRow(
        "該当項目なし",
        0
      )
    );

    return;
  }

  items.forEach(
    item => {
      container.appendChild(
        createBreakdownRow(
          item.label,
          item.value,
          signed
        )
      );
    }
  );
}

function renderCashFlowDetail(
  row
) {
  getElement(
    "cashFlowDetailEmpty"
  ).classList.add("hidden");

  getElement(
    "cashFlowDetailContent"
  ).classList.remove("hidden");

  getElement(
    "cashFlowDetailHeading"
  ).textContent =
    `${formatMonthJapanese(
      row.month
    )}の内訳`;

  appendBreakdownItems(
    getElement(
      "cashFlowIncomeBreakdown"
    ),
    row.incomeItems,
    true
  );

  appendBreakdownItems(
    getElement(
      "cashFlowExpenseBreakdown"
    ),
    row.expenseItems
  );

  appendBreakdownItems(
    getElement(
      "cashFlowInvestmentBreakdown"
    ),
    [
      ...row.investmentItems,

      {
        label:
          "実際の投資額",

        value:
          row.investmentContribution
      }
    ],
    true
  );

  appendBreakdownItems(
    getElement(
      "cashFlowBalanceBreakdown"
    ),
    [
      {
        label: "月間収支",
        value: row.monthlyBalance
      },

      {
        label: "現金残高",
        value: row.cash
      },

      {
        label: "投資評価額",
        value:
          row.investmentAsset
      },

      {
        label: "住宅ローン残高",
        value:
          row.mortgageBalance
      },

      {
        label: "純資産",
        value: row.netWorth
      }
    ],
    true
  );
}

function clearCashFlowDetail() {
  getElement(
    "cashFlowDetailHeading"
  ).textContent =
    "月の内訳";

  getElement(
    "cashFlowDetailEmpty"
  ).classList.remove("hidden");

  getElement(
    "cashFlowDetailContent"
  ).classList.add("hidden");
}
