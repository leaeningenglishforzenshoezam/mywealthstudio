"use strict";

/* ------------------------------
   Simulation risk analysis
------------------------------ */

(function initializeSimulationAnalysis() {
  const originalRenderSimulationCheckpoints =
    window.renderSimulationCheckpoints;

  if (
    typeof originalRenderSimulationCheckpoints !==
    "function"
  ) {
    console.warn(
      "Simulation analysis could not start: " +
      "renderSimulationCheckpoints is missing."
    );

    return;
  }

  window.renderSimulationCheckpoints =
    function enhancedRenderSimulationCheckpoints(
      rows,
      housingPlan
    ) {
      originalRenderSimulationCheckpoints(
        rows,
        housingPlan
      );

      renderSimulationAnalysis(
        rows,
        housingPlan
      );
    };
})();

function ensureSimulationAnalysisElements() {
  const page =
    getElement("page-simulation");

  let riskSection =
    document.getElementById(
      "simulationRiskSection"
    );

  if (!riskSection) {
    riskSection =
      document.createElement("section");

    riskSection.id =
      "simulationRiskSection";

    riskSection.className =
      "simulation-analysis-section";

    riskSection.innerHTML = `
      <article
        class="card simulation-risk-overview"
        id="simulationRiskOverview"
      >
        <div class="section-heading">
          <div>
            <p class="eyebrow">
              RISK CHECK
            </p>

            <h3>
              資金面の安全性
            </h3>
          </div>

          <span
            class="simulation-risk-badge"
            id="simulationRiskBadge"
          >
            未計算
          </span>
        </div>

        <div
          class="simulation-risk-primary"
          id="simulationRiskPrimary"
        >
          シミュレーションを実行すると、
          最初に注意が必要になる時期を表示します。
        </div>

        <div
          class="simulation-risk-metrics"
          id="simulationRiskMetrics"
        ></div>
      </article>
    `;

    const summaryGrid =
      page.querySelector(
        ".cashflow-summary-grid"
      );

    if (summaryGrid) {
      summaryGrid.insertAdjacentElement(
        "afterend",
        riskSection
      );
    } else {
      page.prepend(riskSection);
    }
  }

  let turningSection =
    document.getElementById(
      "simulationTurningSection"
    );

  if (!turningSection) {
    turningSection =
      document.createElement("section");

    turningSection.id =
      "simulationTurningSection";

    turningSection.className =
      "card simulation-turning-section";

    turningSection.innerHTML = `
      <div class="section-heading">
        <div>
          <p class="eyebrow">
            TURNING POINTS
          </p>

          <h3>
            主なターニングポイント
          </h3>

          <p>
            家計の状態が大きく変化する時期を
            自動で抽出します。
          </p>
        </div>

        <span
          class="data-count"
          id="simulationTurningCount"
        >
          0件
        </span>
      </div>

      <div
        class="simulation-turning-list"
        id="simulationTurningList"
      ></div>
    `;

    const dashboardGrid =
      page.querySelector(
        ".dashboard-grid"
      );

    if (dashboardGrid) {
      dashboardGrid.insertAdjacentElement(
        "afterend",
        turningSection
      );
    } else {
      page.appendChild(turningSection);
    }
  }
}

function getSimulationAnalysisMinimumCash() {
  const input =
    document.getElementById(
      "simulationMinimumCash"
    );

  return Math.max(
    Number(input?.value || 0),
    0
  );
}

function getSimulationAnalysisBirthMonth(
  housingPlan
) {
  if (
    typeof getSimulationBorrowerBirthMonth ===
    "function"
  ) {
    return getSimulationBorrowerBirthMonth(
      housingPlan
    );
  }

  return (
    housingPlan?.borrowerBirthMonth ||
    "1998-07"
  );
}

function getSimulationAnalysisAge(
  birthMonth,
  month
) {
  if (
    typeof calculateSimulationAge ===
    "function"
  ) {
    return calculateSimulationAge(
      birthMonth,
      month
    );
  }

  return Math.floor(
    getMonthDifference(
      birthMonth,
      month
    ) / 12
  );
}

function getSimulationRowValue(
  row,
  key,
  fallback = 0
) {
  const value =
    Number(row?.[key]);

  return Number.isFinite(value)
    ? value
    : fallback;
}

