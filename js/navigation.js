"use strict";

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

  if (pageName === "cashflow") {
    renderCashFlowPage();
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
