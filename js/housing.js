"use strict";

/* ------------------------------
   Housing Planner V2
------------------------------ */

const HOUSING_OPTION_CATEGORIES = [
  "外観・外壁",
  "キッチン",
  "洗面・浴室・トイレ",
  "床・建具",
  "収納",
  "窓・カーテン",
  "照明・電気",
  "間取り・造作",
  "空調・床暖房",
  "太陽光・蓄電池",
  "外構",
  "その他"
];


function createHousingItemId(prefix) {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

function createBlankPaidOption() {
  return {
    id: createHousingItemId(
      "paid_option"
    ),

    comparisonKey: "",

    name: "",

    category: "その他",

    amount: 0,

    note: ""
  };
}

function createBlankStandardFeature() {
  return {
    id: createHousingItemId(
      "standard_feature"
    ),

    comparisonKey: "",

    name: "",

    category: "その他",

    detail: ""
  };
}

function createBlankHousingPlan() {
  const globalMonthElement =
    document.getElementById(
      "globalMonth"
    );

  return {
    id: "",

    name: "",

    builderName: "",

    productName: "",

    purchaseMonth:
      globalMonthElement?.value ||
      "2028-04",

    borrowerBirthMonth:
      "1998-07",

    balanceCheckAge: 65,

    price: {
      buildingBaseCost: 0,

      paidOptions: [],

      solarBatteryCost: 0,

      consumptionTaxRate: 10,

      landAndFeesCost: 0,

      otherOutsideCost: 0,

      settlementCost: 0
    },

    standardFeatures: [],

    cashExpenses: {
      furniture: 0,

      appliances: 0,

      moving: 0,

      curtains: 0,

      lighting: 0,

      airConditioners: 0,

      ownerSupplied: 0,

      other: 0
    },

    funding: {
      downPayment: 0,

      familySupport: 0,

      subsidy: 0,

      otherOwnFunds: 0,

      cashBeforePurchase: 0,

      minimumCashReserve: 0
    },

    loan: {
      autoAmount: true,

      amount: 0,

      interestRate: 1,

      termYears: 50,

      bonusPayment: 0,

      stressInterestRate: 2
    },

    annualHousingCosts: {
      propertyTax: Number(
        appData?.settings
          ?.annualPropertyTax || 0
      ),

      maintenance: Number(
        appData?.settings
          ?.annualHomeMaintenance || 0
      ),

      insurance: 0,

      other: 0
    },

    note: "",

    createdAt: "",

    updatedAt: ""
  };
}

function normalizePaidOption(option) {
  const safeOption =
    option &&
    typeof option === "object"
      ? option
      : {};

  return {
    id:
      String(
        safeOption.id || ""
      ) ||
      createHousingItemId(
        "paid_option"
      ),

    comparisonKey:
      String(
        safeOption.comparisonKey ||
        safeOption.name ||
        ""
      ),

    name:
      String(
        safeOption.name || ""
      ),

    category:
      HOUSING_OPTION_CATEGORIES
        .includes(
          safeOption.category
        )
        ? safeOption.category
        : "その他",

    amount:
      Math.max(
        Number(
          safeOption.amount || 0
        ),
        0
      ),

    note:
      String(
        safeOption.note || ""
      )
  };
}

function normalizeStandardFeature(
  feature
) {
  const safeFeature =
    feature &&
    typeof feature === "object"
      ? feature
      : {};

  return {
    id:
      String(
        safeFeature.id || ""
      ) ||
      createHousingItemId(
        "standard_feature"
      ),

    comparisonKey:
      String(
        safeFeature.comparisonKey ||
        safeFeature.name ||
        ""
      ),

    name:
      String(
        safeFeature.name || ""
      ),

    category:
      HOUSING_OPTION_CATEGORIES
        .includes(
          safeFeature.category
        )
        ? safeFeature.category
        : "その他",

    detail:
      String(
        safeFeature.detail ||
        safeFeature.note ||
        ""
      )
  };
}

function migrateLegacyHousingPlan(
  plan
) {
  const blank =
    createBlankHousingPlan();

  const oldCosts =
    plan?.costs || {};

  const furnitureCost =
    Number(
      oldCosts.furniture || 0
    );

  const equipmentCost =
    Number(
      oldCosts.equipment || 0
    );

  return {
    ...blank,
    ...plan,

    builderName:
      String(
        plan?.builderName || ""
      ),

    productName:
      String(
        plan?.productName || ""
      ),

    price: {
      buildingBaseCost:
        Number(
          oldCosts.building || 0
        ),

      paidOptions: [],

      solarBatteryCost: 0,

      /*
       * 旧形式の建物価格が税込か税抜か
       * 判別できないため、移行時は0％にして
       * 保存済み総額が増えないようにします。
       * 編集時に必要に応じて10％へ変更できます。
       */
      consumptionTaxRate: 0,

      landAndFeesCost:
        Number(
          oldCosts.land || 0
        ) +
        Number(
          oldCosts.closing || 0
        ),

      otherOutsideCost:
        Number(
          oldCosts.exterior || 0
        ) +
        Number(
          oldCosts.other || 0
        ),

      settlementCost: 0
    },

    standardFeatures: [],

    cashExpenses: {
      ...blank.cashExpenses,

      furniture:
        furnitureCost,

      appliances:
        equipmentCost
    },

    annualHousingCosts: {
      ...blank.annualHousingCosts,

      propertyTax:
        Number(
          plan?.annualHousingCosts
            ?.propertyTax ||
          appData?.settings
            ?.annualPropertyTax ||
          0
        ),

      maintenance:
        Number(
          plan?.annualHousingCosts
            ?.maintenance ||
          appData?.settings
            ?.annualHomeMaintenance ||
          0
        )
    }
  };
}

function normalizeHousingPlan(plan) {
  const blank =
    createBlankHousingPlan();

  const safePlan =
    plan &&
    typeof plan === "object"
      ? plan
      : {};

  const hasNewPriceStructure =
    safePlan.price &&
    typeof safePlan.price ===
      "object";

  const sourcePlan =
    hasNewPriceStructure
      ? safePlan
      : migrateLegacyHousingPlan(
          safePlan
        );

  const rawPaidOptions =
    Array.isArray(
      sourcePlan.price
        ?.paidOptions
    )
      ? sourcePlan.price
          .paidOptions
      : [];

  const rawStandardFeatures =
    Array.isArray(
      sourcePlan
        .standardFeatures
    )
      ? sourcePlan
          .standardFeatures
      : [];

  return {
    ...blank,
    ...sourcePlan,

    id:
      sourcePlan.id === ""
        ? ""
        : String(
            sourcePlan.id ||
            createHousingPlanId()
          ),

    name:
      String(
        sourcePlan.name || ""
      ),

    builderName:
      String(
        sourcePlan.builderName ||
        ""
      ),

    productName:
      String(
        sourcePlan.productName ||
        ""
      ),

    purchaseMonth:
      String(
        sourcePlan.purchaseMonth ||
        blank.purchaseMonth
      ),

    borrowerBirthMonth:
      String(
        sourcePlan
          .borrowerBirthMonth ||
        blank.borrowerBirthMonth
      ),

    balanceCheckAge:
      Number(
        sourcePlan
          .balanceCheckAge ||
        65
      ),

    price: {
      ...blank.price,
      ...(sourcePlan.price || {}),

      buildingBaseCost:
        Math.max(
          Number(
            sourcePlan.price
              ?.buildingBaseCost ||
            0
          ),
          0
        ),

      paidOptions:
        rawPaidOptions
          .map(
            normalizePaidOption
          )
          .filter(
            option =>
              option.name ||
              option.amount > 0 ||
              option.note
          ),

      solarBatteryCost:
        Math.max(
          Number(
            sourcePlan.price
              ?.solarBatteryCost ||
            0
          ),
          0
        ),

      consumptionTaxRate:
        Math.max(
          Number(
            sourcePlan.price
              ?.consumptionTaxRate ??
            10
          ),
          0
        ),

      landAndFeesCost:
        Math.max(
          Number(
            sourcePlan.price
              ?.landAndFeesCost ||
            0
          ),
          0
        ),

      otherOutsideCost:
        Math.max(
          Number(
            sourcePlan.price
              ?.otherOutsideCost ||
            0
          ),
          0
        ),

      settlementCost:
        Math.max(
          Number(
            sourcePlan.price
              ?.settlementCost ||
            0
          ),
          0
        )
    },

    standardFeatures:
      rawStandardFeatures
        .map(
          normalizeStandardFeature
        )
        .filter(
          feature =>
            feature.name ||
            feature.detail
        ),

    cashExpenses: {
      ...blank.cashExpenses,
      ...(sourcePlan
        .cashExpenses || {}),

      furniture:
        Math.max(
          Number(
            sourcePlan
              .cashExpenses
              ?.furniture ||
            0
          ),
          0
        ),

      appliances:
        Math.max(
          Number(
            sourcePlan
              .cashExpenses
              ?.appliances ||
            0
          ),
          0
        ),

      moving:
        Math.max(
          Number(
            sourcePlan
              .cashExpenses
              ?.moving ||
            0
          ),
          0
        ),

      curtains:
        Math.max(
          Number(
            sourcePlan
              .cashExpenses
              ?.curtains ||
            0
          ),
          0
        ),

      lighting:
        Math.max(
          Number(
            sourcePlan
              .cashExpenses
              ?.lighting ||
            0
          ),
          0
        ),

      airConditioners:
        Math.max(
          Number(
            sourcePlan
              .cashExpenses
              ?.airConditioners ||
            0
          ),
          0
        ),

      ownerSupplied:
        Math.max(
          Number(
            sourcePlan
              .cashExpenses
              ?.ownerSupplied ||
            0
          ),
          0
        ),

      other:
        Math.max(
          Number(
            sourcePlan
              .cashExpenses
              ?.other ||
            0
          ),
          0
        )
    },

    funding: {
      ...blank.funding,
      ...(sourcePlan.funding || {})
    },

    loan: {
      ...blank.loan,
      ...(sourcePlan.loan || {}),

      autoAmount:
        sourcePlan.loan
          ?.autoAmount !== false,

      amount:
        Math.max(
          Number(
            sourcePlan.loan
              ?.amount || 0
          ),
          0
        ),

      interestRate:
        Math.max(
          Number(
            sourcePlan.loan
              ?.interestRate ??
            1
          ),
          0
        ),

      termYears:
        Math.max(
          Number(
            sourcePlan.loan
              ?.termYears ||
            50
          ),
          1
        ),

      bonusPayment:
        Math.max(
          Number(
            sourcePlan.loan
              ?.bonusPayment ||
            0
          ),
          0
        ),

      stressInterestRate:
        Math.max(
          Number(
            sourcePlan.loan
              ?.stressInterestRate ??
            2
          ),
          0
        )
    },

    annualHousingCosts: {
      ...blank.annualHousingCosts,
      ...(sourcePlan
        .annualHousingCosts ||
        {}),

      propertyTax:
        Math.max(
          Number(
            sourcePlan
              .annualHousingCosts
              ?.propertyTax ||
            0
          ),
          0
        ),

      maintenance:
        Math.max(
          Number(
            sourcePlan
              .annualHousingCosts
              ?.maintenance ||
            0
          ),
          0
        ),

      insurance:
        Math.max(
          Number(
            sourcePlan
              .annualHousingCosts
              ?.insurance ||
            0
          ),
          0
        ),

      other:
        Math.max(
          Number(
            sourcePlan
              .annualHousingCosts
              ?.other ||
            0
          ),
          0
        )
    },

    note:
      String(
        sourcePlan.note || ""
      ),

    createdAt:
      String(
        sourcePlan.createdAt ||
        ""
      ),

    updatedAt:
      String(
        sourcePlan.updatedAt ||
        ""
      )
  };
}

function createHousingCategoryOptions(
  selectedCategory
) {
  return HOUSING_OPTION_CATEGORIES
    .map(
      category => {
        const selected =
          category ===
          selectedCategory
            ? " selected"
            : "";

        return (
          `<option value="${escapeHtml(
            category
          )}"${selected}>` +
          `${escapeHtml(
            category
          )}` +
          `</option>`
        );
      }
    )
    .join("");
}

function addPaidOptionRow(
  option = createBlankPaidOption()
) {
  const list =
    getElement(
      "housingPaidOptionList"
    );

  const normalized =
    normalizePaidOption(option);

  const row =
    document.createElement("div");

  row.className =
    "housing-option-row";

  row.dataset.optionId =
    normalized.id;

  row.innerHTML = `
    <input
      class="housing-paid-option-name"
      type="text"
      maxlength="100"
      placeholder="例：キッチン天板変更"
      value="${escapeHtml(
        normalized.name
      )}"
    >

    <select
      class="housing-paid-option-category"
    >
      ${createHousingCategoryOptions(
        normalized.category
      )}
    </select>

    <div
      class="housing-option-amount-wrap"
    >
      <input
        class="housing-paid-option-amount"
        type="number"
        min="0"
        step="1000"
        placeholder="0"
        value="${
          normalized.amount || ""
        }"
      >

      <span>円</span>
    </div>

    <input
      class="housing-paid-option-note"
      type="text"
      maxlength="200"
      placeholder="色・サイズなど"
      value="${escapeHtml(
        normalized.note
      )}"
    >

    <button
      class="housing-row-delete-button"
      type="button"
      aria-label="有料オプションを削除"
      title="削除"
    >
      ×
    </button>
  `;

  row
    .querySelector(
      ".housing-row-delete-button"
    )
    .addEventListener(
      "click",
      () => {
        row.remove();

        updateHousingOptionEmptyStates();
        updateHousingCalculations();
      }
    );

  row
    .querySelectorAll(
      "input, select"
    )
    .forEach(
      input => {
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

  list.appendChild(row);

  updateHousingOptionEmptyStates();

  return row;
}

function addStandardFeatureRow(
  feature =
    createBlankStandardFeature()
) {
  const list =
    getElement(
      "housingStandardFeatureList"
    );

  const normalized =
    normalizeStandardFeature(
      feature
    );

  const row =
    document.createElement("div");

  row.className =
    "housing-feature-row";

  row.dataset.featureId =
    normalized.id;

  row.innerHTML = `
    <input
      class="housing-standard-feature-name"
      type="text"
      maxlength="100"
      placeholder="例：ハイドロテクトタイル"
      value="${escapeHtml(
        normalized.name
      )}"
    >

    <select
      class="housing-standard-feature-category"
    >
      ${createHousingCategoryOptions(
        normalized.category
      )}
    </select>

    <input
      class="housing-standard-feature-detail"
      type="text"
      maxlength="300"
      placeholder="例：全面標準採用"
      value="${escapeHtml(
        normalized.detail
      )}"
    >

    <button
      class="housing-row-delete-button"
      type="button"
      aria-label="標準仕様を削除"
      title="削除"
    >
      ×
    </button>
  `;

  row
    .querySelector(
      ".housing-row-delete-button"
    )
    .addEventListener(
      "click",
      () => {
        row.remove();

        updateHousingOptionEmptyStates();
        updateHousingCalculations();
      }
    );

  row
    .querySelectorAll(
      "input, select"
    )
    .forEach(
      input => {
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

  list.appendChild(row);

  updateHousingOptionEmptyStates();

  return row;
}

function updateHousingOptionEmptyStates() {
  const paidOptionCount =
    getElement(
      "housingPaidOptionList"
    ).children.length;

  const standardFeatureCount =
    getElement(
      "housingStandardFeatureList"
    ).children.length;

  getElement(
    "housingPaidOptionEmpty"
  ).classList.toggle(
    "hidden",
    paidOptionCount > 0
  );

  getElement(
    "housingStandardFeatureEmpty"
  ).classList.toggle(
    "hidden",
    standardFeatureCount > 0
  );
}

function clearHousingDynamicRows() {
  getElement(
    "housingPaidOptionList"
  ).innerHTML = "";

  getElement(
    "housingStandardFeatureList"
  ).innerHTML = "";

  updateHousingOptionEmptyStates();
}

function readPaidOptionsFromForm() {
  return Array.from(
    getElement(
      "housingPaidOptionList"
    ).querySelectorAll(
      ".housing-option-row"
    )
  )
    .map(
      row => {
        const name =
          row
            .querySelector(
              ".housing-paid-option-name"
            )
            .value
            .trim();

        return normalizePaidOption({
          id:
            row.dataset.optionId,

          comparisonKey:
            name,

          name,

          category:
            row
              .querySelector(
                ".housing-paid-option-category"
              )
              .value,

          amount:
            Number(
              row
                .querySelector(
                  ".housing-paid-option-amount"
                )
                .value || 0
            ),

          note:
            row
              .querySelector(
                ".housing-paid-option-note"
              )
              .value
              .trim()
        });
      }
    )
    .filter(
      option =>
        option.name ||
        option.amount > 0 ||
        option.note
    );
}

function readStandardFeaturesFromForm() {
  return Array.from(
    getElement(
      "housingStandardFeatureList"
    ).querySelectorAll(
      ".housing-feature-row"
    )
  )
    .map(
      row => {
        const name =
          row
            .querySelector(
              ".housing-standard-feature-name"
            )
            .value
            .trim();

        return normalizeStandardFeature({
          id:
            row.dataset.featureId,

          comparisonKey:
            name,

          name,

          category:
            row
              .querySelector(
                ".housing-standard-feature-category"
              )
              .value,

          detail:
            row
              .querySelector(
                ".housing-standard-feature-detail"
              )
              .value
              .trim()
        });
      }
    )
    .filter(
      feature =>
        feature.name ||
        feature.detail
    );
}

function readHousingPlanForm() {
  return normalizeHousingPlan({
    id:
      getElement(
        "housingPlanId"
      ).value.trim(),

    name:
      getElement(
        "housingPlanName"
      ).value.trim(),

    builderName:
      getElement(
        "housingBuilderName"
      ).value.trim(),

    productName:
      getElement(
        "housingProductName"
      ).value.trim(),

    purchaseMonth:
      getElement(
        "housingPurchaseMonth"
      ).value,

    borrowerBirthMonth:
      getElement(
        "housingBorrowerBirthMonth"
      ).value,

    balanceCheckAge:
      Number(
        getElement(
          "housingBalanceCheckAge"
        ).value || 65
      ),

    price: {
      buildingBaseCost:
        Number(
          getElement(
            "housingBuildingBaseCost"
          ).value || 0
        ),

      paidOptions:
        readPaidOptionsFromForm(),

      solarBatteryCost:
        Number(
          getElement(
            "housingSolarBatteryCost"
          ).value || 0
        ),

      consumptionTaxRate:
        Number(
          getElement(
            "housingConsumptionTaxRate"
          ).value || 0
        ),

      landAndFeesCost:
        Number(
          getElement(
            "housingLandAndFeesCost"
          ).value || 0
        ),

      otherOutsideCost:
        Number(
          getElement(
            "housingOtherOutsideCost"
          ).value || 0
        ),

      settlementCost:
        Number(
          getElement(
            "housingSettlementCost"
          ).value || 0
        )
    },

    standardFeatures:
      readStandardFeaturesFromForm(),

    cashExpenses: {
      furniture:
        Number(
          getElement(
            "housingFurnitureCashCost"
          ).value || 0
        ),

      appliances:
        Number(
          getElement(
            "housingApplianceCashCost"
          ).value || 0
        ),

      moving:
        Number(
          getElement(
            "housingMovingCashCost"
          ).value || 0
        ),

      curtains:
        Number(
          getElement(
            "housingCurtainCashCost"
          ).value || 0
        ),

      lighting:
        Number(
          getElement(
            "housingLightingCashCost"
          ).value || 0
        ),

      airConditioners:
        Number(
          getElement(
            "housingAirConditionerCashCost"
          ).value || 0
        ),

      ownerSupplied:
        Number(
          getElement(
            "housingOwnerSuppliedCashCost"
          ).value || 0
        ),

      other:
        Number(
          getElement(
            "housingOtherCashCost"
          ).value || 0
        )
    },

    funding: {
      downPayment:
        Number(
          getElement(
            "housingDownPayment"
          ).value || 0
        ),

      familySupport:
        Number(
          getElement(
            "housingFamilySupport"
          ).value || 0
        ),

      subsidy:
        Number(
          getElement(
            "housingSubsidy"
          ).value || 0
        ),

      otherOwnFunds:
        Number(
          getElement(
            "housingOtherOwnFunds"
          ).value || 0
        ),

      cashBeforePurchase:
        Number(
          getElement(
            "housingCashBeforePurchase"
          ).value || 0
        ),

      minimumCashReserve:
        Number(
          getElement(
            "housingMinimumCashReserve"
          ).value || 0
        )
    },

    loan: {
      autoAmount:
        getElement(
          "housingAutoLoanAmount"
        ).checked,

      amount:
        Number(
          getElement(
            "housingLoanAmount"
          ).value || 0
        ),

      interestRate:
        Number(
          getElement(
            "housingInterestRate"
          ).value || 0
        ),

      termYears:
        Number(
          getElement(
            "housingLoanTermYears"
          ).value || 0
        ),

      bonusPayment:
        Number(
          getElement(
            "housingBonusPayment"
          ).value || 0
        ),

      stressInterestRate:
        Number(
          getElement(
            "housingStressInterestRate"
          ).value || 0
        )
    },

    annualHousingCosts: {
      propertyTax:
        Number(
          getElement(
            "housingAnnualPropertyTax"
          ).value || 0
        ),

      maintenance:
        Number(
          getElement(
            "housingAnnualMaintenance"
          ).value || 0
        ),

      insurance:
        Number(
          getElement(
            "housingAnnualInsurance"
          ).value || 0
        ),

      other:
        Number(
          getElement(
            "housingAnnualOtherCost"
          ).value || 0
        )
    },

    note:
      getElement(
        "housingPlanNote"
      ).value.trim()
  });
}

function calculateLoanPayment(
  principal,
  annualRate,
  months
) {
  const safePrincipal =
    Math.max(Number(principal || 0), 0);

  const safeMonths =
    Math.max(Number(months || 0), 0);

  if (
    safePrincipal === 0 ||
    safeMonths === 0
  ) {
    return 0;
  }

  const monthlyRate =
    Number(annualRate || 0) /
    100 /
    12;

  if (monthlyRate === 0) {
    return (
      safePrincipal /
      safeMonths
    );
  }

  return (
    safePrincipal *
    monthlyRate *
    Math.pow(
      1 + monthlyRate,
      safeMonths
    )
  ) /
  (
    Math.pow(
      1 + monthlyRate,
      safeMonths
    ) - 1
  );
}

function calculateRemainingLoanBalance(
  principal,
  annualRate,
  totalMonths,
  elapsedMonths,
  monthlyPayment
) {
  const safePrincipal =
    Math.max(Number(principal || 0), 0);

  const safeTotalMonths =
    Math.max(Number(totalMonths || 0), 0);

  const safeElapsedMonths =
    Math.max(
      0,
      Math.min(
        Number(elapsedMonths || 0),
        safeTotalMonths
      )
    );

  if (
    safePrincipal === 0 ||
    safeElapsedMonths >= safeTotalMonths
  ) {
    return 0;
  }

  const monthlyRate =
    Number(annualRate || 0) /
    100 /
    12;

  if (monthlyRate === 0) {
    return Math.max(
      safePrincipal -
      Number(monthlyPayment || 0) *
      safeElapsedMonths,
      0
    );
  }

  const growth =
    Math.pow(
      1 + monthlyRate,
      safeElapsedMonths
    );

  const balance =
    safePrincipal * growth -
    Number(monthlyPayment || 0) *
    (
      (growth - 1) /
      monthlyRate
    );

  return Math.max(balance, 0);
}


function calculateHousingPlan(plan) {
  const normalized =
    normalizeHousingPlan(plan);

  const paidOptionTotal =
    normalized.price.paidOptions
      .reduce(
        (total, option) =>
          total +
          Number(option.amount || 0),
        0
      );

  const constructionSubtotal =
    Number(
      normalized.price
        .buildingBaseCost || 0
    ) +
    paidOptionTotal +
    Number(
      normalized.price
        .solarBatteryCost || 0
    );

  const consumptionTax =
    constructionSubtotal *
    (
      Number(
        normalized.price
          .consumptionTaxRate || 0
      ) / 100
    );

  const constructionTaxIncluded =
    constructionSubtotal +
    consumptionTax;

  const outsideContractTotal =
    Number(
      normalized.price
        .landAndFeesCost || 0
    ) +
    Number(
      normalized.price
        .otherOutsideCost || 0
    ) +
    Number(
      normalized.price
        .settlementCost || 0
    );

  const housingPriceTotal =
    constructionTaxIncluded +
    outsideContractTotal;

  const cashExpenseTotal =
    Object.values(
      normalized.cashExpenses
    ).reduce(
      (total, value) =>
        total +
        Number(value || 0),
      0
    );

  const totalRequiredFunds =
    housingPriceTotal +
    cashExpenseTotal;

  const ownFunds =
    Number(
      normalized.funding
        .downPayment || 0
    ) +
    Number(
      normalized.funding
        .familySupport || 0
    ) +
    Number(
      normalized.funding
        .subsidy || 0
    ) +
    Number(
      normalized.funding
        .otherOwnFunds || 0
    );

  /*
   * 家具・家電などの現金支出は
   * 住宅ローンには含めません。
   */
  const automaticLoanAmount =
    Math.max(
      housingPriceTotal -
      ownFunds,
      0
    );

  const loanAmount =
    normalized.loan.autoAmount
      ? automaticLoanAmount
      : Math.max(
          Number(
            normalized.loan
              .amount || 0
          ),
          0
        );

  const termMonths =
    Math.max(
      Number(
        normalized.loan
          .termYears || 0
      ) * 12,
      0
    );

  const annualBonusPayment =
    Number(
      normalized.loan
        .bonusPayment || 0
    ) * 2;

  const bonusPaymentTotal =
    annualBonusPayment *
    Number(
      normalized.loan
        .termYears || 0
    );

  const principalForMonthlyPayment =
    Math.max(
      loanAmount -
      bonusPaymentTotal,
      0
    );

  const monthlyPayment =
    calculateLoanPayment(
      principalForMonthlyPayment,
      normalized.loan.interestRate,
      termMonths
    );

  const annualPayment =
    monthlyPayment * 12 +
    annualBonusPayment;

  const totalPayment =
    monthlyPayment *
    termMonths +
    bonusPaymentTotal;

  const totalInterest =
    Math.max(
      totalPayment -
      loanAmount,
      0
    );

  const checkMonth =
    addYearsToMonth(
      normalized.borrowerBirthMonth,
      normalized.balanceCheckAge
    );

  const elapsedMonths =
    Math.max(
      getMonthDifference(
        normalized.purchaseMonth,
        checkMonth
      ),
      0
    );

  const remainingMonthlyBalance =
    calculateRemainingLoanBalance(
      principalForMonthlyPayment,
      normalized.loan.interestRate,
      termMonths,
      elapsedMonths,
      monthlyPayment
    );

  const remainingBonusCount =
    Math.max(
      Math.ceil(
        (
          termMonths -
          Math.min(
            elapsedMonths,
            termMonths
          )
        ) / 6
      ),
      0
    );

  const remainingBonusBalance =
    Math.min(
      Number(
        normalized.loan
          .bonusPayment || 0
      ) *
      remainingBonusCount,
      bonusPaymentTotal
    );

  const balanceAtAge =
    Math.max(
      remainingMonthlyBalance +
      remainingBonusBalance,
      0
    );

  const stressMonthlyPayment =
    calculateLoanPayment(
      principalForMonthlyPayment,
      normalized.loan
        .stressInterestRate,
      termMonths
    );

  /*
   * 購入後現金は、
   * 現金から出る頭金・その他自己資金・
   * 家具家電等の現金支出を引きます。
   *
   * 家族援助と補助金は本人の現金から
   * 出すものではないため差し引きません。
   */
  const cashUsed =
    Number(
      normalized.funding
        .downPayment || 0
    ) +
    Number(
      normalized.funding
        .otherOwnFunds || 0
    ) +
    cashExpenseTotal;

  const cashAfterPurchase =
    Number(
      normalized.funding
        .cashBeforePurchase || 0
    ) -
    cashUsed;

  const cashDifference =
    cashAfterPurchase -
    Number(
      normalized.funding
        .minimumCashReserve || 0
    );

  const annualRunningCostTotal =
    Object.values(
      normalized.annualHousingCosts
    ).reduce(
      (total, value) =>
        total +
        Number(value || 0),
      0
    );

  return {
    paidOptionTotal,

    constructionSubtotal,

    consumptionTax,

    constructionTaxIncluded,

    outsideContractTotal,

    housingPriceTotal,

    cashExpenseTotal,

    totalRequiredFunds,

    annualRunningCostTotal,

    ownFunds,

    automaticLoanAmount,

    loanAmount,

    termMonths,

    monthlyPayment,

    annualBonusPayment,

    annualPayment,

    totalPayment,

    totalInterest,

    balanceAtAge,

    checkMonth,

    stressMonthlyPayment,

    cashAfterPurchase,

    cashDifference,

    standardFeatureCount:
      normalized
        .standardFeatures
        .length,

    paidOptionCount:
      normalized.price
        .paidOptions
        .length,

    /*
     * 旧Financial Engineとの互換用です。
     * 住宅購入イベントとして使われる金額は
     * 住宅価格合計とします。
     */
    totalCost:
      housingPriceTotal
  };
}

function setHousingInputValue(
  id,
  value
) {
  getElement(id).value =
    Number(value || 0) || "";
}

function fillHousingPlanForm(plan) {
  const normalized =
    normalizeHousingPlan(plan);

  selectedHousingPlanId =
    normalized.id || null;

  getElement(
    "housingPlanId"
  ).value =
    normalized.id;

  getElement(
    "housingPlanName"
  ).value =
    normalized.name;

  getElement(
    "housingBuilderName"
  ).value =
    normalized.builderName;

  getElement(
    "housingProductName"
  ).value =
    normalized.productName;

  getElement(
    "housingPurchaseMonth"
  ).value =
    normalized.purchaseMonth;

  getElement(
    "housingBorrowerBirthMonth"
  ).value =
    normalized.borrowerBirthMonth;

  getElement(
    "housingBalanceCheckAge"
  ).value =
    normalized.balanceCheckAge;

  setHousingInputValue(
    "housingBuildingBaseCost",
    normalized.price
      .buildingBaseCost
  );

  setHousingInputValue(
    "housingSolarBatteryCost",
    normalized.price
      .solarBatteryCost
  );

  getElement(
    "housingConsumptionTaxRate"
  ).value =
    normalized.price
      .consumptionTaxRate;

  setHousingInputValue(
    "housingLandAndFeesCost",
    normalized.price
      .landAndFeesCost
  );

  setHousingInputValue(
    "housingOtherOutsideCost",
    normalized.price
      .otherOutsideCost
  );

  setHousingInputValue(
    "housingSettlementCost",
    normalized.price
      .settlementCost
  );

  clearHousingDynamicRows();

  normalized.price.paidOptions
    .forEach(
      option => {
        addPaidOptionRow(option);
      }
    );

  normalized.standardFeatures
    .forEach(
      feature => {
        addStandardFeatureRow(
          feature
        );
      }
    );

  setHousingInputValue(
    "housingFurnitureCashCost",
    normalized.cashExpenses
      .furniture
  );

  setHousingInputValue(
    "housingApplianceCashCost",
    normalized.cashExpenses
      .appliances
  );

  setHousingInputValue(
    "housingMovingCashCost",
    normalized.cashExpenses
      .moving
  );

  setHousingInputValue(
    "housingCurtainCashCost",
    normalized.cashExpenses
      .curtains
  );

  setHousingInputValue(
    "housingLightingCashCost",
    normalized.cashExpenses
      .lighting
  );

  setHousingInputValue(
    "housingAirConditionerCashCost",
    normalized.cashExpenses
      .airConditioners
  );

  setHousingInputValue(
    "housingOwnerSuppliedCashCost",
    normalized.cashExpenses
      .ownerSupplied
  );

  setHousingInputValue(
    "housingOtherCashCost",
    normalized.cashExpenses
      .other
  );

  setHousingInputValue(
    "housingDownPayment",
    normalized.funding
      .downPayment
  );

  setHousingInputValue(
    "housingFamilySupport",
    normalized.funding
      .familySupport
  );

  setHousingInputValue(
    "housingSubsidy",
    normalized.funding
      .subsidy
  );

  setHousingInputValue(
    "housingOtherOwnFunds",
    normalized.funding
      .otherOwnFunds
  );

  setHousingInputValue(
    "housingCashBeforePurchase",
    normalized.funding
      .cashBeforePurchase
  );

  setHousingInputValue(
    "housingMinimumCashReserve",
    normalized.funding
      .minimumCashReserve
  );

  getElement(
    "housingAutoLoanAmount"
  ).checked =
    normalized.loan.autoAmount;

  setHousingInputValue(
    "housingLoanAmount",
    normalized.loan.amount
  );

  getElement(
    "housingInterestRate"
  ).value =
    normalized.loan.interestRate;

  getElement(
    "housingLoanTermYears"
  ).value =
    normalized.loan.termYears;

  setHousingInputValue(
    "housingBonusPayment",
    normalized.loan
      .bonusPayment
  );

  getElement(
    "housingStressInterestRate"
  ).value =
    normalized.loan
      .stressInterestRate;

  setHousingInputValue(
    "housingAnnualPropertyTax",
    normalized.annualHousingCosts
      .propertyTax
  );

  setHousingInputValue(
    "housingAnnualMaintenance",
    normalized.annualHousingCosts
      .maintenance
  );

  setHousingInputValue(
    "housingAnnualInsurance",
    normalized.annualHousingCosts
      .insurance
  );

  setHousingInputValue(
    "housingAnnualOtherCost",
    normalized.annualHousingCosts
      .other
  );

  getElement(
    "housingPlanNote"
  ).value =
    normalized.note;

  const isEditing =
    Boolean(normalized.id);

  getElement(
    "housingPlanFormHeading"
  ).textContent =
    isEditing
      ? "住宅プランを編集"
      : "新しい住宅プラン";

  getElement(
    "deleteHousingPlanButton"
  ).classList.toggle(
    "hidden",
    !isEditing
  );

  getElement(
    "duplicateHousingPlanButton"
  ).classList.toggle(
    "hidden",
    !isEditing
  );

  getElement(
    "housingValidationMessage"
  ).classList.add("hidden");

  updateHousingOptionEmptyStates();
  updateHousingCalculations();
  renderHousingPlanList();
}

function clearHousingPlanForm() {
  selectedHousingPlanId = null;

  const blank =
    createBlankHousingPlan();

  fillHousingPlanForm(blank);
}

function updateHousingCalculations() {
  const plan =
    readHousingPlanForm();

  const result =
    calculateHousingPlan(plan);

  const loanAmountInput =
    getElement(
      "housingLoanAmount"
    );

  if (plan.loan.autoAmount) {
    loanAmountInput.value =
      Math.round(
        result.automaticLoanAmount
      );

    loanAmountInput.disabled = true;
  } else {
    loanAmountInput.disabled = false;
  }

  getElement(
    "housingPaidOptionTotal"
  ).textContent =
    formatYen(
      result.paidOptionTotal
    );

  getElement(
    "housingConstructionSubtotal"
  ).textContent =
    formatYen(
      Math.round(
        result.constructionSubtotal
      )
    );

  getElement(
    "housingConsumptionTax"
  ).textContent =
    formatYen(
      Math.round(
        result.consumptionTax
      )
    );

  getElement(
    "housingConstructionTaxIncluded"
  ).textContent =
    formatYen(
      Math.round(
        result.constructionTaxIncluded
      )
    );

  getElement(
    "housingOutsideContractTotal"
  ).textContent =
    formatYen(
      result.outsideContractTotal
    );

  getElement(
    "housingPriceTotal"
  ).textContent =
    formatYen(
      Math.round(
        result.housingPriceTotal
      )
    );

  getElement(
    "housingCashExpenseTotal"
  ).textContent =
    formatYen(
      result.cashExpenseTotal
    );

  getElement(
    "housingTotalRequiredFunds"
  ).textContent =
    formatYen(
      Math.round(
        result.totalRequiredFunds
      )
    );

  getElement(
    "housingAnnualRunningCostTotal"
  ).textContent =
    formatYen(
      result.annualRunningCostTotal
    );

  getElement(
    "housingResultTotalCost"
  ).textContent =
    formatYen(
      Math.round(
        result.housingPriceTotal
      )
    );

  getElement(
    "housingResultConstructionCost"
  ).textContent =
    formatYen(
      Math.round(
        result.constructionTaxIncluded
      )
    );

  getElement(
    "housingResultOutsideCost"
  ).textContent =
    formatYen(
      result.outsideContractTotal
    );

  getElement(
    "housingResultPaidOptionCost"
  ).textContent =
    formatYen(
      result.paidOptionTotal
    );

  getElement(
    "housingResultCashExpense"
  ).textContent =
    formatYen(
      result.cashExpenseTotal
    );

  getElement(
    "housingResultRequiredFunds"
  ).textContent =
    formatYen(
      Math.round(
        result.totalRequiredFunds
      )
    );

  getElement(
    "housingResultOwnFunds"
  ).textContent =
    formatYen(result.ownFunds);

  getElement(
    "housingResultLoanAmount"
  ).textContent =
    formatYen(result.loanAmount);

  getElement(
    "housingResultMonthlyPayment"
  ).textContent =
    formatYen(
      Math.round(
        result.monthlyPayment
      )
    );

  getElement(
    "housingResultAnnualBonus"
  ).textContent =
    formatYen(
      result.annualBonusPayment
    );

  getElement(
    "housingResultAnnualPayment"
  ).textContent =
    formatYen(
      Math.round(
        result.annualPayment
      )
    );

  getElement(
    "housingResultTotalPayment"
  ).textContent =
    formatYen(
      Math.round(
        result.totalPayment
      )
    );

  getElement(
    "housingResultTotalInterest"
  ).textContent =
    formatYen(
      Math.round(
        result.totalInterest
      )
    );

  getElement(
    "housingBalanceAgeLabel"
  ).textContent =
    `${plan.balanceCheckAge}歳時点の残高`;

  getElement(
    "housingResultBalanceAtAge"
  ).textContent =
    formatYen(
      Math.round(
        result.balanceAtAge
      )
    );

  getElement(
    "housingResultStressPayment"
  ).textContent =
    formatYen(
      Math.round(
        result.stressMonthlyPayment
      )
    );

  getElement(
    "housingResultCashAfterPurchase"
  ).textContent =
    formatYen(
      result.cashAfterPurchase
    );

  getElement(
    "housingResultCashDifference"
  ).textContent =
    formatSignedYen(
      result.cashDifference
    );

  getElement(
    "housingStandardFeatureCount"
  ).textContent =
    `${result.standardFeatureCount}件`;

  getElement(
    "housingPaidOptionCount"
  ).textContent =
    `${result.paidOptionCount}件`;

  const judgement =
    getElement(
      "housingCashJudgement"
    );

  judgement.classList.remove(
    "positive",
    "negative",
    "neutral"
  );

  if (
    plan.funding
      .cashBeforePurchase === 0 &&
    plan.funding
      .minimumCashReserve === 0
  ) {
    judgement.textContent =
      "現金残高を入力してください";

    judgement.classList.add(
      "neutral"
    );

  } else if (
    result.cashDifference >= 0
  ) {
    judgement.textContent =
      "最低現金を確保できます";

    judgement.classList.add(
      "positive"
    );

  } else {
    judgement.textContent =
      "最低現金を下回ります";

    judgement.classList.add(
      "negative"
    );
  }

  updateHousingOptionEmptyStates();

  renderHousingSummary(
    plan,
    result
  );
}

function renderHousingSummary(
  plan,
  result
) {
  const safePlan =
    plan || createBlankHousingPlan();

  const safeResult =
    result ||
    calculateHousingPlan(safePlan);

  getElement(
    "housingSummaryTotalCost"
  ).textContent =
    formatYen(
      Math.round(
        safeResult.housingPriceTotal
      )
    );

  getElement(
    "housingSummaryLoanAmount"
  ).textContent =
    formatYen(
      safeResult.loanAmount
    );

  getElement(
    "housingSummaryMonthlyPayment"
  ).textContent =
    formatYen(
      Math.round(
        safeResult.monthlyPayment
      )
    );

  getElement(
    "housingSummaryBalanceAt65"
  ).textContent =
    formatYen(
      Math.round(
        safeResult.balanceAtAge
      )
    );
}

function validateHousingPlan(plan) {
  const messages = [];

  if (!plan.name) {
    messages.push(
      "・プラン名を入力してください。"
    );
  }

  if (!plan.purchaseMonth) {
    messages.push(
      "・購入予定年月を入力してください。"
    );
  }

  if (!plan.borrowerBirthMonth) {
    messages.push(
      "・主債務者の生年月を入力してください。"
    );
  }

  if (
    plan.loan.termYears <= 0
  ) {
    messages.push(
      "・返済期間を入力してください。"
    );
  }

  if (
    plan.loan.interestRate < 0
  ) {
    messages.push(
      "・金利は0％以上で入力してください。"
    );
  }

  if (
    plan.price
      .consumptionTaxRate < 0
  ) {
    messages.push(
      "・消費税率は0％以上で入力してください。"
    );
  }

  const result =
    calculateHousingPlan(plan);

  if (
    result.housingPriceTotal <= 0
  ) {
    messages.push(
      "・住宅購入費用を入力してください。"
    );
  }

  const messageElement =
    getElement(
      "housingValidationMessage"
    );

  if (messages.length > 0) {
    messageElement.textContent =
      messages.join("\n");

    messageElement.classList.remove(
      "hidden"
    );

    return false;
  }

  messageElement.classList.add(
    "hidden"
  );

  return true;
}

function saveHousingPlan(event) {
  event.preventDefault();

  const plan =
    readHousingPlanForm();

  if (!validateHousingPlan(plan)) {
    return;
  }

  const result =
    calculateHousingPlan(plan);

  if (plan.loan.autoAmount) {
    plan.loan.amount =
      result.loanAmount;
  }

  const now =
    new Date().toISOString();

  const existingIndex =
    appData.housingPlans.findIndex(
      item =>
        item.id === plan.id
    );

  if (existingIndex >= 0) {
    const existing =
      appData.housingPlans[
        existingIndex
      ];

    appData.housingPlans[
      existingIndex
    ] =
      normalizeHousingPlan({
        ...existing,
        ...plan,
        updatedAt: now
      });

    selectedHousingPlanId =
      plan.id;

    showToast(
      "住宅プランを更新しました。"
    );

  } else {
    const newPlan =
      normalizeHousingPlan({
        ...plan,
        id: createHousingPlanId(),
        createdAt: now,
        updatedAt: now
      });

    appData.housingPlans.push(
      newPlan
    );

    selectedHousingPlanId =
      newPlan.id;

    showToast(
      "住宅プランを追加しました。"
    );
  }

  saveData();

  renderHousingPlanPage();

  const savedPlan =
    appData.housingPlans.find(
      item =>
        item.id ===
        selectedHousingPlanId
    );

  if (savedPlan) {
    fillHousingPlanForm(
      savedPlan
    );
  }
}

function deleteSelectedHousingPlan() {
  if (!selectedHousingPlanId) {
    return;
  }

  const plan =
    appData.housingPlans.find(
      item =>
        item.id ===
        selectedHousingPlanId
    );

  if (!plan) {
    return;
  }

  const confirmed =
    window.confirm(
      `「${plan.name}」を削除しますか？`
    );

  if (!confirmed) {
    return;
  }

  appData.housingPlans =
    appData.housingPlans.filter(
      item =>
        item.id !==
        selectedHousingPlanId
    );

  selectedHousingComparisonIds =
    selectedHousingComparisonIds
      .filter(
        id =>
          id !==
          selectedHousingPlanId
      );

  saveData();

  clearHousingPlanForm();
  renderHousingPlanPage();

  showToast(
    "住宅プランを削除しました。"
  );
}

function duplicateSelectedHousingPlan() {
  if (!selectedHousingPlanId) {
    return;
  }

  const source =
    appData.housingPlans.find(
      item =>
        item.id ===
        selectedHousingPlanId
    );

  if (!source) {
    return;
  }

  const now =
    new Date().toISOString();

  const duplicatedData =
    deepClone(source);

  duplicatedData.price.paidOptions =
    duplicatedData.price
      .paidOptions
      .map(
        option => ({
          ...option,
          id:
            createHousingItemId(
              "paid_option"
            )
        })
      );

  duplicatedData.standardFeatures =
    duplicatedData
      .standardFeatures
      .map(
        feature => ({
          ...feature,
          id:
            createHousingItemId(
              "standard_feature"
            )
        })
      );

  const duplicated =
    normalizeHousingPlan({
      ...duplicatedData,

      id:
        createHousingPlanId(),

      name:
        `${source.name}（コピー）`,

      createdAt: now,

      updatedAt: now
    });

  appData.housingPlans.push(
    duplicated
  );

  selectedHousingPlanId =
    duplicated.id;

  saveData();

  renderHousingPlanPage();
  fillHousingPlanForm(
    duplicated
  );

  showToast(
    "住宅プランを複製しました。"
  );
}

function toggleHousingComparison(
  planId
) {
  const index =
    selectedHousingComparisonIds
      .indexOf(planId);

  if (index >= 0) {
    selectedHousingComparisonIds
      .splice(index, 1);

  } else {
    if (
      selectedHousingComparisonIds
        .length >= 3
    ) {
      showToast(
        "比較できる住宅プランは最大3件です。"
      );

      return;
    }

    selectedHousingComparisonIds
      .push(planId);
  }

  renderHousingPlanList();
  renderHousingComparison();
}

function clearHousingComparison() {
  selectedHousingComparisonIds = [];

  renderHousingPlanList();
  renderHousingComparison();
}

function renderHousingPlanList() {
  const list =
    getElement(
      "housingPlanList"
    );

  const plans =
    appData.housingPlans
      .map(normalizeHousingPlan)
      .sort(
        (planA, planB) =>
          compareMonths(
            planA.purchaseMonth,
            planB.purchaseMonth
          )
      );

  getElement(
    "housingPlanCount"
  ).textContent =
    `${plans.length}件`;

  list.innerHTML = "";

  if (plans.length === 0) {
    const empty =
      document.createElement("div");

    empty.className =
      "list-empty";

    empty.textContent =
      "住宅プランはまだ登録されていません。";

    list.appendChild(empty);

    return;
  }

  plans.forEach(
    plan => {
      const result =
        calculateHousingPlan(plan);

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "housing-plan-list-item";

      if (
        plan.id ===
        selectedHousingPlanId
      ) {
        card.classList.add(
          "selected"
        );
      }

      const isComparing =
        selectedHousingComparisonIds
          .includes(plan.id);

      if (isComparing) {
        card.classList.add(
          "comparing"
        );
      }

      const builderProduct =
        [
          plan.builderName,
          plan.productName
        ]
          .filter(Boolean)
          .join("／") ||
        "メーカー・商品未入力";

      card.innerHTML = `
        <div
          class="housing-plan-list-item-header"
        >
          <div>
            <h4>
              ${escapeHtml(plan.name)}
            </h4>

            <p
              class="housing-plan-list-item-subtitle"
            >
              ${escapeHtml(
                builderProduct
              )}
            </p>
          </div>

          <span
            class="housing-category-badge"
          >
            ${escapeHtml(
              formatMonthJapanese(
                plan.purchaseMonth
              )
            )}
          </span>
        </div>

        <strong
          class="housing-plan-price"
        >
          ${escapeHtml(
            formatYen(
              Math.round(
                result.housingPriceTotal
              )
            )
          )}
        </strong>

        <div
          class="housing-plan-list-meta"
        >
          <div
            class="housing-plan-list-meta-row"
          >
            <span>月々返済</span>

            <strong>
              ${escapeHtml(
                formatYen(
                  Math.round(
                    result.monthlyPayment
                  )
                )
              )}
            </strong>
          </div>

          <div
            class="housing-plan-list-meta-row"
          >
            <span>標準仕様</span>

            <strong>
              ${result.standardFeatureCount}件
            </strong>
          </div>

          <div
            class="housing-plan-list-meta-row"
          >
            <span>有料オプション</span>

            <strong>
              ${result.paidOptionCount}件・
              ${escapeHtml(
                formatYen(
                  result.paidOptionTotal
                )
              )}
            </strong>
          </div>
        </div>

        <div
          class="housing-plan-card-actions"
        >
          <button
            class="secondary-button housing-edit-plan-button"
            type="button"
          >
            編集
          </button>

          <button
            class="${
              isComparing
                ? "primary-button"
                : "secondary-button"
            } housing-compare-plan-button"
            type="button"
          >
            ${
              isComparing
                ? "比較から外す"
                : "比較に追加"
            }
          </button>
        </div>
      `;

      card
        .querySelector(
          ".housing-edit-plan-button"
        )
        .addEventListener(
          "click",
          () => {
            selectedHousingPlanId =
              plan.id;

            fillHousingPlanForm(
              plan
            );

            getElement(
              "housingPlanForm"
            ).scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
        );

      card
        .querySelector(
          ".housing-compare-plan-button"
        )
        .addEventListener(
          "click",
          () => {
            toggleHousingComparison(
              plan.id
            );
          }
        );

      list.appendChild(card);
    }
  );
}

function createComparisonSectionRow(
  title,
  columnCount
) {
  return `
    <tr class="comparison-section-row">
      <th colspan="${columnCount + 1}">
        ${escapeHtml(title)}
      </th>
    </tr>
  `;
}

function createComparisonValueRow(
  label,
  values,
  className = ""
) {
  return `
    <tr class="${className}">
      <th>
        ${escapeHtml(label)}
      </th>

      ${values
        .map(
          value => `
            <td>
              ${value}
            </td>
          `
        )
        .join("")}
    </tr>
  `;
}

function getHousingComparisonItemMap(
  plan
) {
  const map = new Map();

  plan.standardFeatures
    .forEach(
      feature => {
        const key =
          (
            feature.comparisonKey ||
            feature.name
          )
            .trim()
            .toLowerCase();

        if (!key) {
          return;
        }

        map.set(key, {
          name: feature.name,
          category:
            feature.category,
          type: "standard",
          detail:
            feature.detail,
          amount: 0
        });
      }
    );

  plan.price.paidOptions
    .forEach(
      option => {
        const key =
          (
            option.comparisonKey ||
            option.name
          )
            .trim()
            .toLowerCase();

        if (!key) {
          return;
        }

        map.set(key, {
          name: option.name,
          category:
            option.category,
          type: "paid",
          detail:
            option.note,
          amount:
            option.amount
        });
      }
    );

  return map;
}

function renderHousingComparison() {
  selectedHousingComparisonIds =
    selectedHousingComparisonIds
      .filter(
        id =>
          appData.housingPlans
            .some(
              plan =>
                plan.id === id
            )
      );

  const plans =
    selectedHousingComparisonIds
      .map(
        id =>
          appData.housingPlans
            .map(
              normalizeHousingPlan
            )
            .find(
              plan =>
                plan.id === id
            )
      )
      .filter(Boolean);

  const empty =
    getElement(
      "housingComparisonEmpty"
    );

  const area =
    getElement(
      "housingComparisonArea"
    );

  if (plans.length === 0) {
    empty.classList.remove(
      "hidden"
    );

    area.classList.add(
      "hidden"
    );

    getElement(
      "housingComparisonHead"
    ).innerHTML = "";

    getElement(
      "housingComparisonBody"
    ).innerHTML = "";

    return;
  }

  empty.classList.add(
    "hidden"
  );

  area.classList.remove(
    "hidden"
  );

  const results =
    plans.map(
      calculateHousingPlan
    );

  const minimumPrice =
    Math.min(
      ...results.map(
        result =>
          result.housingPriceTotal
      )
    );

  getElement(
    "housingComparisonHead"
  ).innerHTML = `
    <tr>
      <th>比較項目</th>

      ${plans
        .map(
          plan => `
            <th>
              <span
                class="housing-comparison-plan-name"
              >
                ${escapeHtml(plan.name)}
              </span>

              <span
                class="housing-comparison-product-name"
              >
                ${escapeHtml(
                  [
                    plan.builderName,
                    plan.productName
                  ]
                    .filter(Boolean)
                    .join("／") ||
                  "商品名未入力"
                )}
              </span>
            </th>
          `
        )
        .join("")}
    </tr>
  `;

  const rows = [];

  rows.push(
    createComparisonSectionRow(
      "価格・住宅ローン",
      plans.length
    )
  );

  rows.push(
    createComparisonValueRow(
      "住宅価格合計",
      results.map(
        result => {
          const difference =
            result.housingPriceTotal -
            minimumPrice;

          return `
            <span
              class="housing-comparison-main-price"
            >
              ${escapeHtml(
                formatYen(
                  Math.round(
                    result.housingPriceTotal
                  )
                )
              )}
            </span>

            <span
              class="housing-comparison-difference"
            >
              ${
                difference > 0
                  ? `最安案より ${escapeHtml(
                      formatYen(
                        Math.round(
                          difference
                        )
                      )
                    )}高い`
                  : "比較中の最安案"
              }
            </span>
          `;
        }
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "建築工事費（税込）",
      results.map(
        result =>
          escapeHtml(
            formatYen(
              Math.round(
                result
                  .constructionTaxIncluded
              )
            )
          )
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "請負外費用",
      results.map(
        result =>
          escapeHtml(
            formatYen(
              result
                .outsideContractTotal
            )
          )
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "有料オプション合計",
      results.map(
        result =>
          escapeHtml(
            formatYen(
              result.paidOptionTotal
            )
          )
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "購入時現金支出",
      results.map(
        result =>
          escapeHtml(
            formatYen(
              result.cashExpenseTotal
            )
          )
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "住宅ローン借入額",
      results.map(
        result =>
          escapeHtml(
            formatYen(
              result.loanAmount
            )
          )
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "月々返済額",
      results.map(
        result =>
          escapeHtml(
            formatYen(
              Math.round(
                result.monthlyPayment
              )
            )
          )
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "総返済額",
      results.map(
        result =>
          escapeHtml(
            formatYen(
              Math.round(
                result.totalPayment
              )
            )
          )
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "65歳時点の残高",
      results.map(
        result =>
          escapeHtml(
            formatYen(
              Math.round(
                result.balanceAtAge
              )
            )
          )
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "年間住宅維持費",
      results.map(
        result =>
          escapeHtml(
            formatYen(
              result
                .annualRunningCostTotal
            )
          )
      )
    )
  );

  rows.push(
    createComparisonSectionRow(
      "仕様・オプション",
      plans.length
    )
  );

  rows.push(
    createComparisonValueRow(
      "標準仕様数",
      results.map(
        result =>
          `${result.standardFeatureCount}件`
      )
    )
  );

  rows.push(
    createComparisonValueRow(
      "有料オプション数",
      results.map(
        result =>
          `${result.paidOptionCount}件`
      )
    )
  );

  const planItemMaps =
    plans.map(
      getHousingComparisonItemMap
    );

  const allKeys =
    Array.from(
      new Set(
        planItemMaps.flatMap(
          map =>
            Array.from(
              map.keys()
            )
        )
      )
    );

  allKeys.sort(
    (keyA, keyB) => {
      const itemA =
        planItemMaps
          .map(
            map =>
              map.get(keyA)
          )
          .find(Boolean);

      const itemB =
        planItemMaps
          .map(
            map =>
              map.get(keyB)
          )
          .find(Boolean);

      return (
        String(
          itemA?.category || ""
        ).localeCompare(
          String(
            itemB?.category || ""
          ),
          "ja"
        ) ||
        String(
          itemA?.name || ""
        ).localeCompare(
          String(
            itemB?.name || ""
          ),
          "ja"
        )
      );
    }
  );

  allKeys.forEach(
    key => {
      const firstItem =
        planItemMaps
          .map(
            map =>
              map.get(key)
          )
          .find(Boolean);

      if (!firstItem) {
        return;
      }

      const label =
        firstItem.category
          ? `${firstItem.category}｜${firstItem.name}`
          : firstItem.name;

      const values =
        planItemMaps.map(
          map => {
            const item =
              map.get(key);

            if (!item) {
              return `
                <span
                  class="housing-comparison-status none"
                >
                  なし
                </span>
              `;
            }

            if (
              item.type ===
              "standard"
            ) {
              return `
                <span
                  class="housing-comparison-status standard"
                >
                  標準
                </span>

                ${
                  item.detail
                    ? `
                      <span
                        class="housing-comparison-feature-text"
                      >
                        ${escapeHtml(
                          item.detail
                        )}
                      </span>
                    `
                    : ""
                }
              `;
            }

            return `
              <span
                class="housing-comparison-status paid"
              >
                追加
                ${escapeHtml(
                  formatYen(
                    item.amount
                  )
                )}
              </span>

              ${
                item.detail
                  ? `
                    <span
                      class="housing-comparison-feature-text"
                    >
                      ${escapeHtml(
                        item.detail
                      )}
                    </span>
                  `
                  : ""
              }
            `;
          }
        );

      rows.push(
        createComparisonValueRow(
          label,
          values
        )
      );
    }
  );

  if (allKeys.length === 0) {
    rows.push(
      createComparisonValueRow(
        "登録内容",
        plans.map(
          () =>
            `<span class="housing-comparison-status none">未登録</span>`
        )
      )
    );
  }

  getElement(
    "housingComparisonBody"
  ).innerHTML =
    rows.join("");
}

function renderHousingPlanPage() {
  appData.housingPlans =
    appData.housingPlans.map(
      normalizeHousingPlan
    );

  selectedHousingComparisonIds =
    selectedHousingComparisonIds
      .filter(
        id =>
          appData.housingPlans
            .some(
              plan =>
                plan.id === id
            )
      );

  renderHousingPlanList();
  renderHousingComparison();

  if (selectedHousingPlanId) {
    const selectedPlan =
      appData.housingPlans.find(
        item =>
          item.id ===
          selectedHousingPlanId
      );

    if (selectedPlan) {
      renderHousingSummary(
        selectedPlan,
        calculateHousingPlan(
          selectedPlan
        )
      );

      return;
    }
  }

  updateHousingCalculations();
}
