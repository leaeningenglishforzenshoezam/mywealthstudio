"use strict";

/* ------------------------------
   Monthly calculations
------------------------------ */

function createBlankMonthlyRecord() {
  return {
    income: {
      me: 0,
      spouse: 0,
      other: 0
    },

    assets: {
      cash: 0,

      newNisa: {
        principal: 0,
        value: 0
      },

      oldNisa: {
        principal: 0,
        value: 0
      },

      ideco: {
        principal: 0,
        value: 0
      },

      taxable: {
        principal: 0,
        value: 0
      }
    },

    liabilities: {
      mortgageBalance: 0,
      otherDebt: 0
    },

    expenses: {
      housing: 0,
      food: 0,
      dailyGoods: 0,
      utilities: 0,
      communication: 0,
      transportation: 0,
      diningAndEntertainment: 0,
      insurance: 0,
      medical: 0,
      education: 0,
      other: 0,
      eventExpense: 0
    },

    note: ""
  };
}

function calculateMonthlyRecord(record) {
  const safeRecord =
    record || createBlankMonthlyRecord();

  let investmentPrincipal = 0;
  let investmentValue = 0;

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      const accountData =
        safeRecord.assets?.[account.key] || {};

      investmentPrincipal +=
        Number(
          accountData.principal || 0
        );

      investmentValue +=
        Number(
          accountData.value || 0
        );
    }
  );

  const cash =
    Number(
      safeRecord.assets?.cash || 0
    );

  const mortgageBalance =
    Number(
      safeRecord.liabilities
        ?.mortgageBalance || 0
    );

  const otherDebt =
    Number(
      safeRecord.liabilities
        ?.otherDebt || 0
    );

  const totalDebt =
    mortgageBalance + otherDebt;

  const totalAssets =
    cash + investmentValue;

  const netWorth =
    totalAssets - totalDebt;

  const investmentProfit =
    investmentValue -
    investmentPrincipal;

  const investmentProfitRate =
    investmentPrincipal > 0
      ? (
          investmentProfit /
          investmentPrincipal
        ) * 100
      : 0;

  const income =
    Number(
      safeRecord.income?.me || 0
    ) +
    Number(
      safeRecord.income?.spouse || 0
    ) +
    Number(
      safeRecord.income?.other || 0
    );

  const housingExpense =
    Number(
      safeRecord.expenses?.housing || 0
    );

  const foodExpense =
    Number(
      safeRecord.expenses?.food || 0
    );

  const dailyGoodsExpense =
    Number(
      safeRecord.expenses?.dailyGoods || 0
    );

  const utilitiesExpense =
    Number(
      safeRecord.expenses?.utilities || 0
    );

  const communicationExpense =
    Number(
      safeRecord.expenses
        ?.communication || 0
    );

  const transportationExpense =
    Number(
      safeRecord.expenses
        ?.transportation || 0
    );

  const diningAndEntertainmentExpense =
    Number(
      safeRecord.expenses
        ?.diningAndEntertainment || 0
    );

  const insuranceExpense =
    Number(
      safeRecord.expenses?.insurance || 0
    );

  const medicalExpense =
    Number(
      safeRecord.expenses?.medical || 0
    );

  const educationExpense =
    Number(
      safeRecord.expenses?.education || 0
    );

  const otherExpense =
    Number(
      safeRecord.expenses?.other || 0
    );

  const eventExpense =
    Number(
      safeRecord.expenses
        ?.eventExpense || 0
    );

  const livingExpenseTotal =
    housingExpense +
    foodExpense +
    dailyGoodsExpense +
    utilitiesExpense +
    communicationExpense +
    transportationExpense +
    diningAndEntertainmentExpense +
    insuranceExpense +
    medicalExpense +
    educationExpense +
    otherExpense;

  const totalExpense =
    livingExpenseTotal +
    eventExpense;

  const monthlyBalance =
    income -
    totalExpense;

  return {
    cash,

    investmentPrincipal,
    investmentValue,
    investmentProfit,
    investmentProfitRate,

    mortgageBalance,
    otherDebt,
    totalDebt,

    totalAssets,
    netWorth,

    income,

    housingExpense,
    foodExpense,
    dailyGoodsExpense,
    utilitiesExpense,
    communicationExpense,
    transportationExpense,
    diningAndEntertainmentExpense,
    insuranceExpense,
    medicalExpense,
    educationExpense,
    otherExpense,
    eventExpense,

    livingExpenseTotal,
    totalExpense,
    monthlyBalance
  };
}
