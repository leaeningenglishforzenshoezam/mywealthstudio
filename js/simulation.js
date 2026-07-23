"use strict";

/* ------------------------------
   Simulation page
------------------------------ */

function buildSimulationSelectors() {
  const baseMonthSelect =
    getElement("simulationBaseMonth");

  const housingPlanSelect =
    getElement("simulationHousingPlan");

  const previousBaseMonth =
    baseMonthSelect.value;

  const previousHousingPlan =
    housingPlanSelect.value;

  baseMonthSelect.innerHTML = "";

  const months =
    Object.keys(appData.monthlyData)
      .sort();

  months.forEach(
    month => {
      const option =
        document.createElement("option");

      option.value = month;
      option.textContent =
        formatMonthJapanese(month);

      baseMonthSelect.appendChild(option);
    }
  );

  if (
    previousBaseMonth &&
    months.includes(previousBaseMonth)
  ) {
    baseMonthSelect.value =
      previousBaseMonth;
  } else if (months.length > 0) {
    baseMonthSelect.value =
      months.at(-1);
  }

  housingPlanSelect.innerHTML = "";

  const noHousingOption =
    document.createElement("option");

  noHousingOption.value = "";
  noHousingOption.textContent =
    "住宅購入を反映しない";

  housingPlanSelect.appendChild(
    noHousingOption
  );

  appData.housingPlans
    .map(normalizeHousingPlan)
    .forEach(
      plan => {
        const option =
          document.createElement("option");

        option.value = plan.id;

        option.textContent =
          `${plan.name || "名称未設定"} ` +
          `（${formatMonthJapanese(
            plan.purchaseMonth
          )}）`;

        housingPlanSelect.appendChild(
          option
        );
      }
    );

  if (
    previousHousingPlan &&
    appData.housingPlans.some(
      plan =>
        String(plan.id) ===
        previousHousingPlan
    )
  ) {
    housingPlanSelect.value =
      previousHousingPlan;
  }
}

function fillSimulationConditions() {
  getElement(
    "simulationEndAgeInput"
  ).value =
    Number(
      appData.settings
        .simulationEndAge || 65
    );

  getElement(
    "simulationReturnRate"
  ).value =
    Number(
      appData.settings
        .investmentAnnualReturn || 0
    );

  getElement(
    "simulationMonthlyInvestment"
  ).value =
    Number(
      appData.settings
        .baseMonthlyInvestment || 0
    );

  getElement(
    "simulationExpenseInflationRate"
  ).value =
    Number(
      appData.settings
        .expenseInflationRate || 2
    );

  getElement(
    "simulationMeAnnualRaise"
  ).value =
    Number(
      appData.settings
        .meAnnualRaise || 8000
    );

  getElement(
    "simulationSpouseAnnualRaise"
  ).value =
    Number(
      appData.settings
        .spouseAnnualRaise || 0
    );

  getElement(
    "simulationRaiseMonth"
  ).value =
    Number(
      appData.settings
        .raiseMonth || 4
    );

  getElement(
    "simulationMeRetirementMonth"
  ).value =
    appData.settings
      .meRetirementMonth || "";

  getElement(
    "simulationMeRetirementPayment"
  ).value =
    Number(
      appData.settings
        .meRetirementPayment || 0
    );

  getElement(
    "simulationSpouseRetirementMonth"
  ).value =
    appData.settings
      .spouseRetirementMonth || "";

  getElement(
    "simulationSpouseRetirementPayment"
  ).value =
    Number(
      appData.settings
        .spouseRetirementPayment || 0
    );

  getElement(
    "simulationMinimumCash"
  ).value =
    Number(
      appData.settings
        .simulationMinimumCash || 0
    );

  getElement(
    "simulationCashShortageAction"
  ).value =
    appData.settings
      .simulationCashShortageAction ||
    "reduceThenWithdraw";

  getElement(
    "simulationIncludeEvents"
  ).checked = true;
}

