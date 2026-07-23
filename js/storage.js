"use strict";

/* ------------------------------
   Data saving
------------------------------ */

function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(appData)
  );
}

/* ------------------------------
   Data loading and migration
------------------------------ */

function loadData() {
  try {
    const savedV2 =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (savedV2) {
      const parsed =
        JSON.parse(savedV2);

      return normalizeData(parsed);
    }

    const oldData =
      localStorage.getItem(
        OLD_STORAGE_KEY
      );

    if (oldData) {
      const migrated =
        migrateOldData(
          JSON.parse(oldData)
        );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(migrated)
      );

      return migrated;
    }

    return deepClone(DEFAULT_DATA);

  } catch (error) {
    console.error(
      "データの読み込みに失敗しました。",
      error
    );

    return deepClone(DEFAULT_DATA);
  }
}

function normalizeData(data) {
  const normalized =
    deepClone(DEFAULT_DATA);

  normalized.version = 2;

  normalized.settings = {
    ...normalized.settings,
    ...(data.settings || {})
  };

  normalized.monthlyData =
    data.monthlyData || {};

  normalized.events =
    Array.isArray(data.events)
      ? data.events
      : [];

  normalized.housingPlans =
    Array.isArray(data.housingPlans)
      ? data.housingPlans
      : [];

  normalized.buckets =
    Array.isArray(data.buckets)
      ? data.buckets
      : [];

  return normalized;
}

function migrateOldData(oldData) {
  const migrated =
    deepClone(DEFAULT_DATA);

  migrated.monthlyData = {};

  if (oldData.settings) {
    migrated.settings.targetAsset =
      Number(
        oldData.settings.target ||
        oldData.settings.targetAsset ||
        100000000
      );

    migrated.settings
      .minimumMonthlyExpense =
      Number(
        oldData.settings.minimum ||
        oldData.settings
          .minimumMonthlyExpense ||
        95000
      );

    migrated.settings
      .emergencyFundMonths =
      Number(
        oldData.settings.emergency ||
        oldData.settings
          .emergencyFundMonths ||
        3
      );
  }

  const oldMonthly =
    oldData.monthly ||
    oldData.monthlyData ||
    {};

  Object.entries(oldMonthly)
    .forEach(
      ([month, value]) => {
        migrated.monthlyData[month] = {
          income: {
            me: Number(
              value.incomeMe || 0
            ),

            spouse: Number(
              value.incomeSpouse || 0
            ),

            other: Number(
              value.incomeOther || 0
            )
          },

          assets: {
            cash: Number(
              value.cash || 0
            ),

            newNisa: {
              principal: 0,

              value: Number(
                value.newNisa || 0
              )
            },

            oldNisa: {
              principal: 0,

              value: Number(
                value.oldNisa || 0
              )
            },

            ideco: {
              principal: 0,

              value: Number(
                value.ideco || 0
              )
            },

            taxable: {
              principal: 0,

              value: Number(
                value.taxable || 0
              )
            }
          },

          liabilities: {
            mortgageBalance: 0,
            otherDebt: 0
          },

          expenses: {
            eventExpense:
              Number(
                value.eventExpense || 0
              )
          },

          note: ""
        };
      }
    );

  return migrated;
}

/* ------------------------------
   Initial data loading
------------------------------ */

appData = loadData();
