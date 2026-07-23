"use strict";

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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