function getSimulationHousingPlan() {
  const planId =
    getElement(
      "simulationHousingPlan"
    ).value;

  if (!planId) {
    return null;
  }

  return (
    appData.housingPlans
      .map(normalizeHousingPlan)
      .find(
        plan =>
          String(plan.id) ===
          String(planId)
      ) || null
  );
}

function readSimulationConditions() {
  return {
    baseMonth:
      getElement(
        "simulationBaseMonth"
      ).value,

    housingPlan:
      getSimulationHousingPlan(),

    endAge:
      Number(
        getElement(
          "simulationEndAgeInput"
        ).value || 65
      ),

    annualReturn:
      Number(
        getElement(
          "simulationReturnRate"
        ).value || 0
      ),

    monthlyInvestment:
      Number(
        getElement(
          "simulationMonthlyInvestment"
        ).value || 0
      ),

    expenseInflationRate:
      Number(
        getElement(
          "simulationExpenseInflationRate"
        ).value || 0
      ),

    meAnnualRaise:
      Number(
        getElement(
          "simulationMeAnnualRaise"
        ).value || 0
      ),

    spouseAnnualRaise:
      Number(
        getElement(
          "simulationSpouseAnnualRaise"
        ).value || 0
      ),

    raiseMonth:
      Number(
        getElement(
          "simulationRaiseMonth"
        ).value || 4
      ),

    meRetirementMonth:
      getElement(
        "simulationMeRetirementMonth"
      ).value,

    meRetirementPayment:
      Number(
        getElement(
          "simulationMeRetirementPayment"
        ).value || 0
      ),

    spouseRetirementMonth:
      getElement(
        "simulationSpouseRetirementMonth"
      ).value,

    spouseRetirementPayment:
      Number(
        getElement(
          "simulationSpouseRetirementPayment"
        ).value || 0
      ),

    minimumCash:
      Number(
        getElement(
          "simulationMinimumCash"
        ).value || 0
      ),

    cashShortageAction:
      getElement(
        "simulationCashShortageAction"
      ).value,

    includeEvents:
      getElement(
        "simulationIncludeEvents"
      ).checked
  };
}

function runSimulationPage() {
  const conditions =
    readSimulationConditions();

  if (!conditions.baseMonth) {
    clearSimulationResults();

    renderSimulationWarnings([
      "計算開始月として使えるMonthlyデータがありません。"
    ]);

    return;
  }

  const originalSettings =
    deepClone(appData.settings);

  let result;

  try {
    appData.settings = {
      ...appData.settings,

      simulationEndAge:
        conditions.endAge,

      investmentAnnualReturn:
        conditions.annualReturn,

      baseMonthlyInvestment:
        conditions.monthlyInvestment
    };

    result =
      runFinancialEngine({
        baseMonth:
          conditions.baseMonth,

        housingPlan:
          conditions.housingPlan,

        options: {
          expenseInflationRate:
            conditions.expenseInflationRate,

          meAnnualRaise:
            conditions.meAnnualRaise,

          spouseAnnualRaise:
            conditions.spouseAnnualRaise,

          raiseMonth:
            conditions.raiseMonth,

          meRetirementMonth:
            conditions.meRetirementMonth,

          meRetirementPayment:
            conditions.meRetirementPayment,

          spouseRetirementMonth:
            conditions.spouseRetirementMonth,

          spouseRetirementPayment:
            conditions.spouseRetirementPayment,

          minimumCash:
            conditions.minimumCash,

          cashShortageAction:
            conditions.cashShortageAction,

          includeEvents:
            conditions.includeEvents
        }
      });
  } finally {
    appData.settings =
      originalSettings;
  }

  renderSimulationWarnings(
    result.warnings
  );

  renderSimulationSummary(
    result.rows
  );

  renderSimulationAssetChart(
    result.rows
  );

  renderSimulationLoanChart(
    result.rows,
    conditions.housingPlan
  );

  renderSimulationCheckpoints(
    result.rows,
    conditions.housingPlan
  );
}

