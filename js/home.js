"use strict";

/* ------------------------------
   Home rendering
------------------------------ */

function renderHome() {
  const selectedMonth =
    getElement("globalMonth").value;

  const record =
    appData.monthlyData[selectedMonth];

  const hasData =
    Boolean(record);

  getElement("homeEmptyNotice")
    .classList.toggle(
      "hidden",
      hasData
    );

  const calculation =
    calculateMonthlyRecord(record);

  getElement("heroMonthLabel")
    .textContent =
    `${formatMonthJapanese(selectedMonth)}の純資産`;

  getElement("homeNetWorth")
    .textContent =
    formatYen(calculation.netWorth);

  getElement("homeCash")
    .textContent =
    formatYen(calculation.cash);

  getElement("homeInvestmentPrincipal")
    .textContent =
    formatYen(
      calculation.investmentPrincipal
    );

  getElement("homeInvestmentValue")
    .textContent =
    formatYen(
      calculation.investmentValue
    );

  getElement("homeDebt")
    .textContent =
    formatYen(calculation.totalDebt);

  getElement("homeIncome")
    .textContent =
    formatYen(calculation.income);

  getElement("homeLivingExpense")
    .textContent =
    formatYen(
      calculation.livingExpenseTotal
    );

  getElement("homeEventExpense")
    .textContent =
    formatYen(
      calculation.eventExpense
    );

  getElement("homeTotalExpense")
    .textContent =
    formatYen(
      calculation.totalExpense
    );

  const monthlyBalanceElement =
    getElement("homeMonthlyBalance");

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

  const profitElement =
    getElement("homeInvestmentProfit");

  profitElement.textContent =
    `含み損益 ${formatSignedYen(
      calculation.investmentProfit
    )}`;

  profitElement.style.color =
    calculation.investmentProfit > 0
      ? "var(--green)"
      : calculation.investmentProfit < 0
        ? "var(--red)"
        : "var(--muted)";

  getElement("homeProfitRate")
    .textContent =
    `${calculation
      .investmentProfitRate
      .toFixed(1)}%`;

  const targetAsset =
    Number(
      appData.settings.targetAsset || 0
    );

  const goalPercent =
    targetAsset > 0
      ? Math.max(
          0,
          Math.min(
            (
              calculation.netWorth /
              targetAsset
            ) * 100,
            100
          )
        )
      : 0;

  getElement("homeGoalPercent")
    .textContent =
    `${goalPercent.toFixed(1)}%`;

  getElement("homeGoalBar")
    .style.width =
    `${goalPercent}%`;

  getElement("homeGoalRemaining")
    .textContent =
    `あと ${formatYen(
      Math.max(
        targetAsset -
        calculation.netWorth,
        0
      )
    )}`;

  const emergencyTarget =
    Number(
      appData.settings
        .minimumMonthlyExpense || 0
    ) *
    Number(
      appData.settings
        .emergencyFundMonths || 0
    );

  const emergencyPercent =
    emergencyTarget > 0
      ? Math.min(
          (
            calculation.cash /
            emergencyTarget
          ) * 100,
          100
        )
      : 0;

  getElement("homeEmergencyText")
    .textContent =
    `生活防衛資金 ${emergencyPercent.toFixed(0)}%`;

  getElement("homeEmergencyTarget")
    .textContent =
    formatYen(emergencyTarget);

  renderMonthlyChange(
    selectedMonth,
    calculation.netWorth
  );

  getElement("homeNote")
    .textContent =
    record?.note?.trim() ||
    "メモはありません。";

  renderNetWorthChart();
}