function getFirstConsecutiveNegativeBalance(
  rows,
  requiredMonths = 3
) {
  let count = 0;

  for (
    let index = 0;
    index < rows.length;
    index += 1
  ) {
    if (
      getSimulationRowValue(
        rows[index],
        "monthlyBalance"
      ) < 0
    ) {
      count += 1;

      if (count >= requiredMonths) {
        return {
          row:
            rows[
              index -
              requiredMonths +
              1
            ],

          endRow:
            rows[index],

          count:
            requiredMonths
        };
      }
    } else {
      count = 0;
    }
  }

  return null;
}

function createSimulationRiskEvents(
  rows,
  minimumCash
) {
  const events = [];

  const negativeSequence =
    getFirstConsecutiveNegativeBalance(
      rows,
      3
    );

  if (negativeSequence) {
    events.push({
      level: "notice",
      rank: 1,
      row: negativeSequence.row,
      title:
        "月間収支の赤字が続き始めます",
      reason:
        "月間収支が3か月連続で" +
        "マイナスになる最初の期間です。"
    });
  }

  if (minimumCash > 0) {
    const cautionRow =
      rows.find(
        row =>
          getSimulationRowValue(
            row,
            "cash"
          ) <
          minimumCash * 1.5
      );

    if (cautionRow) {
      events.push({
        level: "caution",
        rank: 2,
        row: cautionRow,
        title:
          "現金の余裕が小さくなります",
        reason:
          `現金が最低維持額の1.5倍` +
          `（${formatYen(
            minimumCash * 1.5
          )}）を下回ります。`
      });
    }
  }

  const reductionRow =
    rows.find(
      row =>
        getSimulationRowValue(
          row,
          "automaticInvestmentReduction"
        ) > 0
    );

  if (reductionRow) {
    events.push({
      level: "danger",
      rank: 3,
      row: reductionRow,
      title:
        "投資積立の自動減額が始まります",
      reason:
        `現金を維持するため、` +
        `積立を${formatYen(
          getSimulationRowValue(
            reductionRow,
            "automaticInvestmentReduction"
          )
        )}減額しています。`
    });
  }

  const withdrawalRow =
    rows.find(
      row =>
        getSimulationRowValue(
          row,
          "investmentWithdrawal"
        ) > 0
    );

  if (withdrawalRow) {
    events.push({
      level: "critical",
      rank: 4,
      row: withdrawalRow,
      title:
        "投資資産の取り崩しが始まります",
      reason:
        `現金を補うため、` +
        `${formatYen(
          getSimulationRowValue(
            withdrawalRow,
            "investmentWithdrawal"
          )
        )}を取り崩しています。`
    });
  }

  const belowMinimumRow =
    minimumCash > 0
      ? rows.find(
          row =>
            getSimulationRowValue(
              row,
              "cash"
            ) < minimumCash
        )
      : null;

  if (belowMinimumRow) {
    events.push({
      level: "critical",
      rank: 5,
      row: belowMinimumRow,
      title:
        "最低維持現金を下回ります",
      reason:
        `現金が設定額` +
        `（${formatYen(
          minimumCash
        )}）を下回ります。`
    });
  }

  const negativeCashRow =
    rows.find(
      row =>
        getSimulationRowValue(
          row,
          "cash"
        ) < 0
    );

  if (negativeCashRow) {
    events.push({
      level: "depleted",
      rank: 6,
      row: negativeCashRow,
      title:
        "現金残高がマイナスになります",
      reason:
        "現金と設定済みの自動対応だけでは" +
        "支出を賄えない状態です。"
    });
  }

  return events.sort(
    (a, b) => {
      const monthCompare =
        compareMonths(
          a.row.month,
          b.row.month
        );

      if (monthCompare !== 0) {
        return monthCompare;
      }

      return a.rank - b.rank;
    }
  );
}

function getSimulationRiskLabel(level) {
  const labels = {
    safe: "安全",
    notice: "注意",
    caution: "警戒",
    danger: "危険",
    critical: "重大",
    depleted: "資金不足"
  };

  return labels[level] || "確認";
}

function createSimulationRiskMetric(
  label,
  row,
  emptyText,
  valueText = ""
) {
  return `
    <div class="simulation-risk-metric">
      <span>${label}</span>

      <strong>
        ${
          row
            ? formatMonthJapanese(
                row.month
              )
            : emptyText
        }
      </strong>

      <small>
        ${
          row
            ? valueText
            : "該当なし"
        }
      </small>
    </div>
  `;
}

