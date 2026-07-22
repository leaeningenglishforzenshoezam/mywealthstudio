"use strict";

const STORAGE_KEY = "myWealthStudioV2";
const OLD_STORAGE_KEY = "mws-v01";

const DEFAULT_DATA = {
  version: 2,

  settings: {
    targetAsset: 100000000,
    minimumMonthlyExpense: 95000,
    emergencyFundMonths: 3
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

let appData = loadData();
let currentMonthlySnapshot = "";
let isMonthlyDirty = false;
let selectedEventId = null;
let selectedHousingPlanId = null;

/* ------------------------------
   Basic helpers
------------------------------ */

function getElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Element not found: ${id}`);
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
  ).format(Number(value || 0));
}

function formatSignedYen(value) {
  const number = Number(value || 0);

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

  return `${Number(year)}年${Number(monthNumber)}月`;
}

function getPreviousMonth(month) {
  const [year, monthNumber] =
    month.split("-").map(Number);

  const date =
    new Date(year, monthNumber - 2, 1);

  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, "0")}`
  );
}

function compareMonths(monthA, monthB) {
  return String(monthA || "")
    .localeCompare(String(monthB || ""));
}

function isValidMonthRange(startMonth, endMonth) {
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
    startMonth.split("-").map(Number);

  const [endYear, endNumber] =
    endMonth.split("-").map(Number);

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
    birthMonth.split("-").map(Number);

  return (
    `${year + Number(years)}-` +
    `${String(month).padStart(2, "0")}`
  );
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
      localStorage.getItem(STORAGE_KEY);

    if (savedV2) {
      const parsed =
        JSON.parse(savedV2);

      return normalizeData(parsed);
    }

    const oldData =
      localStorage.getItem(OLD_STORAGE_KEY);

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

    migrated.settings.minimumMonthlyExpense =
      Number(
        oldData.settings.minimum ||
        oldData.settings.minimumMonthlyExpense ||
        95000
      );

    migrated.settings.emergencyFundMonths =
      Number(
        oldData.settings.emergency ||
        oldData.settings.emergencyFundMonths ||
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
            me: Number(value.incomeMe || 0),
            spouse: Number(value.incomeSpouse || 0),
            other: Number(value.incomeOther || 0)
          },

          assets: {
            cash: Number(value.cash || 0),

            newNisa: {
              principal: 0,
              value: Number(value.newNisa || 0)
            },

            oldNisa: {
              principal: 0,
              value: Number(value.oldNisa || 0)
            },

            ideco: {
              principal: 0,
              value: Number(value.ideco || 0)
            },

            taxable: {
              principal: 0,
              value: Number(value.taxable || 0)
            }
          },

          liabilities: {
            mortgageBalance: 0,
            otherDebt: 0
          },

          expenses: {
            eventExpense:
              Number(value.eventExpense || 0)
          },

          note: ""
        };
      }
    );

  return migrated;
}

/* ------------------------------
   Calculation
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
        Number(accountData.principal || 0);

      investmentValue +=
        Number(accountData.value || 0);
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

  const eventExpense =
    Number(
      safeRecord.expenses
        ?.eventExpense || 0
    );

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
    eventExpense
  };
}

/* ------------------------------
   Page navigation
------------------------------ */

function showPage(pageName) {
  if (
    isMonthlyDirty &&
    getElement("page-monthly")
      .classList.contains("active")
  ) {
    const leave =
      window.confirm(
        "Monthlyに保存していない変更があります。移動しますか？"
      );

    if (!leave) {
      return;
    }
  }

  document
    .querySelectorAll(".page")
    .forEach(
      page => {
        page.classList.remove("active");
      }
    );

  document
    .querySelectorAll(".nav-button")
    .forEach(
      button => {
        button.classList.remove("active");
      }
    );

  getElement(`page-${pageName}`)
    .classList.add("active");

  const activeButton =
    document.querySelector(
      `.nav-button[data-page="${pageName}"]`
    );

  if (activeButton) {
    activeButton.classList.add("active");
  }

  getElement("pageEyebrow")
    .textContent =
    PAGE_META[pageName].eyebrow;

  getElement("pageTitle")
    .textContent =
    PAGE_META[pageName].title;

  getElement("sidebar")
    .classList.remove("open");

  if (pageName === "home") {
    renderHome();
  }

  if (pageName === "monthly") {
    renderSavedMonthList();
  }
    if (pageName === "timeline") {
    renderTimeline();
  }
    if (pageName === "plan") {
    renderHousingPlanPage();
  }
}

/* ------------------------------
   Month selectors
------------------------------ */