function renderSimulationWarnings(
  warnings
) {
  const warningElement =
    getElement("simulationWarning");

  if (
    !warnings ||
    warnings.length === 0
  ) {
    warningElement.textContent = "";
    warningElement.classList.add(
      "hidden"
    );

    return;
  }

  warningElement.textContent =
    warnings.join("\n");

  warningElement.classList.remove(
    "hidden"
  );
}

function renderSimulationSummary(rows) {
  if (!rows || rows.length === 0) {
    clearSimulationResults();
    return;
  }

  const endingRow =
    rows.at(-1);

  const minimumCashRow =
    rows.reduce(
      (minimum, row) =>
        row.cash < minimum.cash
          ? row
          : minimum,
      rows[0]
    );

  const firstNegativeRow =
    rows.find(
      row =>
        row.cash < 0
    );

  getElement(
    "simulationEndingNetWorth"
  ).textContent =
    formatYen(endingRow.netWorth);

  getElement(
    "simulationEndingMonth"
  ).textContent =
    formatMonthJapanese(
      endingRow.month
    );

  getElement(
    "simulationEndingCash"
  ).textContent =
    formatYen(endingRow.cash);

  getElement(
    "simulationEndingInvestment"
  ).textContent =
    formatYen(
      endingRow.investmentAsset
    );

  getElement(
    "simulationEndingLoan"
  ).textContent =
    formatYen(
      endingRow.mortgageBalance
    );

  getElement(
    "simulationMinimumCash"
  ).textContent =
    formatYen(
      minimumCashRow.cash
    );

  getElement(
    "simulationMinimumCashMonth"
  ).textContent =
    formatMonthJapanese(
      minimumCashRow.month
    );

  getElement(
    "simulationFirstNegativeMonth"
  ).textContent =
    firstNegativeRow
      ? formatMonthJapanese(
          firstNegativeRow.month
        )
      : "なし";

  const minimumCashElement =
    getElement(
      "simulationMinimumCash"
    );

  minimumCashElement.style.color =
    minimumCashRow.cash < 0
      ? "var(--red)"
      : "var(--text)";

  const firstNegativeElement =
    getElement(
      "simulationFirstNegativeMonth"
    );

  firstNegativeElement.style.color =
    firstNegativeRow
      ? "var(--red)"
      : "var(--green)";
}

function clearSimulationResults() {
  [
    "simulationEndingNetWorth",
    "simulationEndingCash",
    "simulationEndingInvestment",
    "simulationEndingLoan",
    "simulationMinimumCash"
  ].forEach(
    id => {
      getElement(id).textContent =
        formatYen(0);
    }
  );

  getElement(
    "simulationEndingMonth"
  ).textContent =
    "計算データなし";

  getElement(
    "simulationMinimumCashMonth"
  ).textContent =
    "計算データなし";

  getElement(
    "simulationFirstNegativeMonth"
  ).textContent =
    "なし";

  getElement(
    "simulationAssetDataCount"
  ).textContent =
    "0か月";

  getElement(
    "simulationLoanDataCount"
  ).textContent =
    "0か月";

  clearSimulationChart(
    "simulationAssetChartEmpty",
    [
      "simulationCashLine",
      "simulationInvestmentLine",
      "simulationNetWorthLine"
    ],
    "simulationAssetChartGrid",
    "simulationAssetChartLabels"
  );

  clearSimulationChart(
    "simulationLoanChartEmpty",
    [
      "simulationLoanLine"
    ],
    "simulationLoanChartGrid",
    "simulationLoanChartLabels"
  );

  getElement(
    "simulationCheckpointBody"
  ).innerHTML =
    `
      <tr>
        <td colspan="6">
          計算すると年齢別の資産状況が表示されます。
        </td>
      </tr>
    `;
}