function renderSimulationRiskOverview(
  rows,
  housingPlan,
  riskEvents
) {
  const badge =
    getElement(
      "simulationRiskBadge"
    );

  const primary =
    getElement(
      "simulationRiskPrimary"
    );

  const metrics =
    getElement(
      "simulationRiskMetrics"
    );

  const minimumCash =
    getSimulationAnalysisMinimumCash();

  const birthMonth =
    getSimulationAnalysisBirthMonth(
      housingPlan
    );

  const firstRisk =
    riskEvents[0] || null;

  badge.className =
    "simulation-risk-badge";

  if (!firstRisk) {
    badge.textContent = "安全";
    badge.classList.add(
      "risk-safe"
    );

    primary.innerHTML = `
      <strong>
        計算期間内に重大な資金不足は
        見つかりませんでした。
      </strong>

      <p>
        ただし、利回りや物価などの前提が変わると
        結果も変化します。
      </p>
    `;
  } else {
    const age =
      getSimulationAnalysisAge(
        birthMonth,
        firstRisk.row.month
      );

    badge.textContent =
      getSimulationRiskLabel(
        firstRisk.level
      );

    badge.classList.add(
      `risk-${firstRisk.level}`
    );

    primary.innerHTML = `
      <span>
        最初に注意が必要になる時期
      </span>

      <strong>
        ${formatMonthJapanese(
          firstRisk.row.month
        )}・${age}歳
      </strong>

      <h4>
        ${firstRisk.title}
      </h4>

      <p>
        ${firstRisk.reason}
      </p>
    `;
  }

  const reductionRow =
    rows.find(
      row =>
        getSimulationRowValue(
          row,
          "automaticInvestmentReduction"
        ) > 0
    );

  const withdrawalRow =
    rows.find(
      row =>
        getSimulationRowValue(
          row,
          "investmentWithdrawal"
        ) > 0
    );

  const belowMinimumRow =
    minimumCash > 0
      ? rows.find(
          row =>
            getSimulationRowValue(
              row,
              "cash"
            ) < minimumCash
        )
      : null;

  const negativeCashRow =
    rows.find(
      row =>
        getSimulationRowValue(
          row,
          "cash"
        ) < 0
    );

  metrics.innerHTML =
    createSimulationRiskMetric(
      "積立減額の開始",
      reductionRow,
      "なし",
      reductionRow
        ? `減額 ${formatYen(
            getSimulationRowValue(
              reductionRow,
              "automaticInvestmentReduction"
            )
          )}`
        : ""
    ) +
    createSimulationRiskMetric(
      "投資取崩しの開始",
      withdrawalRow,
      "なし",
      withdrawalRow
        ? `取崩し ${formatYen(
            getSimulationRowValue(
              withdrawalRow,
              "investmentWithdrawal"
            )
          )}`
        : ""
    ) +
    createSimulationRiskMetric(
      "最低現金を下回る",
      belowMinimumRow,
      minimumCash > 0
        ? "なし"
        : "基準未設定",
      belowMinimumRow
        ? `現金 ${formatYen(
            belowMinimumRow.cash
          )}`
        : ""
    ) +
    createSimulationRiskMetric(
      "現金マイナス",
      negativeCashRow,
      "なし",
      negativeCashRow
        ? `現金 ${formatYen(
            negativeCashRow.cash
          )}`
        : ""
    );
}

function createSimulationTurningPoint(
  type,
  level,
  row,
  title,
  description,
  value = ""
) {
  return {
    type,
    level,
    row,
    title,
    description,
    value
  };
}

function isSimulationSignChange(
  previousValue,
  currentValue
) {
  return (
    previousValue >= 0 &&
    currentValue < 0
  ) || (
    previousValue < 0 &&
    currentValue >= 0
  );
}