function renderMonthlyChange(
  selectedMonth,
  currentNetWorth
) {
  const previousMonth =
    getPreviousMonth(selectedMonth);

  const previousRecord =
    appData.monthlyData[previousMonth];

  const badge =
    getElement("homeMonthlyChange");

  badge.classList.remove(
    "positive",
    "negative",
    "neutral"
  );

  if (!previousRecord) {
    badge.textContent =
      "前月データなし";

    badge.classList.add("neutral");

    return;
  }

  const previousCalculation =
    calculateMonthlyRecord(
      previousRecord
    );

  const difference =
    currentNetWorth -
    previousCalculation.netWorth;

  badge.textContent =
    `前月比 ${formatSignedYen(
      difference
    )}`;

  if (difference > 0) {
    badge.classList.add("positive");
  } else if (difference < 0) {
    badge.classList.add("negative");
  } else {
    badge.classList.add("neutral");
  }
}

function renderNetWorthChart() {
  const entries =
    Object.entries(appData.monthlyData)
      .sort(
        ([monthA], [monthB]) =>
          monthA.localeCompare(monthB)
      )
      .map(
        ([month, record]) => ({
          month,
          netWorth:
            calculateMonthlyRecord(record)
              .netWorth
        })
      );

  getElement("chartDataCount")
    .textContent =
    `${entries.length}か月`;

  const chartEmpty =
    getElement("chartEmpty");

  const chartLine =
    getElement("chartLine");

  const chartAreaPolygon =
    getElement("chartAreaPolygon");

  const chartPoints =
    getElement("chartPoints");

  const chartLabels =
    getElement("chartLabels");

  const chartGrid =
    getElement("chartGrid");

  chartPoints.innerHTML = "";
  chartLabels.innerHTML = "";
  chartGrid.innerHTML = "";

  if (entries.length < 2) {
    chartEmpty.classList.remove("hidden");

    chartLine.setAttribute(
      "points",
      ""
    );

    chartAreaPolygon.setAttribute(
      "points",
      ""
    );

    return;
  }

  chartEmpty.classList.add("hidden");

  const chartWidth = 800;
  const chartHeight = 240;
  const topPadding = 20;
  const bottomY = 250;
  const horizontalPadding = 18;

  const values =
    entries.map(
      entry => entry.netWorth
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

  const points =
    entries.map(
      (entry, index) => {
        const x =
          horizontalPadding +
          (
            index /
            (entries.length - 1)
          ) *
          (
            chartWidth -
            horizontalPadding * 2
          );

        const ratio =
          (
            entry.netWorth -
            minimum
          ) /
          range;

        const y =
          topPadding +
          (
            1 - ratio
          ) *
          (
            chartHeight -
            topPadding
          );

        return {
          ...entry,
          x,
          y
        };
      }
    );

  const linePoints =
    points
      .map(
        point =>
          `${point.x},${point.y}`
      )
      .join(" ");

  chartLine.setAttribute(
    "points",
    linePoints
  );

  chartAreaPolygon.setAttribute(
    "points",
    `${linePoints} ` +
    `${points.at(-1).x},${bottomY} ` +
    `${points[0].x},${bottomY}`
  );

  for (
    let lineIndex = 0;
    lineIndex < 5;
    lineIndex += 1
  ) {
    const line =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );

    const y =
      20 +
      lineIndex * 55;

    line.setAttribute("x1", "0");
    line.setAttribute("x2", "800");
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute(
      "class",
      "chart-grid-line"
    );

    chartGrid.appendChild(line);
  }

  points.forEach(
    point => {
      const circle =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );

      circle.setAttribute(
        "cx",
        String(point.x)
      );

      circle.setAttribute(
        "cy",
        String(point.y)
      );

      circle.setAttribute(
        "r",
        "5"
      );

      circle.setAttribute(
        "class",
        "chart-point"
      );

      const title =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "title"
        );

      title.textContent =
        `${formatMonthJapanese(
          point.month
        )}：${formatYen(
          point.netWorth
        )}`;

      circle.appendChild(title);

      chartPoints.appendChild(circle);
    }
  );

  const labelIndexes =
    [...new Set([
      0,
      Math.floor(
        (entries.length - 1) / 2
      ),
      entries.length - 1
    ])];

  labelIndexes.forEach(
    index => {
      const label =
        document.createElement("span");

      const month =
        entries[index].month;

      label.textContent =
        month.replace("-", "/");

      chartLabels.appendChild(label);
    }
  );
}