function clearSimulationChart(
  emptyId,
  lineIds,
  gridId,
  labelsId
) {
  getElement(emptyId)
    .classList.remove("hidden");

  lineIds.forEach(
    id => {
      getElement(id).setAttribute(
        "points",
        ""
      );
    }
  );

  getElement(gridId).innerHTML = "";
  getElement(labelsId).innerHTML = "";
}

function createSimulationChartPoints(
  rows,
  valueGetter
) {
  const chartWidth = 800;
  const chartHeight = 240;
  const topPadding = 20;
  const horizontalPadding = 18;

  const values =
    rows.map(valueGetter);

  let minimum =
    Math.min(...values);

  let maximum =
    Math.max(...values);

  if (minimum === maximum) {
    minimum -= 100000;
    maximum += 100000;
  }

  const range =
    maximum - minimum;

  return rows.map(
    (row, index) => {
      const x =
        horizontalPadding +
        (
          index /
          Math.max(
            rows.length - 1,
            1
          )
        ) *
        (
          chartWidth -
          horizontalPadding * 2
        );

      const ratio =
        (
          valueGetter(row) -
          minimum
        ) / range;

      const y =
        topPadding +
        (1 - ratio) *
        (
          chartHeight -
          topPadding
        );

      return {
        month: row.month,
        value: valueGetter(row),
        x,
        y
      };
    }
  );
}

function renderSimulationGrid(
  gridElement
) {
  gridElement.innerHTML = "";

  for (
    let index = 0;
    index < 5;
    index += 1
  ) {
    const line =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );

    const y =
      20 + index * 55;

    line.setAttribute("x1", "0");
    line.setAttribute("x2", "800");
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute(
      "class",
      "chart-grid-line"
    );

    gridElement.appendChild(line);
  }
}

function renderSimulationLabels(
  labelsElement,
  rows
) {
  labelsElement.innerHTML = "";

  if (rows.length === 0) {
    return;
  }

  const indexes =
    [...new Set([
      0,
      Math.floor(
        (rows.length - 1) / 2
      ),
      rows.length - 1
    ])];

  indexes.forEach(
    index => {
      const label =
        document.createElement("span");

      label.textContent =
        rows[index].month.replace(
          "-",
          "/"
        );

      labelsElement.appendChild(
        label
      );
    }
  );
}

function setSimulationPolyline(
  elementId,
  points
) {
  getElement(elementId)
    .setAttribute(
      "points",
      points
        .map(
          point =>
            `${point.x},${point.y}`
        )
        .join(" ")
    );
}

function renderSimulationAssetChart(
  rows
) {
  const emptyElement =
    getElement(
      "simulationAssetChartEmpty"
    );

  getElement(
    "simulationAssetDataCount"
  ).textContent =
    `${rows.length}か月`;

  if (!rows || rows.length < 2) {
    clearSimulationChart(
      "simulationAssetChartEmpty",
      [
        "simulationCashLine",
        "simulationInvestmentLine",
        "simulationNetWorthLine"
      ],
      "simulationAssetChartGrid",
      "simulationAssetChartLabels"
    );

    return;
  }

  emptyElement.classList.add(
    "hidden"
  );

  const allValues =
    rows.flatMap(
      row => [
        row.cash,
        row.investmentAsset,
        row.netWorth
      ]
    );

  let minimum =
    Math.min(...allValues);

  let maximum =
    Math.max(...allValues);

  if (minimum === maximum) {
    minimum -= 100000;
    maximum += 100000;
  }

  const createPoints =
    valueGetter => {
      const chartWidth = 800;
      const chartHeight = 240;
      const topPadding = 20;
      const horizontalPadding = 18;
      const range =
        maximum - minimum;

      return rows.map(
        (row, index) => {
          const x =
            horizontalPadding +
            (
              index /
              (rows.length - 1)
            ) *
            (
              chartWidth -
              horizontalPadding * 2
            );

          const ratio =
            (
              valueGetter(row) -
              minimum
            ) / range;

          const y =
            topPadding +
            (1 - ratio) *
            (
              chartHeight -
              topPadding
            );

          return {
            x,
            y
          };
        }
      );
    };

  setSimulationPolyline(
    "simulationCashLine",
    createPoints(
      row => row.cash
    )
  );

  setSimulationPolyline(
    "simulationInvestmentLine",
    createPoints(
      row =>
        row.investmentAsset
    )
  );

  setSimulationPolyline(
    "simulationNetWorthLine",
    createPoints(
      row => row.netWorth
    )
  );

  renderSimulationGrid(
    getElement(
      "simulationAssetChartGrid"
    )
  );

  renderSimulationLabels(
    getElement(
      "simulationAssetChartLabels"
    ),
    rows
  );

  attachSimulationAssetChartHover(
    rows,
    getSimulationHousingPlan()
  );
}

