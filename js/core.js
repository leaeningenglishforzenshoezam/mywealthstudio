"use strict";

/* ------------------------------
   Storage keys
------------------------------ */

const STORAGE_KEY = "myWealthStudioV2";
const OLD_STORAGE_KEY = "mws-v01";

/* ------------------------------
   Default data
------------------------------ */

const DEFAULT_DATA = {
  version: 2,

  settings: {
    targetAsset: 100000000,
    minimumMonthlyExpense: 95000,
    emergencyFundMonths: 3,

    baseLivingExpense: 130000,
    currentRent: 75000,
    baseMonthlyInvestment: 112000,
    investmentAnnualReturn: 5,
    annualPropertyTax: 150000,
    annualHomeMaintenance: 120000,
    simulationEndAge: 65
  },

  monthlyData: {
    "2026-07": {
      income: {
        me: 280000,
        spouse: 180000,
        other: 0
      },

      assets: {
        cash: 300000,

        newNisa: {
          principal: 7000000,
          value: 8070000
        },

        oldNisa: {
          principal: 2000000,
          value: 2200000
        },

        ideco: {
          principal: 800000,
          value: 950000
        },

        taxable: {
          principal: 600000,
          value: 750000
        }
      },

      liabilities: {
        mortgageBalance: 0,
        otherDebt: 0
      },

      expenses: {
        eventExpense: 0
      },

      note: ""
    }
  },

  events: [],
  housingPlans: [],
  buckets: []
};

/* ------------------------------
   Page metadata
------------------------------ */

const PAGE_META = {
  home: {
    eyebrow: "OVERVIEW",
    title: "Home"
  },

  monthly: {
    eyebrow: "MONTHLY CHECK",
    title: "Monthly"
  },

  timeline: {
    eyebrow: "LIFE EVENTS",
    title: "Timeline"
  },

  plan: {
    eyebrow: "HOUSING PLAN",
    title: "Plan"
  },

  cashflow: {
    eyebrow: "FINANCIAL ENGINE",
    title: "Cash Flow"
  },

  simulation: {
    eyebrow: "FUTURE PLAN",
    title: "Simulation"
  },

  buckets: {
    eyebrow: "PURPOSE FUNDS",
    title: "Buckets"
  },

  settings: {
    eyebrow: "BASE ASSUMPTIONS",
    title: "Settings"
  }
};

/* ------------------------------
   Investment accounts
------------------------------ */

const INVESTMENT_ACCOUNTS = [
  {
    key: "newNisa",
    principalId: "newNisaPrincipal",
    valueId: "newNisaValue",
    profitId: "newNisaProfit"
  },

  {
    key: "oldNisa",
    principalId: "oldNisaPrincipal",
    valueId: "oldNisaValue",
    profitId: "oldNisaProfit"
  },

  {
    key: "ideco",
    principalId: "idecoPrincipal",
    valueId: "idecoValue",
    profitId: "idecoProfit"
  },

  {
    key: "taxable",
    principalId: "taxablePrincipal",
    valueId: "taxableValue",
    profitId: "taxableProfit"
  }
];

/* ------------------------------
   Event categories
------------------------------ */

const EVENT_CATEGORIES = {
  housing: {
    label: "住宅"
  },

  childcare: {
    label: "出産・育児"
  },

  education: {
    label: "教育"
  },

  car: {
    label: "車"
  },

  travel: {
    label: "旅行"
  },

  work: {
    label: "仕事・収入"
  },

  care: {
    label: "介護"
  },

  repair: {
    label: "住宅修繕"
  },

  furniture: {
    label: "家具・家電"
  },

  other: {
    label: "その他"
  }
};

/* ------------------------------
   Shared application state
------------------------------ */

let appData = null;

let currentMonthlySnapshot = "";
let isMonthlyDirty = false;

let selectedEventId = null;

let selectedHousingPlanId = null;
let selectedHousingComparisonIds = [];

let cashFlowRows = [];
let selectedCashFlowMonth = null;

/* ------------------------------
   Basic helpers
------------------------------ */

function getElement(id) {
  const element =
    document.getElementById(id);

  if (!element) {
    throw new Error(
      `Element not found: ${id}`
    );
  }

  return element;
}

function deepClone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function formatYen(value) {
  return new Intl.NumberFormat(
    "ja-JP",
    {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
}

function formatSignedYen(value) {
  const number =
    Number(value || 0);

  if (number > 0) {
    return `+${formatYen(number)}`;
  }

  return formatYen(number);
}

function formatMonthJapanese(month) {
  if (!month) {
    return "";
  }

  const [year, monthNumber] =
    month.split("-");

  return (
    `${Number(year)}年` +
    `${Number(monthNumber)}月`
  );
}

function getPreviousMonth(month) {
  const [year, monthNumber] =
    month.split("-").map(Number);

  const date =
    new Date(
      year,
      monthNumber - 2,
      1
    );

  return (
    `${date.getFullYear()}-` +
    `${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`
  );
}

function compareMonths(
  monthA,
  monthB
) {
  return String(monthA || "")
    .localeCompare(
      String(monthB || "")
    );
}

function isValidMonthRange(
  startMonth,
  endMonth
) {
  if (!startMonth || !endMonth) {
    return true;
  }

  return compareMonths(
    startMonth,
    endMonth
  ) <= 0;
}

function createEventId() {
  return (
    "event_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

function createHousingPlanId() {
  return (
    "housing_" +
    Date.now().toString(36) +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

function getMonthDifference(
  startMonth,
  endMonth
) {
  if (!startMonth || !endMonth) {
    return 0;
  }

  const [startYear, startNumber] =
    startMonth
      .split("-")
      .map(Number);

  const [endYear, endNumber] =
    endMonth
      .split("-")
      .map(Number);

  return (
    (endYear - startYear) * 12 +
    (endNumber - startNumber)
  );
}

function addYearsToMonth(
  birthMonth,
  years
) {
  if (!birthMonth) {
    return "";
  }

  const [year, month] =
    birthMonth
      .split("-")
      .map(Number);

  return (
    `${year + Number(years)}-` +
    `${String(month).padStart(2, "0")}`
  );
}

function addMonthsToMonth(
  month,
  numberOfMonths
) {
  if (!month) {
    return "";
  }

  const [year, monthNumber] =
    month
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      monthNumber - 1 +
        Number(numberOfMonths),
      1
    );

  return (
    `${date.getFullYear()}-` +
    `${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`
  );
}

function getYearFromMonth(month) {
  return Number(
    String(month).slice(0, 4)
  );
}

function isMonthInRange(
  month,
  startMonth,
  endMonth
) {
  if (!month || !startMonth) {
    return false;
  }

  if (
    compareMonths(
      month,
      startMonth
    ) < 0
  ) {
    return false;
  }

  if (
    endMonth &&
    compareMonths(
      month,
      endMonth
    ) > 0
  ) {
    return false;
  }

  return true;
}

function showToast(message) {
  const toast =
    getElement("toast");

  toast.textContent =
    message;

  toast.classList.add("show");

  window.setTimeout(
    () => {
      toast.classList.remove("show");
    },
    2200
  );
}