function buildMonthOptions() {
  const globalMonth =
    getElement("globalMonth");

  globalMonth.innerHTML = "";

  const start =
    new Date(2026, 5, 1);

  const end =
    new Date(2065, 11, 1);

  const current =
    new Date(start);

  while (current <= end) {
    const value =
      `${current.getFullYear()}-` +
      `${String(
        current.getMonth() + 1
      ).padStart(2, "0")}`;

    const option =
      document.createElement("option");

    option.value = value;

    option.textContent =
      `${current.getFullYear()}年` +
      `${current.getMonth() + 1}月`;

    globalMonth.appendChild(option);

    current.setMonth(
      current.getMonth() + 1
    );
  }

  const savedMonths =
    Object.keys(appData.monthlyData)
      .sort();

  globalMonth.value =
    savedMonths.at(-1) || "2026-07";
}

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

  getElement("homeEventExpense")
    .textContent =
    formatYen(
      calculation.eventExpense
    );

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

/* ------------------------------
   Monthly form
------------------------------ */

function readMonthlyForm() {
  const record =
    createBlankMonthlyRecord();

  record.income.me =
    Number(
      getElement("incomeMe").value || 0
    );

  record.income.spouse =
    Number(
      getElement("incomeSpouse").value || 0
    );

  record.income.other =
    Number(
      getElement("incomeOther").value || 0
    );

  record.assets.cash =
    Number(
      getElement("cash").value || 0
    );

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      record.assets[account.key] = {
        principal:
          Number(
            getElement(
              account.principalId
            ).value || 0
          ),

        value:
          Number(
            getElement(
              account.valueId
            ).value || 0
          )
      };
    }
  );

  record.liabilities.mortgageBalance =
    Number(
      getElement(
        "mortgageBalance"
      ).value || 0
    );

  record.liabilities.otherDebt =
    Number(
      getElement(
        "otherDebt"
      ).value || 0
    );

  record.expenses.eventExpense =
    Number(
      getElement(
        "eventExpense"
      ).value || 0
    );

  record.note =
    getElement("monthlyNote").value.trim();

  return record;
}

function fillMonthlyForm(month) {
  const record =
    appData.monthlyData[month] ||
    createBlankMonthlyRecord();

  getElement("monthlyMonth").value =
    month;

  getElement("incomeMe").value =
    record.income?.me || "";

  getElement("incomeSpouse").value =
    record.income?.spouse || "";

  getElement("incomeOther").value =
    record.income?.other || "";

  getElement("cash").value =
    record.assets?.cash || "";

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      getElement(
        account.principalId
      ).value =
        record.assets
          ?.[account.key]
          ?.principal || "";

      getElement(
        account.valueId
      ).value =
        record.assets
          ?.[account.key]
          ?.value || "";
    }
  );

  getElement("mortgageBalance").value =
    record.liabilities
      ?.mortgageBalance || "";

  getElement("otherDebt").value =
    record.liabilities
      ?.otherDebt || "";

  getElement("eventExpense").value =
    record.expenses
      ?.eventExpense || "";

  getElement("monthlyNote").value =
    record.note || "";

  updateMonthlyCalculations();

  currentMonthlySnapshot =
    JSON.stringify(
      readMonthlyForm()
    );

  setMonthlyDirty(false);

  renderSavedMonthList();
}

function updateMonthlyCalculations() {
  const record =
    readMonthlyForm();

  const calculation =
    calculateMonthlyRecord(record);

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      const accountData =
        record.assets[account.key];

      const profit =
        accountData.value -
        accountData.principal;

      const profitElement =
        getElement(account.profitId);

      profitElement.textContent =
        formatSignedYen(profit);

      profitElement.style.color =
        profit > 0
          ? "var(--green)"
          : profit < 0
            ? "var(--red)"
            : "var(--muted)";
    }
  );

  getElement("formInvestmentPrincipal")
    .textContent =
    formatYen(
      calculation.investmentPrincipal
    );

  getElement("formInvestmentValue")
    .textContent =
    formatYen(
      calculation.investmentValue
    );

  getElement("formInvestmentProfit")
    .textContent =
    formatSignedYen(
      calculation.investmentProfit
    );

  getElement("formNetWorth")
    .textContent =
    formatYen(calculation.netWorth);

  validateMonthlyForm(false);
}

function setMonthlyDirty(dirty) {
  isMonthlyDirty = dirty;

  const status =
    getElement("monthlySaveStatus");

  status.classList.toggle(
    "unsaved",
    dirty
  );

  status.textContent =
    dirty
      ? "未保存の変更あり"
      : "保存済み";
}

function detectMonthlyChanges() {
  const current =
    JSON.stringify(
      readMonthlyForm()
    );

  setMonthlyDirty(
    current !== currentMonthlySnapshot
  );

  updateMonthlyCalculations();
}

