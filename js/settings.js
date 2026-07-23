"use strict";

/* ------------------------------
   Settings
------------------------------ */

function fillSettingsForm() {
  getElement("targetAsset").value =
    appData.settings.targetAsset;

  getElement(
    "minimumMonthlyExpense"
  ).value =
    appData.settings
      .minimumMonthlyExpense;

  getElement(
    "emergencyFundMonths"
  ).value =
    appData.settings
      .emergencyFundMonths;

      getElement(
  "baseLivingExpense"
).value =
  appData.settings
    .baseLivingExpense;

getElement(
  "currentRent"
).value =
  appData.settings
    .currentRent;

getElement(
  "baseMonthlyInvestment"
).value =
  appData.settings
    .baseMonthlyInvestment;

getElement(
  "investmentAnnualReturn"
).value =
  appData.settings
    .investmentAnnualReturn;

getElement(
  "annualPropertyTax"
).value =
  appData.settings
    .annualPropertyTax;

getElement(
  "annualHomeMaintenance"
).value =
  appData.settings
    .annualHomeMaintenance;

getElement(
  "simulationEndAge"
).value =
  appData.settings
    .simulationEndAge;
}
function saveSettings(event) {
  event.preventDefault();

  appData.settings = {
    targetAsset:
      Number(
        getElement(
          "targetAsset"
        ).value || 0
      ),

    minimumMonthlyExpense:
      Number(
        getElement(
          "minimumMonthlyExpense"
        ).value || 0
      ),

    emergencyFundMonths:
      Number(
        getElement(
          "emergencyFundMonths"
        ).value || 0
      ),

    baseLivingExpense:
      Number(
        getElement(
          "baseLivingExpense"
        ).value || 0
      ),

    currentRent:
      Number(
        getElement(
          "currentRent"
        ).value || 0
      ),

    baseMonthlyInvestment:
      Number(
        getElement(
          "baseMonthlyInvestment"
        ).value || 0
      ),

    investmentAnnualReturn:
      Number(
        getElement(
          "investmentAnnualReturn"
        ).value || 0
      ),

    annualPropertyTax:
      Number(
        getElement(
          "annualPropertyTax"
        ).value || 0
      ),

    annualHomeMaintenance:
      Number(
        getElement(
          "annualHomeMaintenance"
        ).value || 0
      ),

    simulationEndAge:
      Number(
        getElement(
          "simulationEndAge"
        ).value || 65
      )
  };

  saveData();

  renderHome();
  renderCashFlowPage();

  showToast(
    "設定を保存しました。"
  );
}

/* ------------------------------
   Import / export
------------------------------ */

function exportData() {
  const json =
    JSON.stringify(
      appData,
      null,
      2
    );

  const blob =
    new Blob(
      [json],
      {
        type: "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  link.href = url;

  link.download =
    `my-wealth-studio-${today}.json`;

  link.click();

  URL.revokeObjectURL(url);

  showToast(
    "バックアップを書き出しました。"
  );
}

function importData(event) {
  const file =
    event.target.files?.[0];

  if (!file) {
    return;
  }

  const reader =
    new FileReader();

  reader.onload = () => {
    try {
      const parsed =
        JSON.parse(reader.result);

      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        throw new Error(
          "Invalid data"
        );
      }

      const confirmed =
        window.confirm(
          "現在のデータを読み込んだ内容で置き換えますか？"
        );

      if (!confirmed) {
        event.target.value = "";
        return;
      }

      appData =
        normalizeData(parsed);

      saveData();

      buildMonthOptions();
      fillSettingsForm();

      const latestMonth =
        Object.keys(
          appData.monthlyData
        )
          .sort()
          .at(-1) ||
        "2026-07";

      getElement(
        "globalMonth"
      ).value =
        latestMonth;

      fillMonthlyForm(latestMonth);
      renderHome();
      renderSavedMonthList();

      showToast(
        "バックアップを読み込みました。"
      );

    } catch (error) {
      console.error(error);

      window.alert(
        "JSONファイルを読み込めませんでした。"
      );
    }

    event.target.value = "";
  };

  reader.readAsText(file);
}

function clearAllData() {
  const confirmed =
    window.confirm(
      "すべての月次データ・設定を初期化します。元に戻せません。"
    );

  if (!confirmed) {
    return;
  }

  localStorage.removeItem(
    STORAGE_KEY
  );

  localStorage.removeItem(
    OLD_STORAGE_KEY
  );

  appData =
    deepClone(DEFAULT_DATA);

  saveData();

  buildMonthOptions();
  fillSettingsForm();

  getElement("globalMonth").value =
    "2026-07";

  fillMonthlyForm("2026-07");
  renderHome();
  renderSavedMonthList();

  showToast(
    "データを初期化しました。"
  );
}
