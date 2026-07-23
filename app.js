"use strict";

/* ------------------------------
   Event listeners
------------------------------ */

function registerEventListeners() {
  document
    .querySelectorAll(".nav-button")
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            showPage(
              button.dataset.page
            );
          }
        );
      }
    );

  document
    .querySelectorAll("[data-go]")
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            showPage(
              button.dataset.go
            );
          }
        );
      }
    );

  getElement("menuButton")
    .addEventListener(
      "click",
      () => {
        getElement("sidebar")
          .classList.toggle("open");
      }
    );

  getElement("globalMonth")
    .addEventListener(
      "change",
      event => {
        const month =
          event.target.value;

        renderHome();

        if (
          getElement("page-monthly")
            .classList.contains("active")
        ) {
          fillMonthlyForm(month);
        }
      }
    );

  /* Monthly */

  getElement("monthlyMonth")
    .addEventListener(
      "change",
      changeMonthlyMonth
    );

  getElement("monthlyForm")
    .addEventListener(
      "submit",
      saveMonthlyForm
    );

  getElement("copyPreviousButton")
    .addEventListener(
      "click",
      copyPreviousMonth
    );

  getElement("deleteMonthButton")
    .addEventListener(
      "click",
      deleteSelectedMonth
    );

  getElement("restoreButton")
    .addEventListener(
      "click",
      restoreMonthlyForm
    );

  const formInputs =
    getElement("monthlyForm")
      .querySelectorAll(
        "input, textarea"
      );

  formInputs.forEach(
    input => {
      if (
        input.id === "monthlyMonth"
      ) {
        return;
      }

      input.addEventListener(
        "input",
        detectMonthlyChanges
      );
    }
  );

  /* Timeline */

  getElement("newEventButton")
    .addEventListener(
      "click",
      () => {
        clearEventForm();

        getElement(
          "eventEditorCard"
        ).scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        getElement(
          "eventTitle"
        ).focus();
      }
    );

  getElement("eventForm")
    .addEventListener(
      "submit",
      saveEventForm
    );

  getElement("deleteEventButton")
    .addEventListener(
      "click",
      deleteSelectedEvent
    );

  getElement(
    "duplicateEventButton"
  ).addEventListener(
    "click",
    duplicateSelectedEvent
  );

  getElement("cancelEventButton")
    .addEventListener(
      "click",
      clearEventForm
    );

  getElement(
    "closeEventEditorButton"
  ).addEventListener(
    "click",
    clearEventForm
  );

  getElement("eventSearchInput")
    .addEventListener(
      "input",
      renderEventList
    );

  getElement(
    "eventCategoryFilter"
  ).addEventListener(
    "change",
    renderEventList
  );

  getElement(
    "eventStatusFilter"
  ).addEventListener(
    "change",
    renderEventList
  );

  /* Housing Planner V2 */

  getElement(
    "newHousingPlanButton"
  ).addEventListener(
    "click",
    () => {
      clearHousingPlanForm();

      getElement(
        "housingPlanForm"
      ).scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      getElement(
        "housingPlanName"
      ).focus();
    }
  );

  getElement(
    "housingPlanForm"
  ).addEventListener(
    "submit",
    saveHousingPlan
  );

  getElement(
    "deleteHousingPlanButton"
  ).addEventListener(
    "click",
    deleteSelectedHousingPlan
  );

  getElement(
    "duplicateHousingPlanButton"
  ).addEventListener(
    "click",
    duplicateSelectedHousingPlan
  );

  getElement(
    "clearHousingPlanButton"
  ).addEventListener(
    "click",
    () => {
      const hasInput =
        Boolean(
          getElement(
            "housingPlanName"
          ).value.trim()
        ) ||
        Number(
          getElement(
            "housingBuildingBaseCost"
          ).value || 0
        ) > 0 ||
        Number(
          getElement(
            "housingLandAndFeesCost"
          ).value || 0
        ) > 0 ||
        getElement(
          "housingPaidOptionList"
        ).children.length > 0 ||
        getElement(
          "housingStandardFeatureList"
        ).children.length > 0;

      if (hasInput) {
        const confirmed =
          window.confirm(
            "現在の入力内容をクリアしますか？保存していない変更は失われます。"
          );

        if (!confirmed) {
          return;
        }
      }

      clearHousingPlanForm();

      getElement(
        "housingPlanName"
      ).focus();
    }
  );

  getElement(
    "addPaidOptionButton"
  ).addEventListener(
    "click",
    () => {
      const row =
        addPaidOptionRow();

      updateHousingCalculations();

      const nameInput =
        row.querySelector(
          ".housing-paid-option-name"
        );

      if (nameInput) {
        nameInput.focus();
      }
    }
  );

  getElement(
    "addStandardFeatureButton"
  ).addEventListener(
    "click",
    () => {
      const row =
        addStandardFeatureRow();

      updateHousingCalculations();

      const nameInput =
        row.querySelector(
          ".housing-standard-feature-name"
        );

      if (nameInput) {
        nameInput.focus();
      }
    }
  );

  getElement(
    "clearHousingComparisonButton"
  ).addEventListener(
    "click",
    clearHousingComparison
  );

  getElement(
    "housingAutoLoanAmount"
  ).addEventListener(
    "change",
    updateHousingCalculations
  );

  getElement(
    "housingPlanForm"
  )
    .querySelectorAll(
      "input, textarea, select"
    )
    .forEach(
      input => {
        /*
         * 動的に追加されるオプション行と
         * 標準仕様行には、行作成時に
         * 個別でイベントを設定しています。
         */
        if (
          input.closest(
            "#housingPaidOptionList"
          ) ||
          input.closest(
            "#housingStandardFeatureList"
          )
        ) {
          return;
        }

        input.addEventListener(
          "input",
          updateHousingCalculations
        );

        input.addEventListener(
          "change",
          updateHousingCalculations
        );
      }
    );

  /* Cash Flow */

  getElement(
    "recalculateCashFlowButton"
  ).addEventListener(
    "click",
    renderCashFlowPage
  );

  getElement(
    "cashFlowBaseMonth"
  ).addEventListener(
    "change",
    renderCashFlowPage
  );

  getElement(
    "cashFlowHousingPlan"
  ).addEventListener(
    "change",
    renderCashFlowPage
  );

  getElement(
    "cashFlowDisplayMode"
  ).addEventListener(
    "change",
    () => {
      selectedCashFlowMonth = null;

      renderCashFlowTable();
      clearCashFlowDetail();
    }
  );

  getElement(
    "cashFlowYearFilter"
  ).addEventListener(
    "change",
    () => {
      selectedCashFlowMonth = null;

      renderCashFlowTable();
      clearCashFlowDetail();
    }
  );

    /* Simulation */

  getElement(
    "runSimulationButton"
  ).addEventListener(
    "click",
    runSimulationPage
  );

  getElement(
    "simulationBaseMonth"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationHousingPlan"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationEndAgeInput"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationReturnRate"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationMonthlyInvestment"
  ).addEventListener(
    "change",
    runSimulationPage
  );

    getElement(
    "simulationExpenseInflationRate"
  ).addEventListener(
    "change",
    runSimulationPage
  );

   getElement(
    "simulationMeAnnualRaise"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationSpouseAnnualRaise"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationRaiseMonth"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationMeRetirementMonth"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationMeRetirementPayment"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationSpouseRetirementMonth"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationSpouseRetirementPayment"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationMinimumCash"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationCashShortageAction"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  getElement(
    "simulationIncludeEvents"
  ).addEventListener(
    "change",
    runSimulationPage
  );

  /* Settings */

  getElement("settingsForm")
    .addEventListener(
      "submit",
      saveSettings
    );

  getElement("exportButton")
    .addEventListener(
      "click",
      exportData
    );

  getElement("importInput")
    .addEventListener(
      "change",
      importData
    );

  getElement("clearDataButton")
    .addEventListener(
      "click",
      clearAllData
    );

  /* Unsaved changes */

  window.addEventListener(
    "beforeunload",
    event => {
      if (!isMonthlyDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }
  );
}

/* ------------------------------
   Initialization
------------------------------ */

function initializeApp() {
  buildMonthOptions();
  fillSettingsForm();
  registerEventListeners();

  const selectedMonth =
    getElement("globalMonth").value;

  /* Monthly and Home */

  fillMonthlyForm(selectedMonth);
  renderHome();
  renderSavedMonthList();

  /* Timeline */

  clearEventForm();
  renderTimeline();

  /* Housing Planner */

  appData.housingPlans =
    appData.housingPlans.map(
      normalizeHousingPlan
    );

  if (
    appData.housingPlans.length > 0
  ) {
    const firstHousingPlan =
      appData.housingPlans[0];

    selectedHousingPlanId =
      firstHousingPlan.id;

    fillHousingPlanForm(
      firstHousingPlan
    );
  } else {
    clearHousingPlanForm();
  }

  renderHousingPlanPage();

  /* Cash Flow */

  buildCashFlowSelectors();
  renderCashFlowPage();

  /* Simulation */

  buildSimulationSelectors();
  fillSimulationConditions();
  runSimulationPage();
}

initializeApp();