function validateMonthlyForm(
  showMessage = true
) {
  const record =
    readMonthlyForm();

  const messages = [];

  const hasAnyAsset =
    record.assets.cash > 0 ||
    INVESTMENT_ACCOUNTS.some(
      account =>
        record.assets[account.key].value > 0
    );

  if (!hasAnyAsset) {
    messages.push(
      "・現金または投資評価額が入力されていません。"
    );
  }

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      const accountData =
        record.assets[account.key];

      if (
        accountData.value > 0 &&
        accountData.principal === 0
      ) {
        messages.push(
          `・評価額が入力されている口座に元本がありません。`
        );
      }
    }
  );

  const validationMessage =
    getElement("validationMessage");

  if (
    showMessage &&
    messages.length > 0
  ) {
    validationMessage.textContent =
      messages.join("\n");

    validationMessage.classList.remove(
      "hidden"
    );
  } else {
    validationMessage.classList.add(
      "hidden"
    );
  }

  return messages.length === 0;
}

function saveMonthlyForm(event) {
  event.preventDefault();

  const month =
    getElement("monthlyMonth").value;

  if (!month) {
    showToast(
      "対象月を選択してください。"
    );

    return;
  }

  validateMonthlyForm(true);

  const record =
    readMonthlyForm();

  appData.monthlyData[month] =
    record;

  saveData();

  getElement("globalMonth").value =
    month;

  currentMonthlySnapshot =
    JSON.stringify(record);

  setMonthlyDirty(false);

  renderSavedMonthList();
  renderHome();

  showToast(
    `${formatMonthJapanese(month)}を保存しました。`
  );
}

function copyPreviousMonth() {
  const month =
    getElement("monthlyMonth").value;

  const previousMonth =
    getPreviousMonth(month);

  const previousRecord =
    appData.monthlyData[previousMonth];

  if (!previousRecord) {
    showToast(
      `${formatMonthJapanese(
        previousMonth
      )}のデータがありません。`
    );

    return;
  }

  const copied =
    deepClone(previousRecord);

  copied.income = {
    ...copied.income
  };

  copied.expenses.eventExpense = 0;
  copied.note = "";

  fillMonthlyRecordWithoutSaving(
    month,
    copied
  );

  setMonthlyDirty(true);

  showToast(
    `${formatMonthJapanese(
      previousMonth
    )}からコピーしました。`
  );
}

function fillMonthlyRecordWithoutSaving(
  month,
  record
) {
  getElement("monthlyMonth").value =
    month;

  getElement("incomeMe").value =
    record.income.me || "";

  getElement("incomeSpouse").value =
    record.income.spouse || "";

  getElement("incomeOther").value =
    record.income.other || "";

  getElement("cash").value =
    record.assets.cash || "";

  INVESTMENT_ACCOUNTS.forEach(
    account => {
      getElement(
        account.principalId
      ).value =
        record.assets[account.key]
          .principal || "";

      getElement(
        account.valueId
      ).value =
        record.assets[account.key]
          .value || "";
    }
  );

  getElement("mortgageBalance").value =
    record.liabilities
      .mortgageBalance || "";

  getElement("otherDebt").value =
    record.liabilities
      .otherDebt || "";

  getElement("eventExpense").value =
    record.expenses
      .eventExpense || "";

  getElement("monthlyNote").value =
    record.note || "";

  updateMonthlyCalculations();
}