function createSimulationTurningPoints(
  rows,
  housingPlan
) {
  if (!rows.length) {
    return [];
  }

  const points = [];

  rows.forEach(
    (row, index) => {
      const previous =
        rows[index - 1];

      if (
        getSimulationRowValue(
          row,
          "housingPurchaseCash"
        ) > 0
      ) {
        points.push(
          createSimulationTurningPoint(
            "housing",
            "major",
            row,
            "住宅購入",
            "頭金などの住宅購入時支出が発生し、" +
            "住居費が住宅ローン中心へ変わります。",
            formatYen(
              row.housingPurchaseCash
            )
          )
        );
      }

      if (
        getSimulationRowValue(
          row,
          "retirementIncome"
        ) > 0
      ) {
        points.push(
          createSimulationTurningPoint(
            "retirement",
            "positive",
            row,
            "退職金を受領",
            "退職金が一時収入として" +
            "現金に加算されます。",
            formatYen(
              row.retirementIncome
            )
          )
        );
      }

      if (
        previous &&
        !previous.meIsRetired &&
        row.meIsRetired
      ) {
        points.push(
          createSimulationTurningPoint(
            "retirement",
            "major",
            row,
            "本人が退職",
            "本人の給与収入が0円になります。"
          )
        );
      }

      if (
        previous &&
        !previous.spouseIsRetired &&
        row.spouseIsRetired
      ) {
        points.push(
          createSimulationTurningPoint(
            "retirement",
            "major",
            row,
            "配偶者が退職",
            "配偶者の給与収入が0円になります。"
          )
        );
      }

      if (
        previous &&
        isSimulationSignChange(
          getSimulationRowValue(
            previous,
            "monthlyBalance"
          ),
          getSimulationRowValue(
            row,
            "monthlyBalance"
          )
        )
      ) {
        const becameNegative =
          row.monthlyBalance < 0;

        points.push(
          createSimulationTurningPoint(
            "balance",
            becameNegative
              ? "warning"
              : "positive",
            row,
            becameNegative
              ? "月間収支が赤字化"
              : "月間収支が黒字へ回復",
            becameNegative
              ? "収入より支出と投資額の合計が" +
                "大きくなりました。"
              : "毎月の収入が支出と投資額を" +
                "再び上回りました。",
            formatSignedYen(
              row.monthlyBalance
            )
          )
        );
      }

      if (
        getSimulationRowValue(
          row,
          "automaticInvestmentReduction"
        ) > 0 &&
        (
          !previous ||
          getSimulationRowValue(
            previous,
            "automaticInvestmentReduction"
          ) <= 0
        )
      ) {
        points.push(
          createSimulationTurningPoint(
            "investment",
            "warning",
            row,
            "投資積立の自動減額開始",
            "最低維持現金を確保するため、" +
            "投資積立を減らします。",
            formatYen(
              row.automaticInvestmentReduction
            )
          )
        );
      }

      if (
        getSimulationRowValue(
          row,
          "investmentWithdrawal"
        ) > 0 &&
        (
          !previous ||
          getSimulationRowValue(
            previous,
            "investmentWithdrawal"
          ) <= 0
        )
      ) {
        points.push(
          createSimulationTurningPoint(
            "investment",
            "critical",
            row,
            "投資資産の取崩し開始",
            "現金を補うため、投資資産の" +
            "売却が始まります。",
            formatYen(
              row.investmentWithdrawal
            )
          )
        );
      }

      if (
        previous &&
        getSimulationRowValue(
          previous,
          "mortgageBalance"
        ) > 0 &&
        getSimulationRowValue(
          row,
          "mortgageBalance"
        ) <= 0
      ) {
        points.push(
          createSimulationTurningPoint(
            "housing",
            "positive",
            row,
            "住宅ローン完済",
            "住宅ローン残高が0円になりました。"
          )
        );
      }

      if (
        previous &&
        getSimulationRowValue(
          row,
          "eventExpense"
        ) >= 500000 &&
        getSimulationRowValue(
          previous,
          "eventExpense"
        ) < 500000
      ) {
        points.push(
          createSimulationTurningPoint(
            "event",
            "major",
            row,
            "大きなイベント支出",
            "50万円以上のイベント支出が" +
            "発生しています。",
            formatYen(
              row.eventExpense
            )
          )
        );
      }
    }
  );

  const minimumCashRow =
    rows.reduce(
      (minimum, row) =>
        row.cash < minimum.cash
          ? row
          : minimum,
      rows[0]
    );

  points.push(
    createSimulationTurningPoint(
      "minimum",
      minimumCashRow.cash < 0
        ? "critical"
        : "info",
      minimumCashRow,
      "現金残高の最低時点",
      "計算期間中で現金が最も少なくなる時点です。",
      formatYen(
        minimumCashRow.cash
      )
    )
  );

  const minimumNetWorthRow =
    rows.reduce(
      (minimum, row) =>
        row.netWorth <
        minimum.netWorth
          ? row
          : minimum,
      rows[0]
    );

  points.push(
    createSimulationTurningPoint(
      "minimum",
      minimumNetWorthRow.netWorth < 0
        ? "warning"
        : "info",
      minimumNetWorthRow,
      "純資産の最低時点",
      "計算期間中で純資産が最も少なくなる時点です。",
      formatYen(
        minimumNetWorthRow.netWorth
      )
    )
  );

  const maximumNetWorthRow =
    rows.reduce(
      (maximum, row) =>
        row.netWorth >
        maximum.netWorth
          ? row
          : maximum,
      rows[0]
    );

  points.push(
    createSimulationTurningPoint(
      "maximum",
      "positive",
      maximumNetWorthRow,
      "純資産の最高時点",
      "計算期間中で純資産が最も多くなる時点です。",
      formatYen(
        maximumNetWorthRow.netWorth
      )
    )
  );

  const unique = new Map();

  points
    .sort(
      (a, b) =>
        compareMonths(
          a.row.month,
          b.row.month
        )
    )
    .forEach(
      point => {
        const key =
          `${point.row.month}:` +
          `${point.title}`;

        if (!unique.has(key)) {
          unique.set(key, point);
        }
      }
    );

  return [...unique.values()];
}

