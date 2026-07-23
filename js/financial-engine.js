"use strict";

/* ------------------------------
   Financial Engine
------------------------------ */

function getSimulationEvents() {
  return appData.events
    .map(normalizeEvent)
    .filter(
      event =>
        event.enabled &&
        event.includeInSimulation
    );
}

function getCashFlowHousingPlan() {
  const planId =
    getElement(
      "cashFlowHousingPlan"
    ).value;

  if (!planId) {
    return null;
  }

  return (
    appData.housingPlans
      .map(normalizeHousingPlan)
      .find(
        plan =>
          plan.id === planId
      ) || null
  );
}

function getBaseMonthlyRecord(
  baseMonth
) {
  return (
    appData.monthlyData[
      baseMonth
    ] || null
  );
}

function calculateMortgageBalanceForMonth(
  plan,
  targetMonth
) {
  if (
    !plan ||
    compareMonths(
      targetMonth,
      plan.purchaseMonth
    ) < 0
  ) {
    return 0;
  }

  const result =
    calculateHousingPlan(plan);

  const elapsedMonths =
    Math.max(
      getMonthDifference(
        plan.purchaseMonth,
        targetMonth
      ) + 1,
      0
    );

  return calculateRemainingLoanBalance(
    result.loanAmount,
    plan.loan.interestRate,
    result.termMonths,
    elapsedMonths,
    result.monthlyPayment
  );
}

function calculateEventEffects(
  month,
  events
) {
  const effects = {
    oneTimeIncome: 0,
    oneTimeExpense: 0,
    monthlyIncomeChange: 0,
    monthlyExpenseChange: 0,
    monthlyInvestmentChange: 0,

    incomeItems: [],
    expenseItems: [],
    investmentItems: []
  };

  events.forEach(
    event => {
      if (
        month === event.startMonth
      ) {
        if (
          event.oneTimeIncome !== 0
        ) {
          effects.oneTimeIncome +=
            event.oneTimeIncome;

          effects.incomeItems.push({
            label:
              `${event.title}（一時収入）`,

            value:
              event.oneTimeIncome
          });
        }

        if (
          event.oneTimeExpense !== 0
        ) {
          effects.oneTimeExpense +=
            event.oneTimeExpense;

          effects.expenseItems.push({
            label:
              `${event.title}（一時支出）`,

            value:
              event.oneTimeExpense
          });
        }
      }

      const monthlyEnd =
        event.endMonth ||
        event.startMonth;

      if (
        isMonthInRange(
          month,
          event.startMonth,
          monthlyEnd
        )
      ) {
        if (
          event.monthlyIncomeChange !== 0
        ) {
          effects.monthlyIncomeChange +=
            event.monthlyIncomeChange;

          effects.incomeItems.push({
            label:
              `${event.title}（収入変化）`,

            value:
              event.monthlyIncomeChange
          });
        }

        if (
          event.monthlyExpenseChange !== 0
        ) {
          effects.monthlyExpenseChange +=
            event.monthlyExpenseChange;

          effects.expenseItems.push({
            label:
              `${event.title}（支出変化）`,

            value:
              event.monthlyExpenseChange
          });
        }

        if (
          event.monthlyInvestmentChange !== 0
        ) {
          effects.monthlyInvestmentChange +=
            event.monthlyInvestmentChange;

          effects.investmentItems.push({
            label:
              `${event.title}（投資額変化）`,

            value:
              event.monthlyInvestmentChange
          });
        }
      }
    }
  );

  return effects;
}

function countAnnualRaises(
  baseMonth,
  targetMonth,
  raiseMonth,
  retirementMonth = ""
) {
  const safeRaiseMonth =
    Math.min(
      Math.max(
        Number(raiseMonth || 4),
        1
      ),
      12
    );

  const baseYear =
    getYearFromMonth(baseMonth);

  const targetYear =
    getYearFromMonth(targetMonth);

  let count = 0;

  for (
    let year = baseYear;
    year <= targetYear;
    year += 1
  ) {
    const raiseTargetMonth =
      `${year}-${String(
        safeRaiseMonth
      ).padStart(2, "0")}`;

    if (
      compareMonths(
        raiseTargetMonth,
        baseMonth
      ) <= 0
    ) {
      continue;
    }

    if (
      compareMonths(
        raiseTargetMonth,
        targetMonth
      ) > 0
    ) {
      continue;
    }

    if (
      retirementMonth &&
      compareMonths(
        raiseTargetMonth,
        retirementMonth
      ) >= 0
    ) {
      continue;
    }

    count += 1;
  }

  return count;
}