function deleteSelectedMonth() {
  const month =
    getElement("monthlyMonth").value;

  if (!appData.monthlyData[month]) {
    showToast(
      "この月には保存データがありません。"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `${formatMonthJapanese(
        month
      )}のデータを削除しますか？`
    );

  if (!confirmed) {
    return;
  }

  delete appData.monthlyData[month];

  saveData();

  fillMonthlyForm(month);
  renderSavedMonthList();
  renderHome();

  showToast(
    `${formatMonthJapanese(
      month
    )}を削除しました。`
  );
}

function restoreMonthlyForm() {
  const month =
    getElement("monthlyMonth").value;

  fillMonthlyForm(month);

  showToast(
    "保存済みの内容に戻しました。"
  );
}

function changeMonthlyMonth() {
  if (isMonthlyDirty) {
    const continueChange =
      window.confirm(
        "保存していない変更があります。月を切り替えますか？"
      );

    if (!continueChange) {
      getElement("monthlyMonth").value =
        getElement("globalMonth").value;

      return;
    }
  }

  const month =
    getElement("monthlyMonth").value;

  getElement("globalMonth").value =
    month;

  fillMonthlyForm(month);
  renderHome();
}

function renderSavedMonthList() {
  const list =
    getElement("savedMonthList");

  const count =
    getElement("savedMonthCount");

  const months =
    Object.keys(appData.monthlyData)
      .sort()
      .reverse();

  count.textContent =
    `${months.length}件`;

  list.innerHTML = "";

  if (months.length === 0) {
    const empty =
      document.createElement("p");

    empty.className =
      "saved-month-empty";

    empty.textContent =
      "保存済みデータはありません。";

    list.appendChild(empty);

    return;
  }

  const selectedMonth =
    getElement("monthlyMonth").value;

  months.forEach(
    month => {
      const record =
        appData.monthlyData[month];

      const calculation =
        calculateMonthlyRecord(record);

      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "saved-month-button";

      if (month === selectedMonth) {
        button.classList.add("active");
      }

      const title =
        document.createElement("strong");

      title.textContent =
        formatMonthJapanese(month);

      const value =
        document.createElement("span");

      value.textContent =
        `純資産 ${formatYen(
          calculation.netWorth
        )}`;

      button.appendChild(title);
      button.appendChild(value);

      button.addEventListener(
        "click",
        () => {
          if (isMonthlyDirty) {
            const move =
              window.confirm(
                "保存していない変更があります。別の月を開きますか？"
              );

            if (!move) {
              return;
            }
          }

          getElement(
            "monthlyMonth"
          ).value = month;

          getElement(
            "globalMonth"
          ).value = month;

          fillMonthlyForm(month);
          renderHome();
        }
      );

      list.appendChild(button);
    }
  );
}

/* ------------------------------
   Timeline events
------------------------------ */

function createBlankEvent() {
  return {
    id: "",
    title: "",
    category: "other",

    startMonth:
      getElement("globalMonth").value ||
      "2026-07",

    endMonth: "",

    oneTimeIncome: 0,
    oneTimeExpense: 0,

    monthlyIncomeChange: 0,
    monthlyExpenseChange: 0,
    monthlyInvestmentChange: 0,

    includeInSimulation: true,
    enabled: true,

    note: "",

    createdAt: "",
    updatedAt: ""
  };
}

function normalizeEvent(event) {
  const blank =
    createBlankEvent();

  return {
    ...blank,
    ...event,

    id:
  event?.id === ""
    ? ""
    : String(
        event?.id || createEventId()
      ),

    title:
      String(event?.title || ""),

    category:
      EVENT_CATEGORIES[event?.category]
        ? event.category
        : "other",

    startMonth:
      String(
        event?.startMonth ||
        blank.startMonth
      ),

    endMonth:
      String(event?.endMonth || ""),

    oneTimeIncome:
      Number(
        event?.oneTimeIncome || 0
      ),

    oneTimeExpense:
      Number(
        event?.oneTimeExpense || 0
      ),

    monthlyIncomeChange:
      Number(
        event?.monthlyIncomeChange || 0
      ),

    monthlyExpenseChange:
      Number(
        event?.monthlyExpenseChange || 0
      ),

    monthlyInvestmentChange:
      Number(
        event?.monthlyInvestmentChange || 0
      ),

    includeInSimulation:
      event?.includeInSimulation !== false,

    enabled:
      event?.enabled !== false,

    note:
      String(event?.note || ""),

    createdAt:
      String(event?.createdAt || ""),

    updatedAt:
      String(event?.updatedAt || "")
  };
}

function readEventForm() {
  return {
    id:
      getElement("eventId").value.trim(),

    title:
      getElement("eventTitle").value.trim(),

    category:
      getElement("eventCategory").value,

    startMonth:
      getElement("eventStartMonth").value,

    endMonth:
      getElement("eventEndMonth").value,

    oneTimeIncome:
      Number(
        getElement(
          "eventOneTimeIncome"
        ).value || 0
      ),

    oneTimeExpense:
      Number(
        getElement(
          "eventOneTimeExpense"
        ).value || 0
      ),

    monthlyIncomeChange:
      Number(
        getElement(
          "eventMonthlyIncomeChange"
        ).value || 0
      ),

    monthlyExpenseChange:
      Number(
        getElement(
          "eventMonthlyExpenseChange"
        ).value || 0
      ),

    monthlyInvestmentChange:
      Number(
        getElement(
          "eventMonthlyInvestmentChange"
        ).value || 0
      ),

    enabled:
      getElement(
        "eventEnabled"
      ).checked,

    includeInSimulation:
      getElement(
        "eventIncludeInSimulation"
      ).checked,

    note:
      getElement("eventNote").value.trim()
  };
}

function fillEventForm(event) {
  const normalized =
    normalizeEvent(event);

  selectedEventId =
    normalized.id || null;

  getElement("eventId").value =
    normalized.id;

  getElement("eventTitle").value =
    normalized.title;

  getElement("eventCategory").value =
    normalized.category;

  getElement("eventStartMonth").value =
    normalized.startMonth;

  getElement("eventEndMonth").value =
    normalized.endMonth;

  getElement(
    "eventOneTimeIncome"
  ).value =
    normalized.oneTimeIncome || "";

  getElement(
    "eventOneTimeExpense"
  ).value =
    normalized.oneTimeExpense || "";

  getElement(
    "eventMonthlyIncomeChange"
  ).value =
    normalized.monthlyIncomeChange || "";

  getElement(
    "eventMonthlyExpenseChange"
  ).value =
    normalized.monthlyExpenseChange || "";

  getElement(
    "eventMonthlyInvestmentChange"
  ).value =
    normalized.monthlyInvestmentChange || "";

  getElement("eventEnabled").checked =
    normalized.enabled;

  getElement(
    "eventIncludeInSimulation"
  ).checked =
    normalized.includeInSimulation;

  getElement("eventNote").value =
    normalized.note;

  const isEditing =
    Boolean(normalized.id);

  getElement("eventFormHeading")
    .textContent =
    isEditing
      ? "イベントを編集"
      : "新しいイベント";

  getElement("deleteEventButton")
    .classList.toggle(
      "hidden",
      !isEditing
    );

  getElement("duplicateEventButton")
    .classList.toggle(
      "hidden",
      !isEditing
    );

  getElement(
    "eventValidationMessage"
  ).classList.add("hidden");

  renderEventList();
}

function clearEventForm() {
  selectedEventId = null;

  fillEventForm(
    createBlankEvent()
  );
}

function validateEventForm(event) {
  const messages = [];

  if (!event.title) {
    messages.push(
      "・イベント名を入力してください。"
    );
  }

  if (!event.startMonth) {
    messages.push(
      "・開始年月を選択してください。"
    );
  }

  if (
    !isValidMonthRange(
      event.startMonth,
      event.endMonth
    )
  ) {
    messages.push(
      "・終了年月は開始年月以降にしてください。"
    );
  }

  const numericFields = [
    event.oneTimeIncome,
    event.oneTimeExpense,
    event.monthlyIncomeChange,
    event.monthlyExpenseChange,
    event.monthlyInvestmentChange
  ];

  if (
    numericFields.some(
      value =>
        !Number.isFinite(value)
    )
  ) {
    messages.push(
      "・金額欄には数値を入力してください。"
    );
  }

  if (
    event.oneTimeIncome < 0 ||
    event.oneTimeExpense < 0
  ) {
    messages.push(
      "・一時収入と一時支出は0円以上で入力してください。"
    );
  }

  const messageElement =
    getElement(
      "eventValidationMessage"
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

function saveEventForm(eventObject) {
  eventObject.preventDefault();

  const formEvent =
    readEventForm();

  if (!validateEventForm(formEvent)) {
    return;
  }

  const now =
    new Date().toISOString();

  const existingIndex =
    appData.events.findIndex(
      event =>
        event.id === formEvent.id
    );

  if (existingIndex >= 0) {
    const existing =
      appData.events[existingIndex];

    appData.events[existingIndex] =
      normalizeEvent({
        ...existing,
        ...formEvent,
        updatedAt: now
      });

    selectedEventId =
      formEvent.id;

    showToast(
      "イベントを更新しました。"
    );

  } else {
    const newEvent =
      normalizeEvent({
        ...formEvent,
        id: createEventId(),
        createdAt: now,
        updatedAt: now
      });

    appData.events.push(newEvent);

    selectedEventId =
      newEvent.id;

    showToast(
      "イベントを追加しました。"
    );
  }

  saveData();
  renderTimeline();

  const savedEvent =
    appData.events.find(
      event =>
        event.id === selectedEventId
    );

  if (savedEvent) {
    fillEventForm(savedEvent);
  }
}

function deleteSelectedEvent() {
  if (!selectedEventId) {
    return;
  }

  const event =
    appData.events.find(
      item =>
        item.id === selectedEventId
    );

  if (!event) {
    return;
  }

  const confirmed =
    window.confirm(
      `「${event.title}」を削除しますか？`
    );

  if (!confirmed) {
    return;
  }

  appData.events =
    appData.events.filter(
      item =>
        item.id !== selectedEventId
    );

  saveData();
  clearEventForm();
  renderTimeline();

  showToast(
    "イベントを削除しました。"
  );
}

function duplicateSelectedEvent() {
  if (!selectedEventId) {
    return;
  }

  const source =
    appData.events.find(
      event =>
        event.id === selectedEventId
    );

  if (!source) {
    return;
  }

  const now =
    new Date().toISOString();

  const duplicated =
    normalizeEvent({
      ...deepClone(source),

      id: createEventId(),

      title:
        `${source.title}（コピー）`,

      createdAt: now,
      updatedAt: now
    });

  appData.events.push(duplicated);

  selectedEventId =
    duplicated.id;

  saveData();
  renderTimeline();
  fillEventForm(duplicated);

  showToast(
    "イベントを複製しました。"
  );
}

function toggleEventEnabled(eventId) {
  const event =
    appData.events.find(
      item =>
        item.id === eventId
    );

  if (!event) {
    return;
  }

  event.enabled =
    !event.enabled;

  event.updatedAt =
    new Date().toISOString();

  saveData();
  renderTimeline();

  if (
    selectedEventId === eventId
  ) {
    fillEventForm(event);
  }

  showToast(
    event.enabled
      ? "イベントを有効にしました。"
      : "イベントを無効にしました。"
  );
}

function getFilteredEvents() {
  const searchText =
    getElement(
      "eventSearchInput"
    )
      .value
      .trim()
      .toLowerCase();

  const category =
    getElement(
      "eventCategoryFilter"
    ).value;

  const status =
    getElement(
      "eventStatusFilter"
    ).value;

  return appData.events
    .map(normalizeEvent)
    .filter(
      event => {
        const searchableText =
          `${event.title} ${event.note}`
            .toLowerCase();

        const matchesSearch =
          !searchText ||
          searchableText.includes(
            searchText
          );

        const matchesCategory =
          category === "all" ||
          event.category === category;

        let matchesStatus = true;

        if (status === "enabled") {
          matchesStatus =
            event.enabled;
        }

        if (status === "disabled") {
          matchesStatus =
            !event.enabled;
        }

        if (status === "simulation") {
          matchesStatus =
            event.enabled &&
            event.includeInSimulation;
        }

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus
        );
      }
    )
    .sort(
      (eventA, eventB) => {
        const monthComparison =
          compareMonths(
            eventA.startMonth,
            eventB.startMonth
          );

        if (monthComparison !== 0) {
          return monthComparison;
        }

        return eventA.title
          .localeCompare(
            eventB.title,
            "ja"
          );
      }
    );
}

function renderEventSummary() {
  const events =
    appData.events.map(
      normalizeEvent
    );

  const simulationEvents =
    events.filter(
      event =>
        event.enabled &&
        event.includeInSimulation
    );

  const expenseTotal =
    simulationEvents.reduce(
      (total, event) =>
        total +
        event.oneTimeExpense,
      0
    );

  const incomeTotal =
    simulationEvents.reduce(
      (total, event) =>
        total +
        event.oneTimeIncome,
      0
    );

  getElement("eventTotalCount")
    .textContent =
    `${events.length}件`;

  getElement(
    "eventSimulationCount"
  ).textContent =
    `${simulationEvents.length}件`;

  getElement(
    "eventExpenseTotal"
  ).textContent =
    formatYen(expenseTotal);

  getElement(
    "eventIncomeTotal"
  ).textContent =
    formatYen(incomeTotal);
}

function getEventMonthLabel(event) {
  const start =
    formatMonthJapanese(
      event.startMonth
    );

  if (
    !event.endMonth ||
    event.endMonth === event.startMonth
  ) {
    return start;
  }

  return (
    `${start} ～ ` +
    `${formatMonthJapanese(
      event.endMonth
    )}`
  );
}

function createEventMoneyRow(
  label,
  value
) {
  const row =
    document.createElement("div");

  row.className =
    "event-item-money-row";

  const labelElement =
    document.createElement("span");

  labelElement.textContent =
    label;

  const valueElement =
    document.createElement("strong");

  valueElement.textContent =
    formatSignedYen(value);

  row.appendChild(
    labelElement
  );

  row.appendChild(
    valueElement
  );

  return row;
}

function renderEventList() {
  const list =
    getElement("eventList");

  const events =
    getFilteredEvents();

  getElement(
    "filteredEventCount"
  ).textContent =
    `${events.length}件`;

  list.innerHTML = "";

  if (events.length === 0) {
    const empty =
      document.createElement("div");

    empty.className =
      "event-empty";

    empty.textContent =
      appData.events.length === 0
        ? "イベントはまだ登録されていません。"
        : "条件に合うイベントがありません。";

    list.appendChild(empty);

    return;
  }

  events.forEach(
    event => {
      const item =
        document.createElement(
          "article"
        );

      item.className =
        "event-item";

      if (
        event.id === selectedEventId
      ) {
        item.classList.add("active");
      }

      if (!event.enabled) {
        item.classList.add(
          "disabled"
        );
      }

      const heading =
        document.createElement("div");

      heading.className =
        "event-item-heading";

      const title =
        document.createElement("h4");

      title.textContent =
        event.title;

      const month =
        document.createElement("span");

      month.className =
        "event-item-month";

      month.textContent =
        getEventMonthLabel(event);

      heading.appendChild(title);
      heading.appendChild(month);

      const meta =
        document.createElement("div");

      meta.className =
        "event-item-meta";

      const category =
        document.createElement("span");

      category.className =
        "event-category-badge";

      category.textContent =
        EVENT_CATEGORIES[
          event.category
        ].label;

      meta.appendChild(category);

      const statusBadge =
        document.createElement("button");

      statusBadge.type = "button";

      statusBadge.className =
        "event-status-badge";

      if (!event.enabled) {
        statusBadge.classList.add(
          "disabled"
        );
      }

      statusBadge.textContent =
        event.enabled
          ? "有効"
          : "無効";

      statusBadge.addEventListener(
        "click",
        clickEvent => {
          clickEvent.stopPropagation();

          toggleEventEnabled(
            event.id
          );
        }
      );

      meta.appendChild(
        statusBadge
      );

      if (
        event.includeInSimulation
      ) {
        const simulationBadge =
          document.createElement(
            "span"
          );

        simulationBadge.className =
          "event-simulation-badge";

        simulationBadge.textContent =
          "計算対象";

        meta.appendChild(
          simulationBadge
        );
      }

      const money =
        document.createElement("div");

      money.className =
        "event-item-money";

      if (
        event.oneTimeIncome !== 0
      ) {
        money.appendChild(
          createEventMoneyRow(
            "一時収入",
            event.oneTimeIncome
          )
        );
      }

      if (
        event.oneTimeExpense !== 0
      ) {
        money.appendChild(
          createEventMoneyRow(
            "一時支出",
            -event.oneTimeExpense
          )
        );
      }

      if (
        event.monthlyIncomeChange !== 0
      ) {
        money.appendChild(
          createEventMoneyRow(
            "月々の収入",
            event.monthlyIncomeChange
          )
        );
      }

      if (
        event.monthlyExpenseChange !== 0
      ) {
        money.appendChild(
          createEventMoneyRow(
            "月々の支出",
            -event.monthlyExpenseChange
          )
        );
      }

      if (
        event.monthlyInvestmentChange !== 0
      ) {
        money.appendChild(
          createEventMoneyRow(
            "月々の投資",
            event.monthlyInvestmentChange
          )
        );
      }

      if (
        money.children.length === 0
      ) {
        money.appendChild(
          createEventMoneyRow(
            "金額への影響",
            0
          )
        );
      }

      item.appendChild(heading);
      item.appendChild(meta);
      item.appendChild(money);

      item.addEventListener(
        "click",
        () => {
          selectedEventId =
            event.id;

          fillEventForm(event);

          getElement(
            "eventEditorCard"
          ).scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      );

      list.appendChild(item);
    }
  );
}

function renderTimeline() {
  appData.events =
    appData.events.map(
      normalizeEvent
    );

  renderEventSummary();
  renderEventList();
}
/* ------------------------------
   Housing plan
------------------------------ */

function createBlankHousingPlan() {
  return {
    id: "",
    name: "",

    purchaseMonth:
      getElement("globalMonth").value ||
      "2028-04",

    borrowerBirthMonth: "1998-07",
    balanceCheckAge: 65,

    costs: {
      land: 0,
      building: 0,
      exterior: 0,
      closing: 0,
      furniture: 0,
      equipment: 0,
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

    note: "",
    createdAt: "",
    updatedAt: ""
  };
}

function normalizeHousingPlan(plan) {
  const blank =
    createBlankHousingPlan();

  return {
    ...blank,
    ...plan,

    id:
      plan?.id === ""
        ? ""
        : String(
            plan?.id ||
            createHousingPlanId()
          ),

    name:
      String(plan?.name || ""),

    purchaseMonth:
      String(
        plan?.purchaseMonth ||
        blank.purchaseMonth
      ),

    borrowerBirthMonth:
      String(
        plan?.borrowerBirthMonth ||
        blank.borrowerBirthMonth
      ),

    balanceCheckAge:
      Number(
        plan?.balanceCheckAge || 65
      ),

    costs: {
      ...blank.costs,
      ...(plan?.costs || {})
    },

    funding: {
      ...blank.funding,
      ...(plan?.funding || {})
    },

    loan: {
      ...blank.loan,
      ...(plan?.loan || {})
    },

    note:
      String(plan?.note || ""),

    createdAt:
      String(plan?.createdAt || ""),

    updatedAt:
      String(plan?.updatedAt || "")
  };
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

    costs: {
      land:
        Number(
          getElement(
            "housingLandCost"
          ).value || 0
        ),

      building:
        Number(
          getElement(
            "housingBuildingCost"
          ).value || 0
        ),

      exterior:
        Number(
          getElement(
            "housingExteriorCost"
          ).value || 0
        ),

      closing:
        Number(
          getElement(
            "housingClosingCost"
          ).value || 0
        ),

      furniture:
        Number(
          getElement(
            "housingFurnitureCost"
          ).value || 0
        ),

      equipment:
        Number(
          getElement(
            "housingEquipmentCost"
          ).value || 0
        ),

      other:
        Number(
          getElement(
            "housingOtherCost"
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

  const totalCost =
    Object.values(
      normalized.costs
    ).reduce(
      (total, value) =>
        total + Number(value || 0),
      0
    );

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

  const automaticLoanAmount =
    Math.max(
      totalCost - ownFunds,
      0
    );

  const loanAmount =
    normalized.loan.autoAmount
      ? automaticLoanAmount
      : Math.max(
          Number(
            normalized.loan.amount || 0
          ),
          0
        );

  const termMonths =
    Math.max(
      Number(
        normalized.loan.termYears || 0
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
      totalPayment - loanAmount,
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

  const cashUsed =
    Number(
      normalized.funding
        .downPayment || 0
    ) +
    Number(
      normalized.funding
        .otherOwnFunds || 0
    );

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

  return {
    totalCost,
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
    cashDifference
  };
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

  getElement(
    "housingLandCost"
  ).value =
    normalized.costs.land || "";

  getElement(
    "housingBuildingCost"
  ).value =
    normalized.costs.building || "";

  getElement(
    "housingExteriorCost"
  ).value =
    normalized.costs.exterior || "";

  getElement(
    "housingClosingCost"
  ).value =
    normalized.costs.closing || "";

  getElement(
    "housingFurnitureCost"
  ).value =
    normalized.costs.furniture || "";

  getElement(
    "housingEquipmentCost"
  ).value =
    normalized.costs.equipment || "";

  getElement(
    "housingOtherCost"
  ).value =
    normalized.costs.other || "";

  getElement(
    "housingDownPayment"
  ).value =
    normalized.funding
      .downPayment || "";

  getElement(
    "housingFamilySupport"
  ).value =
    normalized.funding
      .familySupport || "";

  getElement(
    "housingSubsidy"
  ).value =
    normalized.funding
      .subsidy || "";

  getElement(
    "housingOtherOwnFunds"
  ).value =
    normalized.funding
      .otherOwnFunds || "";

  getElement(
    "housingCashBeforePurchase"
  ).value =
    normalized.funding
      .cashBeforePurchase || "";

  getElement(
    "housingMinimumCashReserve"
  ).value =
    normalized.funding
      .minimumCashReserve || "";

  getElement(
    "housingAutoLoanAmount"
  ).checked =
    normalized.loan.autoAmount;

  getElement(
    "housingLoanAmount"
  ).value =
    normalized.loan.amount || "";

  getElement(
    "housingInterestRate"
  ).value =
    normalized.loan.interestRate;

  getElement(
    "housingLoanTermYears"
  ).value =
    normalized.loan.termYears;

  getElement(
    "housingBonusPayment"
  ).value =
    normalized.loan.bonusPayment || "";

  getElement(
    "housingStressInterestRate"
  ).value =
    normalized.loan
      .stressInterestRate;

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

  if (plan.loan.autoAmount) {
    getElement(
      "housingLoanAmount"
    ).value =
      Math.round(
        result.automaticLoanAmount
      );

    getElement(
      "housingLoanAmount"
    ).disabled = true;
  } else {
    getElement(
      "housingLoanAmount"
    ).disabled = false;
  }

  getElement(
    "housingResultTotalCost"
  ).textContent =
    formatYen(result.totalCost);

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
    plan.funding.cashBeforePurchase === 0 &&
    plan.funding.minimumCashReserve === 0
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
      safeResult.totalCost
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

  const result =
    calculateHousingPlan(plan);

  if (result.totalCost <= 0) {
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

  const duplicated =
    normalizeHousingPlan({
      ...deepClone(source),

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
      document.createElement("p");

    empty.className =
      "housing-plan-empty";

    empty.textContent =
      "保存済みの住宅プランはありません。";

    list.appendChild(empty);

    return;
  }

  plans.forEach(
    plan => {
      const result =
        calculateHousingPlan(plan);

      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        "housing-plan-item";

      if (
        plan.id ===
        selectedHousingPlanId
      ) {
        button.classList.add(
          "active"
        );
      }

      const name =
        document.createElement(
          "strong"
        );

      name.textContent =
        plan.name;

      const amount =
        document.createElement(
          "span"
        );

      amount.textContent =
        `総額 ${formatYen(
          result.totalCost
        )}`;

      const payment =
        document.createElement(
          "small"
        );

      payment.textContent =
        `月々 ${formatYen(
          Math.round(
            result.monthlyPayment
          )
        )}・${formatMonthJapanese(
          plan.purchaseMonth
        )}`;

      button.appendChild(name);
      button.appendChild(amount);
      button.appendChild(payment);

      button.addEventListener(
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

      list.appendChild(button);
    }
  );
}

function renderHousingPlanPage() {
  appData.housingPlans =
    appData.housingPlans.map(
      normalizeHousingPlan
    );

  renderHousingPlanList();

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
      )
  };

  saveData();
  renderHome();

  showToast(
    "基本設定を保存しました。"
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
    getElement(
    "newHousingPlanButton"
  ).addEventListener(
    "click",
    () => {
      clearHousingPlanForm();

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
    clearHousingPlanForm
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
      "input, textarea"
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

   fillMonthlyForm(selectedMonth);
  renderHome();
  renderSavedMonthList();

    clearEventForm();
  renderTimeline();

  clearHousingPlanForm();
  renderHousingPlanPage();
}

initializeApp();