function getSimulationTurningIcon(type) {
  const icons = {
    housing: "⌂",
    retirement: "◇",
    balance: "↕",
    investment: "↗",
    event: "◉",
    minimum: "↓",
    maximum: "↑"
  };

  return icons[type] || "•";
}

function renderSimulationTurningPoints(
  rows,
  housingPlan
) {
  const list =
    getElement(
      "simulationTurningList"
    );

  const count =
    getElement(
      "simulationTurningCount"
    );

  const points =
    createSimulationTurningPoints(
      rows,
      housingPlan
    );

  count.textContent =
    `${points.length}件`;

  if (!points.length) {
    list.innerHTML = `
      <div class="simulation-turning-empty">
        ターニングポイントはありません。
      </div>
    `;

    return;
  }

  const birthMonth =
    getSimulationAnalysisBirthMonth(
      housingPlan
    );

  list.innerHTML =
    points
      .map(
        point => {
          const age =
            getSimulationAnalysisAge(
              birthMonth,
              point.row.month
            );

          return `
            <article
              class="
                simulation-turning-item
                turning-${point.level}
              "
            >
              <div
                class="simulation-turning-icon"
                aria-hidden="true"
              >
                ${getSimulationTurningIcon(
                  point.type
                )}
              </div>

              <div
                class="simulation-turning-content"
              >
                <div
                  class="simulation-turning-meta"
                >
                  <span>
                    ${formatMonthJapanese(
                      point.row.month
                    )}
                  </span>

                  <span>
                    ${age}歳
                  </span>
                </div>

                <h4>
                  ${point.title}
                </h4>

                <p>
                  ${point.description}
                </p>

                ${
                  point.value
                    ? `
                      <strong
                        class="
                          simulation-turning-value
                        "
                      >
                        ${point.value}
                      </strong>
                    `
                    : ""
                }
              </div>
            </article>
          `;
        }
      )
      .join("");
}

function renderSimulationAnalysis(
  rows,
  housingPlan
) {
  ensureSimulationAnalysisElements();

  if (!rows || rows.length === 0) {
    getElement(
      "simulationRiskBadge"
    ).textContent =
      "未計算";

    getElement(
      "simulationRiskPrimary"
    ).textContent =
      "計算結果がありません。";

    getElement(
      "simulationRiskMetrics"
    ).innerHTML = "";

    getElement(
      "simulationTurningCount"
    ).textContent =
      "0件";

    getElement(
      "simulationTurningList"
    ).innerHTML = `
      <div class="simulation-turning-empty">
        計算結果がありません。
      </div>
    `;

    return;
  }

  const minimumCash =
    getSimulationAnalysisMinimumCash();

  const riskEvents =
    createSimulationRiskEvents(
      rows,
      minimumCash
    );

  renderSimulationRiskOverview(
    rows,
    housingPlan,
    riskEvents
  );

  renderSimulationTurningPoints(
    rows,
    housingPlan
  );
}
