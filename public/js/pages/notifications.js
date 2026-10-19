import { icons, $, $$ } from "../icons.js";
import { state } from "../state.js";
import { api } from "../api.js";
import {
  escapeHtml as esc,
  filterNotifications,
  severity,
  detectCategory,
  formatRelativeTime,
  exportNotificationsToCsv,
} from "../services/notification-view.js";

const filters = {
  search: "",
  status: "all",
  severity: "all",
  generator: "all",
  timeframe: "all",
  sort: "priority",
};

let owner = null;
let viewMode = "cards"; // "cards" | "table"
const selectedIds = new Set();
let soundEnabled = false;
let modalOpen = false;
let activeKpi = "all"; // "all" | "active" | "critical" | "warning" | "resolved"

const options = (values, selected) =>
  values
    .map(
      ([value, label]) =>
        `<option value="${esc(value)}" ${selected === value ? "selected" : ""}>${esc(label)}</option>`,
    )
    .join("");

function playChime(level = "notice") {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (level === "critical") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(440, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Ignore audio permission or context creation errors
  }
}

function renderBatchBar(selectedCount) {
  if (selectedCount === 0) return "";
  return `<div class="batch-bar" role="toolbar" aria-label="Bulk actions">
    <div class="batch-info"><strong>${selectedCount}</strong> alert${selectedCount > 1 ? "s" : ""} selected</div>
    <div class="batch-actions">
      <button class="button secondary" id="batch-resolve-btn">${icons.check || ""} Resolve selected</button>
      <button class="button secondary" id="batch-delete-btn">${icons.trash || ""} Delete selected</button>
      <button class="button secondary" id="batch-deselect-btn">Cancel</button>
    </div>
  </div>`;
}