function renderSimulationLoanChart(
  rows,
  housingPlan
) {
  getElement(
    "simulationLoanDataCount"
  ).textContent =
    `${rows.length}か月`;

  if (
    !housingPlan ||
    !rows ||
    rows.length < 2 ||
    !rows.some(
      row =>
        row.mortgageBalance > 0
    )
  ) {
    clearSimulationChart(
      "simulationLoanChartEmpty",
      [
        "simulationLoanLine"
      ],
      "simulationLoanChartGrid",
      "simulationLoanChartLabels"
    );

    return;
  }

  getElement(
    "simulationLoanChartEmpty"
  ).classList.add("hidden");

  const points =
    createSimulationChartPoints(
      rows,
      row =>
        row.mortgageBalance
    );

  setSimulationPolyline(
    "simulationLoanLine",
    points
  );

  renderSimulationGrid(
    getElement(
      "simulationLoanChartGrid"
    )
  );

  renderSimulationLabels(
    getElement(
      "simulationLoanChartLabels"
    ),
    rows
  );

  attachSimulationLoanChartHover(
    rows,
    housingPlan
  );
}


function ensureSimulationChartHoverElements({
  areaId,
  svgId,
  hoverLineId,
  hoverGroupId,
  tooltipId
}) {
  const area = getElement(areaId);
  const svg = getElement(svgId);

  area.classList.add(
    "simulation-chart-hover-area"
  );

  let hoverLine =
    document.getElementById(
      hoverLineId
    );

  if (!hoverLine) {
    hoverLine =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );

    hoverLine.id = hoverLineId;
    hoverLine.setAttribute(
      "class",
      "simulation-hover-line hidden"
    );
    hoverLine.setAttribute("y1", "20");
    hoverLine.setAttribute("y2", "240");
    svg.appendChild(hoverLine);
  }

  let hoverGroup =
    document.getElementById(
      hoverGroupId
    );

  if (!hoverGroup) {
    hoverGroup =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
      );

    hoverGroup.id = hoverGroupId;
    hoverGroup.setAttribute(
      "class",
      "hidden"
    );
    svg.appendChild(hoverGroup);
  }

  let tooltip =
    document.getElementById(
      tooltipId
    );

  if (!tooltip) {
    tooltip =
      document.createElement("div");

    tooltip.id = tooltipId;
    tooltip.className =
      "simulation-chart-tooltip hidden";
    area.appendChild(tooltip);
  }

  return {
    area,
    svg,
    hoverLine,
    hoverGroup,
    tooltip
  };
}

function addSimulationHoverPoint(
  group,
  x,
  y,
  className
) {
  const circle =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );

  circle.setAttribute("cx", String(x));
  circle.setAttribute("cy", String(y));
  circle.setAttribute("r", "6");
  circle.setAttribute(
    "class",
    `simulation-hover-point ${className}`
  );

  group.appendChild(circle);
}