function isRetiredByMonth(
  retirementMonth,
  targetMonth
) {
  return Boolean(
    retirementMonth &&
    compareMonths(
      targetMonth,
      retirementMonth
    ) >= 0
  );
}

function runFinancialEngine({
  baseMonth,
  housingPlan,
  options = {}
}) {
  const baseRecord =
    getBaseMonthlyRecord(baseMonth);

  if (!baseRecord) {
    return {
      rows: [],
      warnings: [
        "計算開始月のMonthlyデータがありません。"
      ]
    };
  }

  const baseCalculation =
    calculateMonthlyRecord(
      baseRecord
    );

  const settings =
    appData.settings;

  const includeEvents =
    options.includeEvents !== false;

  const events =
    includeEvents
      ? getSimulationEvents()
      : [];

  const expenseInflationRate =
    Number(
      options.expenseInflationRate || 0
    );

  const meAnnualRaise =
    Number(
      options.meAnnualRaise || 0
    );

  const spouseAnnualRaise =
    Number(
      options.spouseAnnualRaise || 0
    );

  const raiseMonth =
    Math.min(
      Math.max(
        Number(
          options.raiseMonth || 4
        ),
        1
      ),
      12
    );

  const meRetirementMonth =
    String(
      options.meRetirementMonth || ""
    );

  const meRetirementPayment =
    Math.max(
      Number(
        options.meRetirementPayment || 0
      ),
      0
    );

  const spouseRetirementMonth =
    String(
      options.spouseRetirementMonth || ""
    );

  const spouseRetirementPayment =
    Math.max(
      Number(
        options.spouseRetirementPayment || 0
      ),
      0
    );

  const minimumCash =
    Math.max(
      Number(
        options.minimumCash || 0
      ),
      0
    );

  const cashShortageAction =
    options.cashShortageAction ||
    "warn";

  const warnings = [];

  const borrowerBirthMonth =
    housingPlan
      ?.borrowerBirthMonth ||
    "1998-07";

  const endMonth =
    addYearsToMonth(
      borrowerBirthMonth,
      Number(
        settings.simulationEndAge ||
        65
      )
    );

  if (
    compareMonths(
      endMonth,
      baseMonth
    ) <= 0
  ) {
    warnings.push(
      "計算終了年月が開始年月以前になっています。"
    );

    return {
      rows: [],
      warnings
    };
  }

  const startingMeIncome =
    Number(
      baseRecord.income?.me || 0
    );

  const startingSpouseIncome =
    Number(
      baseRecord.income?.spouse || 0
    );

  const startingOtherIncome =
    Number(
      baseRecord.income?.other || 0
    );

  const startingLivingExpense =
    Number(
      settings.baseLivingExpense ||
      baseCalculation.livingExpenseTotal ||
      0
    );

  let cash =
    baseCalculation.cash;

  let investmentAsset =
    baseCalculation.investmentValue;

  const monthlyReturn =
    Math.pow(
      1 +
      Number(
        settings.investmentAnnualReturn ||
        0
      ) / 100,
      1 / 12
    ) - 1;

  const monthlyExpenseInflation =
    Math.pow(
      1 +
      expenseInflationRate / 100,
      1 / 12
    ) - 1;

  const rows = [];

  let month =
    addMonthsToMonth(
      baseMonth,
      1
    );

  while (
    compareMonths(
      month,
      endMonth
    ) <= 0
  ) {
    const elapsedMonths =
      getMonthDifference(
        baseMonth,
        month
      );

    const eventEffects =
      calculateEventEffects(
        month,
        events
      );

    const meRaiseCount =
      countAnnualRaises(
        baseMonth,
        month,
        raiseMonth,
        meRetirementMonth
      );

    const spouseRaiseCount =
      countAnnualRaises(
        baseMonth,
        month,
        raiseMonth,
        spouseRetirementMonth
      );

    const meIsRetired =
      isRetiredByMonth(
        meRetirementMonth,
        month
      );

    const spouseIsRetired =
      isRetiredByMonth(
        spouseRetirementMonth,
        month
      );

    const meIncome =
      meIsRetired
        ? 0
        : startingMeIncome +
          meAnnualRaise *
          meRaiseCount;

    const spouseIncome =
      spouseIsRetired
        ? 0
        : startingSpouseIncome +
          spouseAnnualRaise *
          spouseRaiseCount;

    const otherIncome =
      startingOtherIncome;

    let retirementIncome = 0;

    if (
      meRetirementMonth &&
      month === meRetirementMonth
    ) {
      retirementIncome +=
        meRetirementPayment;
    }

    if (
      spouseRetirementMonth &&
      month === spouseRetirementMonth
    ) {
      retirementIncome +=
        spouseRetirementPayment;
    }

    const baseIncome =
      meIncome +
      spouseIncome +
      otherIncome;

    const income =
      baseIncome +
      retirementIncome +
      eventEffects.monthlyIncomeChange +
      eventEffects.oneTimeIncome;

    const baseLivingExpense =
      startingLivingExpense *
      Math.pow(
        1 + monthlyExpenseInflation,
        elapsedMonths
      );

    let rent = 0;
    let mortgagePayment = 0;
    let propertyTax = 0;
    let homeMaintenance = 0;
    let housingPurchaseCash = 0;
    let mortgageBalance = 0;

    if (!housingPlan) {
      rent =
        Number(
          settings.currentRent || 0
        );

    } else if (
      compareMonths(
        month,
        housingPlan.purchaseMonth
      ) < 0
    ) {
      rent =
        Number(
          settings.currentRent || 0
        );

    } else {
      const housingResult =
        calculateHousingPlan(
          housingPlan
        );

      const housingElapsedMonths =
        getMonthDifference(
          housingPlan.purchaseMonth,
          month
        );

      if (
        housingElapsedMonths >= 0 &&
        housingElapsedMonths <
          housingResult.termMonths
      ) {
        mortgagePayment =
          housingResult.monthlyPayment;
      }

      propertyTax =
        Number(
          settings.annualPropertyTax ||
          0
        ) / 12;

      homeMaintenance =
        Number(
          settings.annualHomeMaintenance ||
          0
        ) / 12;

      mortgageBalance =
        calculateMortgageBalanceForMonth(
          housingPlan,
          month
        );

      if (
        month ===
        housingPlan.purchaseMonth
      ) {
        housingPurchaseCash =
          Number(
            housingPlan.funding
              .downPayment || 0
          ) +
          Number(
            housingPlan.funding
              .otherOwnFunds || 0
          );
      }
    }

    const eventExpense =
      eventEffects.oneTimeExpense +
      eventEffects.monthlyExpenseChange;

    const livingAndEventExpense =
      baseLivingExpense +
      eventExpense;

    const housingExpense =
      rent +
      mortgagePayment +
      propertyTax +
      homeMaintenance +
      housingPurchaseCash;

    const requestedInvestment =
      Number(
        settings.baseMonthlyInvestment ||
        0
      ) +
      eventEffects
        .monthlyInvestmentChange;

    let investmentContribution =
      Math.max(
        requestedInvestment,
        0
      );

    const investmentValueBeforeCashFlow =
      investmentAsset *
      (1 + monthlyReturn);

    const cashBeforeInvestment =
      cash +
      income -
      livingAndEventExpense -
      housingExpense;

    let automaticInvestmentReduction = 0;
    let investmentWithdrawal = 0;

    if (
      cashShortageAction ===
        "reduceInvestment" ||
      cashShortageAction ===
        "reduceThenWithdraw"
    ) {
      const affordableContribution =
        Math.max(
          cashBeforeInvestment -
          minimumCash,
          0
        );

      if (
        investmentContribution >
        affordableContribution
      ) {
        automaticInvestmentReduction =
          investmentContribution -
          affordableContribution;

        investmentContribution =
          affordableContribution;
      }
    }

    investmentAsset =
      investmentValueBeforeCashFlow +
      investmentContribution;

    let monthlyBalance =
      income -
      livingAndEventExpense -
      housingExpense -
      investmentContribution;

    cash += monthlyBalance;

    if (
      (
        cashShortageAction ===
          "withdrawInvestment" ||
        cashShortageAction ===
          "reduceThenWithdraw"
      ) &&
      cash < minimumCash &&
      investmentAsset > 0
    ) {
      const neededCash =
        minimumCash - cash;

      investmentWithdrawal =
        Math.min(
          neededCash,
          investmentAsset
        );

      investmentAsset -=
        investmentWithdrawal;

      cash +=
        investmentWithdrawal;

      monthlyBalance +=
        investmentWithdrawal;
    }

    const totalAssets =
      cash +
      investmentAsset;

    const netWorth =
      totalAssets -
      mortgageBalance;

    const incomeItems = [
      {
        label: "本人収入",
        value: meIncome
      },
      {
        label: "配偶者収入",
        value: spouseIncome
      },
      {
        label: "その他収入",
        value: otherIncome
      },
      ...eventEffects.incomeItems
    ];

    if (
      month === meRetirementMonth &&
      meRetirementPayment > 0
    ) {
      incomeItems.push({
        label: "本人退職金",
        value: meRetirementPayment
      });
    }

    if (
      month === spouseRetirementMonth &&
      spouseRetirementPayment > 0
    ) {
      incomeItems.push({
        label: "配偶者退職金",
        value: spouseRetirementPayment
      });
    }

    const expenseItems = [
      {
        label: "基本生活費",
        value: baseLivingExpense
      }
    ];

    if (rent > 0) {
      expenseItems.push({
        label: "家賃",
        value: rent
      });
    }

    if (mortgagePayment > 0) {
      expenseItems.push({
        label: "住宅ローン",
        value: mortgagePayment
      });
    }

    if (propertyTax > 0) {
      expenseItems.push({
        label: "固定資産税",
        value: propertyTax
      });
    }

    if (homeMaintenance > 0) {
      expenseItems.push({
        label: "住宅修繕積立",
        value: homeMaintenance
      });
    }

    if (housingPurchaseCash > 0) {
      expenseItems.push({
        label:
          "住宅購入時の現金支出",
        value: housingPurchaseCash
      });
    }

    expenseItems.push(
      ...eventEffects.expenseItems
    );

    const investmentItems = [
      {
        label: "基本投資額",
        value:
          Number(
            settings
              .baseMonthlyInvestment ||
            0
          )
      },
      ...eventEffects.investmentItems
    ];

    if (
      automaticInvestmentReduction >
      0
    ) {
      investmentItems.push({
        label:
          "現金維持のための自動減額",
        value:
          -automaticInvestmentReduction
      });
    }

    if (investmentWithdrawal > 0) {
      investmentItems.push({
        label: "投資資産の取崩し",
        value: -investmentWithdrawal
      });
    }

    rows.push({
      month,

      income,
      baseIncome,
      meIncome,
      spouseIncome,
      otherIncome,
      retirementIncome,
      meRaiseCount,
      spouseRaiseCount,
      meIsRetired,
      spouseIsRetired,

      eventIncome:
        eventEffects.oneTimeIncome +
        eventEffects.monthlyIncomeChange,

      baseLivingExpense,
      eventExpense,
      livingAndEventExpense,

      rent,
      mortgagePayment,
      propertyTax,
      homeMaintenance,
      housingPurchaseCash,
      housingExpense,

      requestedInvestment,
      investmentContribution,
      automaticInvestmentReduction,
      investmentWithdrawal,

      monthlyBalance,
      cash,
      investmentAsset,
      mortgageBalance,
      totalAssets,
      netWorth,

      incomeItems,
      expenseItems,
      investmentItems
    });

    month =
      addMonthsToMonth(
        month,
        1
      );
  }

  if (
    rows.some(
      row =>
        row.requestedInvestment < 0
    )
  ) {
    warnings.push(
      "イベントによる投資額減少が基本投資額を上回った月は、投資額を0円として計算しています。"
    );
  }

  if (
    rows.some(
      row =>
        row.automaticInvestmentReduction >
        0
    )
  ) {
    warnings.push(
      "最低維持現金を守るため、投資積立を自動で減額した月があります。"
    );
  }

  if (
    rows.some(
      row =>
        row.investmentWithdrawal > 0
    )
  ) {
    warnings.push(
      "最低維持現金を守るため、投資資産を取り崩した月があります。"
    );
  }

  if (
    rows.some(
      row =>
        row.cash < minimumCash
    )
  ) {
    warnings.push(
      minimumCash > 0
        ? "最低維持現金を下回る月があります。"
        : "現金残高がマイナスになる月があります。"
    );
  }

  if (!includeEvents) {
    warnings.push(
      "Timelineイベントを反映せずに計算しています。"
    );
  }

  return {
    rows,
    warnings
  };
}