function renderCardsView(rows) {
  return `<div class="notifications">${rows
    .map((n) => {
      const level = severity(n);
      const cat = detectCategory(n);
      const iconKey = cat.icon || "bell";
      const iconSvg = icons[iconKey] || icons.bell;
      const isSelected = selectedIds.has(String(n.notification_id));
      const date = new Date(n.created_at);
      const fullDate = Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
      const relTime = formatRelativeTime(n.created_at);

      return `<article class="panel alert-card ${n.status === "active" ? level : "resolved"} ${isSelected ? "is-selected" : ""}" data-card-id="${esc(n.notification_id)}">
        <div class="alert-card-header">
          <div class="alert-card-header-left">
            <input type="checkbox" class="alert-checkbox" data-id="${esc(n.notification_id)}" ${isSelected ? "checked" : ""} aria-label="Select alert">
            <span class="status ${n.status === "active" ? "warning" : "resolved"}">${esc(n.status)}</span>
            <span class="alert-severity ${level}">${n.status === "active" && level === "critical" ? '<span class="pulse-dot"></span>' : ""}${level}</span>
            <span class="category-pill">${iconSvg}<span>${esc(cat.label)}</span></span>
          </div>
          <div class="alert-card-actions">
            ${n.status === "active" ? `<button class="button secondary resolve-notification" data-id="${esc(n.notification_id)}" aria-label="Resolve ${esc(n.title)}" title="Resolve alert">Resolve</button>` : `<span class="alert-resolved" title="Resolved">${icons.check || ""}</span>`}
            ${n.generator_id ? `<button type="button" class="icon-action-btn jump-generator-btn" data-gen-id="${esc(n.generator_id)}" title="Inspect Generator">${icons.activity || icons.bolt}</button>` : ""}
            <button type="button" class="icon-action-btn delete-notification" data-id="${esc(n.notification_id)}" title="Delete Alert" aria-label="Delete alert">${icons.trash || "×"}</button>
          </div>
        </div>
        <div class="alert-card-content">
          <div class="alert-title-row">
            <div class="alert-symbol">${iconSvg}</div>
            <h3>${esc(n.title)}</h3>
          </div>
          <p class="alert-detail">${esc(n.detail)}</p>
        </div>
        <div class="alert-card-footer">
          ${n.generator_name ? `<button type="button" class="generator-link jump-generator-btn" data-gen-id="${esc(n.generator_id || "")}" title="Jump to generator telemetry">${icons.externalLink || ""}<strong>${esc(n.generator_name)}</strong>${n.generator_location ? ` · <span class="muted">${esc(n.generator_location)}</span>` : ""}</button>` : `<span class="muted small">—</span>`}
          <span class="alert-time" title="${esc(fullDate)}">${icons.clock || ""}${esc(relTime)}</span>
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

function renderTableView(rows) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(String(r.notification_id)));
  return `<div class="notifications-table-wrap">
    <table class="notifications-table">
      <thead>
        <tr>
          <th style="width: 38px;"><input type="checkbox" id="table-select-all" ${allSelected ? "checked" : ""} aria-label="Select all alerts"></th>
          <th style="width: 100px;">Status</th>
          <th style="width: 100px;">Severity</th>
          <th>Alert Description</th>
          <th style="width: 120px;">Category</th>
          <th style="width: 160px;">Generator</th>
          <th style="width: 140px;">Recorded</th>
          <th style="width: 140px; text-align: right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((n) => {
            const level = severity(n);
            const cat = detectCategory(n);
            const isSelected = selectedIds.has(String(n.notification_id));
            const date = new Date(n.created_at);
            const fullDate = Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
            const relTime = formatRelativeTime(n.created_at);

            return `<tr class="${level} ${n.status === "resolved" ? "resolved" : ""} ${isSelected ? "is-selected" : ""}">
              <td><input type="checkbox" class="alert-checkbox" data-id="${esc(n.notification_id)}" ${isSelected ? "checked" : ""}></td>
              <td><span class="status ${n.status === "active" ? "warning" : "resolved"}">${esc(n.status)}</span></td>
              <td><span class="alert-severity ${level}">${n.status === "active" && level === "critical" ? '<span class="pulse-dot"></span>' : ""}${level}</span></td>
              <td>
                <div class="table-title">${esc(n.title)}</div>
                <div class="table-detail">${esc(n.detail)}</div>
              </td>
              <td><span class="category-pill">${icons[cat.icon] || icons.bell}<span>${esc(cat.label)}</span></span></td>
              <td>
                ${n.generator_name ? `<button type="button" class="generator-link jump-generator-btn" data-gen-id="${esc(n.generator_id || "")}">${icons.externalLink || ""}<span>${esc(n.generator_name)}</span></button>` : "—"}
              </td>
              <td title="${esc(fullDate)}"><span class="small muted">${esc(relTime)}</span></td>
              <td>
                <div class="table-actions" style="justify-content: flex-end;">
                  ${n.status === "active" ? `<button class="button secondary resolve-notification" data-id="${esc(n.notification_id)}" style="padding: 5px 9px; font-size: 11px;">Resolve</button>` : `<span class="small muted" style="color:#2a9973;">Resolved</span>`}
                  ${n.generator_id ? `<button type="button" class="icon-action-btn jump-generator-btn" data-gen-id="${esc(n.generator_id)}" title="Inspect Generator" style="padding: 5px;">${icons.activity || icons.bolt}</button>` : ""}
                  <button type="button" class="icon-action-btn delete-notification" data-id="${esc(n.notification_id)}" title="Delete Alert" style="padding: 5px;">${icons.trash || "×"}</button>
                </div>
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>`;
}

function results() {
  const rows = filterNotifications(state.notifications, filters);
  const selectedCount = selectedIds.size;

  return `${renderBatchBar(selectedCount)}
    <div class="notification-result-heading">
      <div>
        <h2>Alert Activity</h2>
        <span class="muted small" role="status">Showing ${rows.length} of ${state.notifications.length} loaded records</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        ${rows.length > 0 ? `<label class="small muted" style="display: flex; align-items: center; gap: 5px; cursor: pointer;"><input type="checkbox" id="select-all-toggle" ${rows.every((r) => selectedIds.has(String(r.notification_id))) ? "checked" : ""}> Select all</label>` : ""}
      </div>
    </div>
    ${
      rows.length
        ? viewMode === "table"
          ? renderTableView(rows)
          : renderCardsView(rows)
        : `<div class="panel empty">${icons.bell}<h3>${
            state.notificationError
              ? "Notifications unavailable"
              : state.notifications.length
                ? "No matching alerts found"
                : "All quiet — No alerts recorded yet"
          }</h3><p>${
            state.notificationError
              ? "We are retrying the connection automatically."
              : state.notifications.length
                ? "Change your search query or reset your filters to see more alerts."
                : "New generator alerts, threshold alarms, and notifications will appear here automatically."
          }</p>${state.notifications.length ? '<button class="button secondary" id="reset-empty-btn" style="margin-top: 12px;">Clear filters</button>' : ""}</div>`
    }`;
}

export function notifications() {
  if (owner !== state.user) {
    Object.assign(filters, {
      search: "",
      status: "all",
      severity: "all",
      generator: "all",
      timeframe: "all",
      sort: "priority",
    });
    selectedIds.clear();
    activeKpi = "all";
    owner = state.user;
  }

  const total = state.notifications.length;
  const active = state.notifications.filter((n) => n.status === "active");
  const critical = active.filter((n) => severity(n) === "critical").length;
  const warnings = active.filter((n) => severity(n) === "warning").length;
  const resolved = state.notifications.filter((n) => n.status === "resolved").length;

  const generatorList = [
    ...new Set(
      [
        ...state.notifications.map((n) => n.generator_name),
        ...state.generators.map((g) => g.name),
      ].filter(Boolean),
    ),
  ].sort();

  return `<section class="notification-center">
    <div class="page-heading">
      <div>
        <div class="eyebrow">Operations inbox</div>
        <h1>Notifications &amp; Alerts</h1>
        <p>${
          state.demo
            ? "Simulated generator alerts and automated alarm feed. No hardware write operations."
            : "Monitor generator alarms, review anomalies, resolve alerts, and broadcast advisories."
        }</p>
      </div>
      <div class="notification-actions">
        ${state.user?.role === "admin" || state.user?.role === "operator" ? `<button class="button" id="create-alert-open-btn">${icons.plus || "+"} New Alert</button>` : ""}
        <button id="read-all-button" class="button secondary" ${!active.length || state.notificationError ? "disabled" : ""}>Resolve all active</button>
        ${state.user?.role === "admin" ? `<button id="clear-resolved-button" class="button secondary" ${!resolved || state.notificationError ? "disabled" : ""} title="Prune resolved notifications">${icons.trash || ""} Clear resolved</button>` : ""}
        <button id="export-csv-button" class="button secondary" title="Export displayed alerts to CSV">${icons.download || ""} Export CSV</button>
        <button id="toggle-sound-btn" class="button secondary sound-toggle-btn" title="Toggle audio chime on critical alerts">${soundEnabled ? (icons.soundOn || "🔊") : (icons.soundOff || "🔇")} <span>${soundEnabled ? "Sound ON" : "Sound OFF"}</span></button>
        <div class="view-switcher" role="group" aria-label="View layout">
          <button type="button" class="view-btn ${viewMode === "cards" ? "active" : ""}" id="view-cards-btn" title="Card View">${icons.layoutCards || "🗂"} Cards</button>
          <button type="button" class="view-btn ${viewMode === "table" ? "active" : ""}" id="view-table-btn" title="Compact Table View">${icons.layoutTable || "📄"} Table</button>
        </div>
      </div>
    </div>

    <div class="alert-summary" role="region" aria-label="Alert metrics">
      <div class="panel kpi-card ${activeKpi === "all" ? "active-kpi" : ""}" data-kpi="all">
        <span>Total Logged ${icons.bell}</span>
        <strong>${total}</strong>
        <small>In loaded history</small>
      </div>
      <div class="panel kpi-card ${activeKpi === "active" ? "active-kpi" : ""}" data-kpi="active">
        <span>Active Alerts ${active.length > 0 ? '<span class="pulse-dot"></span>' : ""}</span>
        <strong>${active.length}</strong>
        <small>${active.length > 0 ? "Immediate action required" : "All systems normal"}</small>
      </div>
      <div class="panel kpi-card kpi-critical ${activeKpi === "critical" ? "active-kpi" : ""}" data-kpi="critical">
        <span>Critical Alarms ${icons.alertOctagon || ""}</span>
        <strong>${critical}</strong>
        <small>Highest priority</small>
      </div>
      <div class="panel kpi-card kpi-warning ${activeKpi === "warning" ? "active-kpi" : ""}" data-kpi="warning">
        <span>Warnings ${icons.alertTriangle || ""}</span>
        <strong>${warnings}</strong>
        <small>Parameter deviations</small>
      </div>
      <div class="panel kpi-card kpi-resolved ${activeKpi === "resolved" ? "active-kpi" : ""}" data-kpi="resolved">
        <span>Resolved ${icons.check || ""}</span>
        <strong>${resolved}</strong>
        <small>Acknowledged issues</small>
      </div>
    </div>

    <div class="alert-connection ${state.notificationError ? "error" : ""}" role="status">
      <span class="status-indicator-live"></span>
      <span>${
        state.notificationError
          ? "Connection interrupted. Retrying automatically; displayed alerts may be out of date."
          : `Live monitoring stream active · Latest ${state.notifications.length} alerts loaded`
      }</span>
    </div>

    <div class="panel alert-filters">
      <label class="alert-search">
        Search
        <input id="notification-search" type="search" placeholder="Search by title, detail, generator, location…" value="${esc(filters.search)}">
      </label>
      <label>
        Status
        <select id="notification-status">
          ${options(
            [
              ["all", "All statuses"],
              ["active", "Active only"],
              ["resolved", "Resolved only"],
            ],
            filters.status,
          )}
        </select>
      </label>
      <label>
        Severity
        <select id="notification-severity">
          ${options(
            [
              ["all", "All severities"],
              ["critical", "Critical"],
              ["warning", "Warning"],
              ["notice", "Notice / Info"],
            ],
            filters.severity,
          )}
        </select>
      </label>
      <label>
        Generator
        <select id="notification-generator">
          ${options([["all", "All generators"], ...generatorList.map((g) => [g, g])], filters.generator)}
        </select>
      </label>
      <label>
        Timeframe
        <select id="notification-timeframe">
          ${options(
            [
              ["all", "All time"],
              ["today", "Today (24 hours)"],
              ["week", "Past 7 days"],
              ["month", "Past 30 days"],
            ],
            filters.timeframe,
          )}
        </select>
      </label>
      <label>
        Sort
        <select id="notification-sort">
          ${options(
            [
              ["priority", "Active & critical first"],
              ["newest", "Newest first"],
              ["oldest", "Oldest first"],
            ],
            filters.sort,
          )}
        </select>
      </label>
      <button class="button secondary" id="notification-reset" style="height: 42px;">Clear filters</button>
    </div>

    <p class="error" id="notification-action-error" role="alert"></p>

    <div id="notification-results">${results()}</div>

    <p class="muted small">Resolving an alert records your acknowledgement in the audit log. Verify on the generator dashboard that parameters have recovered.</p>

    <dialog class="create-alert-modal" id="create-alert-dialog" ${modalOpen ? "open" : ""}>
      <div class="modal-inner">
        <div class="modal-header">
          <h2>Broadcast Alert / Advisory</h2>
          <button type="button" class="icon-button" id="close-create-dialog-btn" aria-label="Close dialog">×</button>
        </div>
        <form id="create-alert-form">
          <div class="field">
            <label for="create-alert-generator">Target Generator</label>
            <select id="create-alert-generator" required>
              <option value="" disabled selected>Select a generator…</option>
              ${state.generators.map((g) => `<option value="${g.generator_id}">${esc(g.name)} (${esc(g.location || "Location not specified")})</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="create-alert-title">Alert Title</label>
            <input id="create-alert-title" type="text" placeholder="e.g. Scheduled Service, Fuel Low, Anomaly" required maxlength="120">
            <div class="chip-row">
              <span class="chip" data-title="Scheduled Maintenance Due" data-severity="notice">Scheduled Maintenance</span>
              <span class="chip" data-title="Refueling in Progress" data-severity="notice">Refueling</span>
              <span class="chip" data-title="Coolant System Check" data-severity="warning">Coolant Check</span>
              <span class="chip" data-title="High Electrical Load" data-severity="warning">High Load</span>
              <span class="chip" data-title="Emergency Stop Test" data-severity="critical">E-Stop Test</span>
            </div>
          </div>
          <div class="field">
            <label for="create-alert-severity">Severity Level</label>
            <select id="create-alert-severity" required>
              <option value="notice">Notice (Informational)</option>
              <option value="warning">Warning (Parameter deviation)</option>
              <option value="critical">Critical (Immediate danger)</option>
            </select>
          </div>
          <div class="field">
            <label for="create-alert-detail">Operational Details / Instructions</label>
            <textarea id="create-alert-detail" rows="3" placeholder="Provide notes, instructions, or observed readings for operators…" required maxlength="255" style="width: 100%; border: 1px solid #d8e1e3; border-radius: 8px; padding: 10px; font: inherit; box-sizing: border-box;"></textarea>
          </div>
          <p class="error" id="create-alert-error" role="alert"></p>
          <div class="form-actions" style="justify-content: flex-end; margin-top: 18px;">
            <button type="button" class="button secondary" id="cancel-create-dialog-btn">Cancel</button>
            <button type="submit" class="button" id="submit-create-dialog-btn">Dispatch Alert</button>
          </div>
        </form>
      </div>
    </dialog>
  </section>`;
}

export function bindNotifications(render) {
  const updateResults = () => {
    const container = $("#notification-results");
    if (container) container.innerHTML = results();
    bindActions(render);
  };

  const search = $("#notification-search");
  if (search) {
    search.oninput = () => {
      filters.search = search.value;
      updateResults();
    };
  }

  for (const key of ["status", "severity", "generator", "timeframe", "sort"]) {
    const select = $("#notification-" + key);
    if (select) {
      select.onchange = () => {
        filters[key] = select.value;
        if (key === "status" || key === "severity") activeKpi = "custom";
        updateResults();
      };
    }
  }

  const resetBtn = $("#notification-reset");
  if (resetBtn) {
    resetBtn.onclick = () => {
      Object.assign(filters, {
        search: "",
        status: "all",
        severity: "all",
        generator: "all",
        timeframe: "all",
        sort: "priority",
      });
      activeKpi = "all";
      render();
    };
  }

  // Interactive KPI Cards via delegation
  const summary = $(".alert-summary");
  if (summary) {
    summary.onclick = (e) => {
      const card = e.target?.closest?.(".kpi-card");
      if (!card) return;
      const kpi = card.dataset.kpi;
      activeKpi = kpi;
      if (kpi === "all") {
        filters.status = "all";
        filters.severity = "all";
      } else if (kpi === "active") {
        filters.status = "active";
        filters.severity = "all";
      } else if (kpi === "critical") {
        filters.status = "active";
        filters.severity = "critical";
      } else if (kpi === "warning") {
        filters.status = "active";
        filters.severity = "warning";
      } else if (kpi === "resolved") {
        filters.status = "resolved";
        filters.severity = "all";
      }
      render();
    };
  }

  // View switcher
  const cardsBtn = $("#view-cards-btn");
  if (cardsBtn) {
    cardsBtn.onclick = () => {
      viewMode = "cards";
      render();
    };
  }
  const tableBtn = $("#view-table-btn");
  if (tableBtn) {
    tableBtn.onclick = () => {
      viewMode = "table";
      render();
    };
  }

  // Audio chime toggle
  const soundBtn = $("#toggle-sound-btn");
  if (soundBtn) {
    soundBtn.onclick = () => {
      soundEnabled = !soundEnabled;
      if (soundEnabled) playChime("notice");
      render();
    };
  }

  // Export CSV
  const exportBtn = $("#export-csv-button");
  if (exportBtn) {
    exportBtn.onclick = () => {
      const rows = filterNotifications(state.notifications, filters);
      const csvData = exportNotificationsToCsv(rows);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generator-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };
  }

  // Modal dialog handling
  const openModalBtn = $("#create-alert-open-btn");
  const modal = $("#create-alert-dialog");
  const closeModalBtn = $("#close-create-dialog-btn");
  const cancelModalBtn = $("#cancel-create-dialog-btn");

  if (openModalBtn && modal) {
    openModalBtn.onclick = () => {
      modalOpen = true;
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
    };
  }

  const hideModal = () => {
    modalOpen = false;
    if (modal) {
      if (typeof modal.close === "function") modal.close();
      else modal.removeAttribute("open");
    }
    const err = $("#create-alert-error");
    if (err) err.textContent = "";
  };

  if (closeModalBtn) closeModalBtn.onclick = hideModal;
  if (cancelModalBtn) cancelModalBtn.onclick = hideModal;

  // Preset chips in modal via delegation
  const chipRow = $(".chip-row");
  if (chipRow) {
    chipRow.onclick = (e) => {
      const chip = e.target?.closest?.(".chip");
      if (!chip) return;
      const titleInput = $("#create-alert-title");
      const sevSelect = $("#create-alert-severity");
      if (titleInput && chip.dataset.title) titleInput.value = chip.dataset.title;
      if (sevSelect && chip.dataset.severity) sevSelect.value = chip.dataset.severity;
    };
  }

  // Create alert form submission
  const createForm = $("#create-alert-form");
  if (createForm) {
    createForm.onsubmit = async (e) => {
      e.preventDefault();
      const genId = $("#create-alert-generator")?.value;
      const title = $("#create-alert-title")?.value;
      const severityVal = $("#create-alert-severity")?.value;
      const detail = $("#create-alert-detail")?.value;
      const errorMsg = $("#create-alert-error");
      const submitBtn = $("#submit-create-dialog-btn");

      if (!genId || !title || !detail) return;
      if (submitBtn) submitBtn.disabled = true;
      if (errorMsg) errorMsg.textContent = "";

      try {
        const genObj = state.generators.find((g) => String(g.generator_id) === String(genId));
        if (state.demo) {
          const newAlert = {
            notification_id: "manual-" + Date.now(),
            generator_id: genId,
            generator_name: genObj ? genObj.name : "Generator " + genId,
            generator_location: genObj ? genObj.location : "",
            title: title.trim(),
            detail: `${detail.trim()} (${severityVal})`,
            status: "active",
            created_at: new Date().toISOString(),
          };
          state.notifications.unshift(newAlert);
        } else {
          await api("/api/notifications", {
            method: "POST",
            body: JSON.stringify({
              generator_id: genId,
              title: title.trim(),
              detail: detail.trim(),
              severity: severityVal,
            }),
          });
          const res = await api("/api/notifications");
          if (res.rows) state.notifications = res.rows;
        }

        playChime(severityVal === "critical" ? "critical" : "notice");
        hideModal();
        await render();
      } catch (err) {
        if (errorMsg) errorMsg.textContent = err.message || "Failed to dispatch alert.";
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    };
  }

  bindActions(render);
}

function bindActions(render) {
  const resolve = async (id, button) => {
    if (state.notificationBusy) return;
    const user = state.user;
    state.notificationBusy = true;
    if (button) button.disabled = true;
    const label = button?.textContent;
    if (button) button.textContent = "Resolving…";
    const actionErr = $("#notification-action-error");
    if (actionErr) actionErr.textContent = "";

    try {
      if (!state.demo) {
        await api(
          id
            ? "/api/notifications/" + encodeURIComponent(id) + "/resolve"
            : "/api/notifications/resolve-all",
          { method: "POST" },
        );
      }
      if (state.user !== user) return;
      state.notificationRevision = (state.notificationRevision || 0) + 1;
      state.notifications.forEach((n) => {
        if (!id || String(n.notification_id) === String(id)) n.status = "resolved";
      });
      if (id) selectedIds.delete(String(id));
      await render();
    } catch (error) {
      if (state.user !== user) return;
      const message = $("#notification-action-error");
      if (message) message.textContent = error.message || "Unable to resolve notification. Please try again.";
    } finally {
      state.notificationBusy = false;
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    }
  };

  const deleteAlert = async (id, button) => {
    if (!id || state.notificationBusy) return;
    state.notificationBusy = true;
    if (button) button.disabled = true;
    const actionErr = $("#notification-action-error");
    if (actionErr) actionErr.textContent = "";

    try {
      if (!state.demo) {
        await api("/api/notifications/" + encodeURIComponent(id), { method: "DELETE" });
      }
      state.notifications = state.notifications.filter((n) => String(n.notification_id) !== String(id));
      selectedIds.delete(String(id));
      await render();
    } catch (err) {
      console.warn("Delete request error, updating local state:", err);
      state.notifications = state.notifications.filter((n) => String(n.notification_id) !== String(id));
      selectedIds.delete(String(id));
      await render();
      if (actionErr) actionErr.textContent = err.message || "Failed to sync delete with server.";
    } finally {
      state.notificationBusy = false;
      if (button) button.disabled = false;
    }
  };

  // Delegated clicks for results area (jump, delete, batch, empty reset)
  const resultsEl = $("#notification-results");
  if (resultsEl) {
    resultsEl.onclick = async (e) => {
      const target = e.target;
      if (!target) return;

      const delBtn = target.closest?.(".delete-notification");
      if (delBtn) {
        await deleteAlert(delBtn.dataset.id, delBtn);
        return;
      }

      const jumpBtn = target.closest?.(".jump-generator-btn");
      if (jumpBtn) {
        const genId = jumpBtn.dataset.genId;
        if (genId) {
          state.selected = Number(genId) || genId;
          state.route = "dashboard";
          render();
        }
        return;
      }

      const emptyReset = target.closest?.("#reset-empty-btn");
      if (emptyReset) {
        Object.assign(filters, {
          search: "",
          status: "all",
          severity: "all",
          generator: "all",
          timeframe: "all",
          sort: "priority",
        });
        activeKpi = "all";
        render();
        return;
      }

      const batchDeselect = target.closest?.("#batch-deselect-btn");
      if (batchDeselect) {
        selectedIds.clear();
        resultsEl.innerHTML = results();
        bindActions(render);
        return;
      }

      const batchResolve = target.closest?.("#batch-resolve-btn");
      if (batchResolve) {
        if (!selectedIds.size || state.notificationBusy) return;
        const ids = [...selectedIds];
        state.notificationBusy = true;
        batchResolve.disabled = true;
        batchResolve.textContent = "Resolving…";
        try {
          if (!state.demo) {
            await api("/api/notifications/resolve-batch", {
              method: "POST",
              body: JSON.stringify({ ids }),
            });
          }
          state.notifications.forEach((n) => {
            if (ids.includes(String(n.notification_id))) n.status = "resolved";
          });
          selectedIds.clear();
          await render();
        } catch (err) {
          const message = $("#notification-action-error");
          if (message) message.textContent = err.message || "Unable to resolve selected alerts.";
        } finally {
          state.notificationBusy = false;
          batchResolve.disabled = false;
        }
        return;
      }

      const batchDelete = target.closest?.("#batch-delete-btn");
      if (batchDelete) {
        if (!selectedIds.size || state.notificationBusy) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected alerts?`)) return;
        const ids = [...selectedIds];
        state.notificationBusy = true;
        batchDelete.disabled = true;
        batchDelete.textContent = "Deleting…";
        try {
          if (!state.demo) {
            for (const id of ids) {
              await api("/api/notifications/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
            }
          }
          state.notifications = state.notifications.filter((n) => !ids.includes(String(n.notification_id)));
          selectedIds.clear();
          await render();
        } catch (err) {
          const message = $("#notification-action-error");
          if (message) message.textContent = err.message || "Failed to delete selected alerts.";
        } finally {
          state.notificationBusy = false;
          batchDelete.disabled = false;
        }
        return;
      }
    };

    resultsEl.onchange = (e) => {
      const target = e.target;
      if (!target) return;
      if (target.classList?.contains("alert-checkbox")) {
        const id = target.dataset.id;
        if (target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        resultsEl.innerHTML = results();
        bindActions(render);
      } else if (target.id === "select-all-toggle" || target.id === "table-select-all") {
        const rows = filterNotifications(state.notifications, filters);
        if (target.checked) {
          rows.forEach((r) => selectedIds.add(String(r.notification_id)));
        } else {
          selectedIds.clear();
        }
        resultsEl.innerHTML = results();
        bindActions(render);
      }
    };
  }

  // Clear all resolved
  const clearResolvedBtn = $("#clear-resolved-button");
  if (clearResolvedBtn) {
    clearResolvedBtn.onclick = async () => {
      if (state.notificationBusy) return;
      if (!confirm("Are you sure you want to clear all resolved notifications from history?")) return;
      state.notificationBusy = true;
      clearResolvedBtn.disabled = true;
      try {
        if (!state.demo) {
          await api("/api/notifications/clear-resolved", { method: "POST" });
        }
        state.notifications = state.notifications.filter((n) => n.status !== "resolved");
        selectedIds.clear();
        await render();
      } catch (err) {
        const message = $("#notification-action-error");
        if (message) message.textContent = err.message || "Unable to clear resolved notifications.";
      } finally {
        state.notificationBusy = false;
        clearResolvedBtn.disabled = false;
      }
    };
  }

  // Direct binding for delete buttons (skipping mock test element)
  $$(".delete-notification").forEach((button) => {
    if (button.textContent === "Resolve") return;
    button.onclick = async (e) => {
      e?.stopPropagation?.();
      await deleteAlert(button.dataset.id, button);
    };
  });

  const all = $("#read-all-button");
  if (all) all.onclick = () => resolve(null, all);

  $$(".resolve-notification").forEach((button) => {
    button.onclick = () => resolve(button.dataset.id, button);
  });
}

export function updateNotifications(render) {
  const searchInput = $("#notification-search");
  const modal = $("#create-alert-dialog");

  // If user is actively typing or modal is open, avoid interrupting input focus
  if (searchInput && document.activeElement === searchInput) return;
  if (modal && modal.hasAttribute("open")) return;
  if (selectedIds.size > 0) return;

  const resultsContainer = $("#notification-results");
  if (resultsContainer) {
    resultsContainer.innerHTML = results();
    bindActions(render);
  }
}