function positionSimulationTooltip(
  tooltip,
  area,
  clientX,
  clientY
) {
  const areaRect =
    area.getBoundingClientRect();

  const tooltipWidth =
    tooltip.offsetWidth || 280;

  const tooltipHeight =
    tooltip.offsetHeight || 190;

  let left =
    clientX -
    areaRect.left +
    14;

  let top =
    clientY -
    areaRect.top +
    14;

  if (
    left + tooltipWidth >
    areaRect.width - 8
  ) {
    left =
      clientX -
      areaRect.left -
      tooltipWidth -
      14;
  }

  if (
    top + tooltipHeight >
    areaRect.height - 8
  ) {
    top =
      Math.max(
        8,
        areaRect.height -
        tooltipHeight -
        8
      );
  }

  tooltip.style.left =
    `${Math.max(8, left)}px`;

  tooltip.style.top =
    `${Math.max(8, top)}px`;
}

function getSimulationHoverIndex(
  event,
  svg,
  rowCount
) {
  const rect =
    svg.getBoundingClientRect();

  const relativeX =
    Math.max(
      0,
      Math.min(
        event.clientX - rect.left,
        rect.width
      )
    );

  const ratio =
    rect.width > 0
      ? relativeX / rect.width
      : 0;

  return Math.max(
    0,
    Math.min(
      rowCount - 1,
      Math.round(
        ratio *
        (rowCount - 1)
      )
    )
  );
}

function createSimulationHoverScale(
  rows,
  valueGetters
) {
  const values =
    rows.flatMap(
      row =>
        valueGetters.map(
          getter =>
            getter(row)
        )
    );

  let minimum =
    Math.min(...values);

  let maximum =
    Math.max(...values);

  if (minimum === maximum) {
    minimum -= 100000;
    maximum += 100000;
  }

  const range =
    maximum - minimum;

  return {
    getX(index) {
      return (
        18 +
        (
          index /
          Math.max(
            rows.length - 1,
            1
          )
        ) *
        764
      );
    },

    getY(value) {
      return (
        20 +
        (
          1 -
          (
            value - minimum
          ) / range
        ) *
        220
      );
    }
  };
}

function buildSimulationAssetTooltip(
  row,
  age
) {
  const retirementText =
    row.retirementIncome > 0
      ? `
        <div class="simulation-tooltip-highlight">
          退職金 ${formatYen(
            row.retirementIncome
          )}
        </div>
      `
      : "";

  const reductionText =
    row.automaticInvestmentReduction > 0
      ? `
        <div class="simulation-tooltip-warning">
          積立自動減額 ${formatYen(
            row.automaticInvestmentReduction
          )}
        </div>
      `
      : "";

  const withdrawalText =
    row.investmentWithdrawal > 0
      ? `
        <div class="simulation-tooltip-warning">
          投資取崩し ${formatYen(
            row.investmentWithdrawal
          )}
        </div>
      `
      : "";

  return `
    <div class="simulation-tooltip-title">
      ${formatMonthJapanese(row.month)}
      ・${age}歳
    </div>

    <div class="simulation-tooltip-grid">
      <span>本人収入</span>
      <strong>${formatYen(
        row.meIncome || 0
      )}</strong>

      <span>配偶者収入</span>
      <strong>${formatYen(
        row.spouseIncome || 0
      )}</strong>

      <span>月間収支</span>
      <strong>${formatSignedYen(
        row.monthlyBalance
      )}</strong>

      <span>実際の投資額</span>
      <strong>${formatYen(
        row.investmentContribution
      )}</strong>

      <span>現金</span>
      <strong>${formatYen(
        row.cash
      )}</strong>

      <span>投資資産</span>
      <strong>${formatYen(
        row.investmentAsset
      )}</strong>

      <span>ローン残高</span>
      <strong>${formatYen(
        row.mortgageBalance
      )}</strong>

      <span>純資産</span>
      <strong>${formatYen(
        row.netWorth
      )}</strong>
    </div>

    ${retirementText}
    ${reductionText}
    ${withdrawalText}
  `;
}

function attachSimulationAssetChartHover(
  rows,
  housingPlan
) {
  if (!rows || rows.length < 2) {
    return;
  }

  const elements =
    ensureSimulationChartHoverElements({
      areaId:
        "simulationAssetChartArea",
      svgId:
        "simulationAssetChart",
      hoverLineId:
        "simulationAssetHoverLine",
      hoverGroupId:
        "simulationAssetHoverPoints",
      tooltipId:
        "simulationAssetTooltip"
    });

  const birthMonth =
    getSimulationBorrowerBirthMonth(
      housingPlan
    );

  const scale =
    createSimulationHoverScale(
      rows,
      [
        row => row.cash,
        row =>
          row.investmentAsset,
        row => row.netWorth
      ]
    );

  elements.svg.onmousemove =
    event => {
      const index =
        getSimulationHoverIndex(
          event,
          elements.svg,
          rows.length
        );

      const row = rows[index];
      const x = scale.getX(index);

      elements.hoverLine.setAttribute(
        "x1",
        String(x)
      );
      elements.hoverLine.setAttribute(
        "x2",
        String(x)
      );
      elements.hoverLine.classList.remove(
        "hidden"
      );

      elements.hoverGroup.innerHTML = "";

      addSimulationHoverPoint(
        elements.hoverGroup,
        x,
        scale.getY(row.cash),
        "cash-point"
      );

      addSimulationHoverPoint(
        elements.hoverGroup,
        x,
        scale.getY(
          row.investmentAsset
        ),
        "investment-point"
      );

      addSimulationHoverPoint(
        elements.hoverGroup,
        x,
        scale.getY(row.netWorth),
        "net-worth-point"
      );

      elements.hoverGroup.classList.remove(
        "hidden"
      );

      const age =
        calculateSimulationAge(
          birthMonth,
          row.month
        );

      elements.tooltip.innerHTML =
        buildSimulationAssetTooltip(
          row,
          age
        );

      elements.tooltip.classList.remove(
        "hidden"
      );

      positionSimulationTooltip(
        elements.tooltip,
        elements.area,
        event.clientX,
        event.clientY
      );
    };

  elements.svg.onmouseleave =
    () => {
      elements.hoverLine.classList.add(
        "hidden"
      );
      elements.hoverGroup.classList.add(
        "hidden"
      );
      elements.tooltip.classList.add(
        "hidden"
      );
    };
}

function attachSimulationLoanChartHover(
  rows,
  housingPlan
) {
  if (
    !housingPlan ||
    !rows ||
    rows.length < 2
  ) {
    return;
  }

  const elements =
    ensureSimulationChartHoverElements({
      areaId:
        "simulationLoanChartArea",
      svgId:
        "simulationLoanChart",
      hoverLineId:
        "simulationLoanHoverLine",
      hoverGroupId:
        "simulationLoanHoverPoints",
      tooltipId:
        "simulationLoanTooltip"
    });

  const birthMonth =
    getSimulationBorrowerBirthMonth(
      housingPlan
    );

  const scale =
    createSimulationHoverScale(
      rows,
      [
        row =>
          row.mortgageBalance
      ]
    );

  elements.svg.onmousemove =
    event => {
      const index =
        getSimulationHoverIndex(
          event,
          elements.svg,
          rows.length
        );

      const row = rows[index];
      const x = scale.getX(index);

      elements.hoverLine.setAttribute(
        "x1",
        String(x)
      );
      elements.hoverLine.setAttribute(
        "x2",
        String(x)
      );
      elements.hoverLine.classList.remove(
        "hidden"
      );

      elements.hoverGroup.innerHTML = "";

      addSimulationHoverPoint(
        elements.hoverGroup,
        x,
        scale.getY(
          row.mortgageBalance
        ),
        "loan-point"
      );

      elements.hoverGroup.classList.remove(
        "hidden"
      );

      const age =
        calculateSimulationAge(
          birthMonth,
          row.month
        );

      elements.tooltip.innerHTML = `
        <div class="simulation-tooltip-title">
          ${formatMonthJapanese(
            row.month
          )}
          ・${age}歳
        </div>

        <div class="simulation-tooltip-grid">
          <span>ローン残高</span>
          <strong>${formatYen(
            row.mortgageBalance
          )}</strong>

          <span>毎月返済額</span>
          <strong>${formatYen(
            row.mortgagePayment
          )}</strong>

          <span>固定資産税</span>
          <strong>${formatYen(
            row.propertyTax
          )}</strong>

          <span>住宅修繕積立</span>
          <strong>${formatYen(
            row.homeMaintenance
          )}</strong>
        </div>
      `;

      elements.tooltip.classList.remove(
        "hidden"
      );

      positionSimulationTooltip(
        elements.tooltip,
        elements.area,
        event.clientX,
        event.clientY
      );
    };

  elements.svg.onmouseleave =
    () => {
      elements.hoverLine.classList.add(
        "hidden"
      );
      elements.hoverGroup.classList.add(
        "hidden"
      );
      elements.tooltip.classList.add(
        "hidden"
      );
    };
}

function getSimulationBorrowerBirthMonth(
  housingPlan
) {
  return (
    housingPlan
      ?.borrowerBirthMonth ||
    "1998-07"
  );
}

function calculateSimulationAge(
  birthMonth,
  targetMonth
) {
  return Math.floor(
    getMonthDifference(
      birthMonth,
      targetMonth
    ) / 12
  );
}

function renderSimulationCheckpoints(
  rows,
  housingPlan
) {
  const body =
    getElement(
      "simulationCheckpointBody"
    );

  body.innerHTML = "";

  if (!rows || rows.length === 0) {
    body.innerHTML =
      `
        <tr>
          <td colspan="6">
            計算データがありません。
          </td>
        </tr>
      `;

    return;
  }

  const birthMonth =
    getSimulationBorrowerBirthMonth(
      housingPlan
    );

  const checkpoints = [];

  rows.forEach(
    row => {
      const age =
        calculateSimulationAge(
          birthMonth,
          row.month
        );

      const isFiveYearAge =
        age >= 30 &&
        age % 5 === 0;

      const previousRow =
        checkpoints.at(-1);

      if (
        isFiveYearAge &&
        previousRow?.age !== age
      ) {
        checkpoints.push({
          age,
          row
        });
      }
    }
  );

  const endingRow =
    rows.at(-1);

  const endingAge =
    calculateSimulationAge(
      birthMonth,
      endingRow.month
    );

  if (
    checkpoints.at(-1)?.row.month !==
    endingRow.month
  ) {
    checkpoints.push({
      age: endingAge,
      row: endingRow
    });
  }

  checkpoints.forEach(
    checkpoint => {
      const rowElement =
        document.createElement("tr");

      const values = [
        `${checkpoint.age}歳`,
        formatMonthJapanese(
          checkpoint.row.month
        ),
        formatYen(
          checkpoint.row.cash
        ),
        formatYen(
          checkpoint.row
            .investmentAsset
        ),
        formatYen(
          checkpoint.row
            .mortgageBalance
        ),
        formatYen(
          checkpoint.row.netWorth
        )
      ];

      values.forEach(
        value => {
          const cell =
            document.createElement("td");

          cell.textContent = value;

          rowElement.appendChild(
            cell
          );
        }
      );

      if (
        checkpoint.row.cash < 0
      ) {
        rowElement.classList.add(
          "simulation-danger-row"
        );
      }

      body.appendChild(
        rowElement
      );
    }
  );
}
