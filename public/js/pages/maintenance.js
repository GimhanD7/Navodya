import { state } from "../state.js";
import { icons, $ } from "../icons.js";
import { api } from "../api.js";

// Service history stored in localStorage with realistic initial seed
const SEED_HISTORY = [
  {
    id: "rec-1",
    generator_id: 1,
    generator_name: "Generator 01",
    service_type: "Routine 250h Oil & Filter Service",
    runtime_hours: "250.0",
    performed_by: "P. Perera (Senior Tech)",
    date: "2026-10-08",
    status: "Completed",
    notes: "Replaced 15W-40 lube oil, OEM oil filter, and checked fuel line seals. No leaks.",
  },
  {
    id: "rec-2",
    generator_id: 1,
    generator_name: "Generator 01",
    service_type: "50h Break-in Inspection & Lube Check",
    runtime_hours: "50.0",
    performed_by: "M. Fernando (Operator)",
    date: "2026-09-02",
    status: "Completed",
    notes: "Initial factory break-in service. Valve clearances and belt tension verified.",
  },
  {
    id: "rec-3",
    generator_id: 2,
    generator_name: "Generator 02",
    service_type: "Routine 250h Oil & Filter Service",
    runtime_hours: "248.5",
    performed_by: "K. Silva (Field Tech)",
    date: "2026-10-01",
    status: "Completed",
    notes: "Oil replaced with heavy-duty diesel lubricant. Air cleaner blown out with compressed air.",
  },
  {
    id: "rec-4",
    generator_id: 2,
    generator_name: "Generator 02",
    service_type: "50h Break-in Inspection & Lube Check",
    runtime_hours: "50.0",
    performed_by: "P. Perera (Senior Tech)",
    date: "2026-08-15",
    status: "Completed",
    notes: "All electrical terminal lugs tightened. Fluid levels certified normal.",
  },
];

function getServiceHistory() {
  try {
    const raw = localStorage.getItem("gen_maintenance_history");
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return SEED_HISTORY;
}

function saveServiceHistory(list) {
  try {
    localStorage.setItem("gen_maintenance_history", JSON.stringify(list));
  } catch {
    // ignore storage error
  }
}

function getLastServiceHours(genId) {
  try {
    const v = localStorage.getItem(`gen_service_baseline_${genId}`);
    if (v !== null) return Number(v) || 0;
  } catch {
    // ignore
  }
  return 0;
}

function setLastServiceHours(genId, hours) {
  try {
    localStorage.setItem(`gen_service_baseline_${genId}`, String(hours));
  } catch {
    // ignore
  }
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let modalOpen = false;
let lastRecordedAt = null;

function getCheckDefinitions(c) {
  return [
    {
      label: "Engine Temperature",
      key: "temperature",
      unit: "°C",
      icon: icons.thermometer,
      warn: c.temperature?.warning_max ?? 85,
      crit: c.temperature?.critical_max ?? 95,
      safeDesc: `< ${c.temperature?.warning_max ?? 85} °C`,
      warnDesc: `${c.temperature?.warning_max ?? 85}–${c.temperature?.critical_max ?? 95} °C`,
      critDesc: `> ${c.temperature?.critical_max ?? 95} °C`,
      minLimit: 0,
      maxLimit: 120,
    },
    {
      label: "AC Output Voltage",
      key: "voltage",
      unit: "V",
      icon: icons.bolt,
      warn: (c.voltage?.warning_min ?? 210) + "–" + (c.voltage?.warning_max ?? 250),
      crit: (c.voltage?.critical_min ?? 190) + "–" + (c.voltage?.critical_max ?? 260),
      safeDesc: `${c.voltage?.warning_min ?? 210}–${c.voltage?.warning_max ?? 250} V`,
      warnDesc: "Deviates outside 210–250 V",
      critDesc: "Outside 190–260 V",
      minLimit: 170,
      maxLimit: 280,
    },
    {
      label: "Electrical Frequency",
      key: "frequency",
      unit: "Hz",
      icon: icons.activity,
      warn: (c.frequency?.warning_min ?? 49) + "–" + (c.frequency?.warning_max ?? 51),
      crit: (c.frequency?.critical_min ?? 47) + "–" + (c.frequency?.critical_max ?? 53),
      safeDesc: `${c.frequency?.warning_min ?? 49}–${c.frequency?.warning_max ?? 51} Hz`,
      warnDesc: "Deviates outside 49–51 Hz",
      critDesc: "Outside 47–53 Hz",
      minLimit: 44,
      maxLimit: 56,
    },
    {
      label: "Fuel Level",
      key: "fuel_level",
      unit: "%",
      icon: icons.droplet,
      warn: c.fuel?.warning_min ?? 20,
      crit: c.fuel?.critical_min ?? 10,
      safeDesc: `> ${c.fuel?.warning_min ?? 20} %`,
      warnDesc: `${c.fuel?.critical_min ?? 10}–${c.fuel?.warning_min ?? 20} %`,
      critDesc: `< ${c.fuel?.critical_min ?? 10} %`,
      minLimit: 0,
      maxLimit: 100,
    },
  ];
}

function evaluateStatus(key, v, c) {
  if (v === null || v === undefined) return ["Unavailable", "unavailable"];
  const num = Number(v);
  if (!Number.isFinite(num)) return ["Unavailable", "unavailable"];

  if (key === "temperature") {
    const cMax = Number(c.temperature?.critical_max ?? 95);
    const wMax = Number(c.temperature?.warning_max ?? 85);
    return num >= cMax
      ? ["Critical", "critical"]
      : num >= wMax
        ? ["Warning", "warning"]
        : ["Normal", "normal"];
  }
  if (key === "fuel_level") {
    const cMin = Number(c.fuel?.critical_min ?? 10);
    const wMin = Number(c.fuel?.warning_min ?? 20);
    return num <= cMin
      ? ["Critical", "critical"]
      : num <= wMin
        ? ["Warning", "warning"]
        : ["Normal", "normal"];
  }
  const x = c[key];
  const cMin = Number(x?.critical_min ?? (key === "voltage" ? 190 : 47));
  const cMax = Number(x?.critical_max ?? (key === "voltage" ? 260 : 53));
  const wMin = Number(x?.warning_min ?? (key === "voltage" ? 210 : 49));
  const wMax = Number(x?.warning_max ?? (key === "voltage" ? 250 : 51));

  if (num < cMin || num > cMax) return ["Critical", "critical"];
  if (num < wMin || num > wMax) return ["Warning", "warning"];
  return ["Normal", "normal"];
}

export function maintenance() {
  const g =
    state.generators.find((x) => String(x.generator_id) === String(state.selected)) ||
    state.generators[0] ||
    null;

  if (g && (!state.selected || String(state.selected) !== String(g.generator_id))) {
    state.selected = g.generator_id;
  }

  const r = state.reading;
  lastRecordedAt = r?.recorded_at || null;
  const c = Object.fromEntries(state.config.map((x) => [x.parameter, x]));
  const fresh = Boolean(r && r.status !== "offline");

  const checks = getCheckDefinitions(c);
  const value = (key) => r?.[key] ?? null;

  // Runtime and interval calculations
  const runtime = r?.runtime_seconds ?? null;
  const totalHours = runtime === null ? null : runtime / 3600;
  const interval = 250;
  const genId = g?.generator_id ?? 1;
  const lastBaseline = getLastServiceHours(genId);
  const cycleHours = totalHours !== null ? Math.max(0, totalHours - lastBaseline) : 0;
  const currentIntervalHours = cycleHours % interval;
  const remainingHours = totalHours !== null ? Math.max(0, interval - currentIntervalHours) : null;
  const isOverdue = totalHours !== null && cycleHours >= interval;
  const progressPercent = totalHours === null ? 0 : Math.min(100, (currentIntervalHours / interval) * 100);

  // Overall Health Assessment
  let abnormalCount = 0;
  checks.forEach((chk) => {
    const s = evaluateStatus(chk.key, value(chk.key), c);
    if (s[1] === "warning" || s[1] === "critical") abnormalCount++;
  });

  const serviceState =
    totalHours === null
      ? { label: "Telemetry Offline", cls: "unavailable" }
      : isOverdue
        ? { label: "Service Overdue", cls: "critical" }
        : remainingHours !== null && remainingHours <= 35
          ? { label: "Service Due Soon", cls: "warning" }
          : { label: "Optimal Condition", cls: "running" };

  // Render Condition Check Cards
  const cardsHtml = checks
    .map((chk) => {
      const v = value(chk.key);
      const s = evaluateStatus(chk.key, v, c);
      const num = Number(v);
      const percent =
        Number.isFinite(num) && chk.maxLimit > chk.minLimit
          ? Math.min(100, Math.max(0, ((num - chk.minLimit) / (chk.maxLimit - chk.minLimit)) * 100))
          : 0;

      return `<article id="maint-card-${chk.key}" class="maintenance-check-card ${s[1]}">
        <div class="maintenance-check-header">
          <div class="maintenance-check-title">${chk.icon || ""}<span>${esc(chk.label)}</span></div>
          <span id="maint-status-${chk.key}" class="status ${s[1]}">${s[0]}</span>
        </div>
        <div id="maint-val-${chk.key}" class="maintenance-check-value">${v === null ? "—" : esc(v)}<span>${chk.unit}</span></div>
        <div class="maintenance-check-gauge" role="progressbar" aria-valuenow="${percent.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
          <div id="maint-gauge-${chk.key}" class="maintenance-check-fill" style="width: ${percent.toFixed(1)}%;"></div>
        </div>
        <div class="maintenance-check-limits">
          <div>Safe: <strong>${esc(chk.safeDesc)}</strong></div>
          <div class="muted">Warn: ${esc(chk.warn)} · Crit: ${esc(chk.crit)}</div>
        </div>
      </article>`;
    })
    .join("");

  // History list for selected generator
  const allHistory = getServiceHistory();
  const genHistory = allHistory.filter((h) => String(h.generator_id) === String(genId));

  return `<section class="maintenance-page">
    <div class="page-heading">
      <div>
        <div class="eyebrow">Service planning &amp; equipment health</div>
        <h1>Maintenance</h1>
        <p>Monitor condition parameters, manage service intervals, and track maintenance records.</p>
      </div>
      <div class="notification-actions">
        <button type="button" class="button" id="record-service-btn">${icons.wrench || ""} Record Service</button>
        <button type="button" class="button secondary" id="reset-service-btn" title="Reset service countdown cycle">${icons.check || ""} Reset Countdown</button>
        <button type="button" class="button secondary" id="export-maintenance-btn" title="Export service history to CSV">${icons.download || ""} Export Log</button>
      </div>
    </div>

    <div class="panel maintenance-gen-bar">
      <div class="maintenance-gen-identity">
        <div class="generator-symbol">${icons.wrench || icons.bolt}</div>
        <div>
          <select id="maintenance-generator-select" aria-label="Select generator for maintenance">
            ${
              state.generators.length
                ? state.generators
                    .map(
                      (x) =>
                        `<option value="${x.generator_id}" ${String(x.generator_id) === String(state.selected) ? "selected" : ""}>${esc(x.name)}</option>`,
                    )
                    .join("")
                : "<option>No generators connected</option>"
            }
          </select>
          <p>${esc(g?.location || "No generator selected")}${g?.serial_number ? ` · S/N: ${esc(g.serial_number)}` : ""}</p>
        </div>
      </div>
      <div class="maintenance-gen-badges">
        <span id="maint-gen-live-status" class="status ${fresh && r?.status === "running" ? "running" : "warning"}">${fresh ? (r?.status || "STANDBY").toUpperCase() : "UNKNOWN"}</span>
        <span id="maint-gen-service-status" class="status ${serviceState.cls}">${serviceState.label}</span>
      </div>
    </div>

    <!-- High-level KPI Summary Cards -->
    <div class="maintenance-kpis" role="region" aria-label="Service metrics">
      <div class="maintenance-kpi-card">
        <div class="maintenance-kpi-label">Total Engine Runtime ${icons.clock || ""}</div>
        <div class="maintenance-kpi-value" id="maint-kpi-runtime">${totalHours === null ? "—" : totalHours.toFixed(1)} <small style="font-size: 13px; font-weight: 500; color: #6e8088;">hrs</small></div>
        <div class="maintenance-kpi-sub" id="maint-kpi-runtime-sub">${runtime !== null ? `${Math.floor(runtime / 3600)}h ${Math.floor((runtime % 3600) / 60)}m logged` : "Telemetry unavailable"}</div>
      </div>
      <div class="maintenance-kpi-card">
        <div class="maintenance-kpi-label">Service Countdown ${icons.wrench || ""}</div>
        <div class="maintenance-kpi-value" id="maint-kpi-countdown" style="color: ${isOverdue ? "#c44035" : remainingHours !== null && remainingHours <= 35 ? "#d59a31" : "#153b35"};">${remainingHours === null ? "—" : remainingHours.toFixed(1)} <small style="font-size: 13px; font-weight: 500; color: #6e8088;">hrs</small></div>
        <div class="maintenance-kpi-sub" id="maint-kpi-countdown-sub">${isOverdue ? '<span style="color:#c44035; font-weight:600;">Service overdue</span>' : "Until 250h routine service"}</div>
      </div>
      <div class="maintenance-kpi-card">
        <div class="maintenance-kpi-label">Cycle Progress ${icons.activity || ""}</div>
        <div class="maintenance-kpi-value" id="maint-kpi-progress">${totalHours === null ? "—" : progressPercent.toFixed(0)}%</div>
        <div class="maintenance-kpi-sub">${interval}h standard routine cycle</div>
      </div>
      <div class="maintenance-kpi-card">
        <div class="maintenance-kpi-label">Live Conditions ${icons.info || ""}</div>
        <div class="maintenance-kpi-value" id="maint-kpi-conditions" style="color: ${abnormalCount > 0 ? "#bd8217" : "#2a9973"};">${abnormalCount === 0 ? "4/4 OK" : `${abnormalCount} Alert`}</div>
        <div class="maintenance-kpi-sub" id="maint-kpi-conditions-sub">${abnormalCount === 0 ? "All parameters within limits" : "Parameter deviation flagged"}</div>
      </div>
    </div>

    <!-- Live Condition Checks Section -->
    <div class="maintenance-checks-heading">
      <h2>Live Operating Condition Checks</h2>
      <span class="muted small">${r ? "Real-time measurements vs central threshold limits" : "Awaiting telemetry stream"}</span>
    </div>
    <div class="maintenance-checks" role="region" aria-label="Condition checks">
      ${cardsHtml}
    </div>

    <!-- 2-Column Balanced Maintenance Center -->
    <div class="maintenance-layout">
      <!-- Column 1: Preventive Service Status & Progress -->
      <div class="maintenance-panel">
        <div class="section-header">
          <div>
            <h2>250-Hour Routine Service Cycle</h2>
            <p>${r ? "Based on live runtime and recorded maintenance history." : "Waiting for telemetry."}</p>
          </div>
          <span id="maint-panel-service-badge" class="status ${serviceState.cls}">${serviceState.label}</span>
        </div>
        <div class="maintenance-service-body">
          <div class="maintenance-cycle-heading">
            <div>
              <strong id="maint-cycle-current">${totalHours === null ? "—" : currentIntervalHours.toFixed(1)}</strong>
              <span> / ${interval} hrs</span>
            </div>
            <span id="maint-cycle-percent-text">${progressPercent.toFixed(1)}% completed</span>
          </div>

          <div class="maintenance-progress-wrap">
            <div class="maintenance-progress-bar" role="progressbar" aria-valuenow="${progressPercent.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
              <div id="maint-progress-fill" class="maintenance-progress-fill ${isOverdue ? "overdue" : remainingHours !== null && remainingHours <= 35 ? "warning" : ""}" style="width: ${progressPercent}%;"></div>
            </div>
          </div>

          <div class="maintenance-cycle-stats">
            <div class="cycle-stat">
              <span>Service Interval</span>
              <strong>${interval} hrs</strong>
            </div>
            <div class="cycle-stat">
              <span>Remaining</span>
              <strong id="maint-cycle-remaining-stat" style="color: ${isOverdue ? "#c44035" : remainingHours !== null && remainingHours <= 35 ? "#d59a31" : "#173831"};">${remainingHours === null ? "—" : remainingHours.toFixed(1)} hrs</strong>
            </div>
            <div class="cycle-stat">
              <span>Est. Time Left</span>
              <strong id="maint-cycle-days-stat">${remainingHours === null ? "—" : `~${Math.max(1, Math.round(remainingHours / 8))} days`}</strong>
            </div>
          </div>

          <p id="maint-cycle-advice" class="muted small" style="margin-bottom: 16px; line-height: 1.5;">
            ${
              isOverdue
                ? '<strong style="color:#c44035;">Action required:</strong> This generator has exceeded its scheduled 250-hour service interval. Perform engine lube replacement immediately to prevent premature wear.'
                : remainingHours !== null && remainingHours <= 35
                  ? '<strong style="color:#bd8217;">Notice:</strong> Service milestone approaching. Prepare lube oil, OEM filter cartridge, and schedule a maintenance window.'
                  : "All engine lubricants, filters, and fluid levels operate within manufacturer tolerance limits. No immediate intervention required."
            }
          </p>

          <div class="maintenance-service-actions">
            <button type="button" class="button" id="service-action-record-btn">${icons.wrench || ""} Log Service Completed</button>
            <button type="button" class="button secondary" id="service-action-reset-btn">${icons.check || ""} Reset Counter</button>
          </div>
        </div>
      </div>

      <!-- Column 2: Scheduled Maintenance Routine Protocols -->
      <div class="maintenance-panel">
        <div class="section-header">
          <div>
            <h2>Service Interval Protocols</h2>
            <p>Manufacturer preventive maintenance schedule</p>
          </div>
          <span class="status normal">Protocol Active</span>
        </div>
        <div class="maintenance-checklist">
          <div class="maintenance-checklist-item ${totalHours !== null && totalHours >= 50 && totalHours < 250 ? "current" : ""}">
            <div class="interval-badge">50 Hours</div>
            <div class="interval-content">
              <strong>Initial Break-in Inspection</strong>
              <p>Change initial engine oil, inspect filter screens, and check terminal torque &amp; belt tension.</p>
            </div>
            <span class="interval-status-badge ${totalHours !== null && totalHours >= 50 ? "status running" : "status"}">${totalHours !== null && totalHours >= 50 ? "Completed" : "Scheduled"}</span>
          </div>

          <div class="maintenance-checklist-item ${totalHours !== null && totalHours >= 250 && totalHours < 500 ? "current" : ""}">
            <div class="interval-badge">250 Hours</div>
            <div class="interval-content">
              <strong>Engine Oil &amp; Filter Replacement</strong>
              <p>Drain crankcase oil, install new OEM lube filter, clean air breather, and check coolant density.</p>
            </div>
            <span class="interval-status-badge ${isOverdue ? "status critical" : remainingHours !== null && remainingHours <= 35 ? "status warning" : "status running"}">${isOverdue ? "Overdue" : remainingHours !== null && remainingHours <= 35 ? "Due Next" : "Current Routine"}</span>
          </div>

          <div class="maintenance-checklist-item">
            <div class="interval-badge">500 Hours</div>
            <div class="interval-content">
              <strong>Fuel Filter &amp; Air Cleaner Element</strong>
              <p>Replace primary fuel filter element, inspect water separator bowl, and replace air filter cartridge.</p>
            </div>
            <span class="interval-status-badge status">Upcoming</span>
          </div>

          <div class="maintenance-checklist-item">
            <div class="interval-badge">1000 Hours</div>
            <div class="interval-content">
              <strong>Coolant Flush &amp; Valve Clearance</strong>
              <p>Flush engine cooling circuit, replenish anti-corrosion coolant, test thermostats, and adjust valve lash.</p>
            </div>
            <span class="interval-status-badge status">Milestone</span>
          </div>

          <div class="maintenance-checklist-item">
            <div class="interval-badge">2000 Hours</div>
            <div class="interval-content">
              <strong>Major Overhaul &amp; Alternator Check</strong>
              <p>Inspect alternator rotor bearings, insulation resistance (megger test), and fuel injection nozzles.</p>
            </div>
            <span class="interval-status-badge status">Major Service</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Maintenance Records Table Section -->
    <div class="maintenance-history-section">
      <div class="section-header">
        <div>
          <h2>Maintenance Service History</h2>
          <p>Verified service interventions for ${esc(g?.name || "selected generator")}</p>
        </div>
        <span class="muted small">${genHistory.length} record${genHistory.length === 1 ? "" : "s"} logged</span>
      </div>
      <div class="maintenance-table-wrap">
        <table class="maintenance-table">
          <thead>
            <tr>
              <th style="width: 120px;">Date</th>
              <th>Service Intervention</th>
              <th style="width: 140px;">Engine Runtime</th>
              <th style="width: 180px;">Serviced By</th>
              <th style="width: 110px;">Status</th>
              <th>Notes / Observations</th>
            </tr>
          </thead>
          <tbody>
            ${
              genHistory.length
                ? genHistory
                    .map(
                      (h) => `<tr>
                        <td><strong>${esc(h.date)}</strong></td>
                        <td><span style="font-weight: 600; color: #173b33;">${esc(h.service_type)}</span></td>
                        <td>${esc(h.runtime_hours)} hrs</td>
                        <td>${esc(h.performed_by)}</td>
                        <td><span class="status running">${esc(h.status)}</span></td>
                        <td class="muted small">${esc(h.notes || "—")}</td>
                      </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #72848c;">No maintenance records found for this generator.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Record Maintenance Modal Dialog -->
    <dialog class="maintenance-modal" id="record-service-dialog" ${modalOpen ? "open" : ""}>
      <div class="modal-inner">
        <div class="modal-header">
          <h2>Record Maintenance Service</h2>
          <button type="button" class="icon-button" id="close-record-dialog-btn" aria-label="Close dialog">×</button>
        </div>
        <form id="record-service-form">
          <div class="field">
            <label for="record-service-gen">Generator</label>
            <select id="record-service-gen" required>
              ${state.generators.map((x) => `<option value="${x.generator_id}" ${String(x.generator_id) === String(state.selected) ? "selected" : ""}>${esc(x.name)} (${esc(x.location || "Location not specified")})</option>`).join("")}
            </select>
          </div>

          <div class="field">
            <label for="record-service-type">Service Performed</label>
            <select id="record-service-type" required>
              <option value="Routine 250h Oil &amp; Filter Service">Routine 250h Oil &amp; Lube Filter Replacement</option>
              <option value="50h Break-in Inspection &amp; Lube Check">50h Break-in Inspection</option>
              <option value="500h Fuel Filter &amp; Air Cleaner Service">500h Fuel Filter &amp; Air Cleaner Service</option>
              <option value="1000h Coolant System Flush &amp; Valve Check">1000h Coolant System Flush</option>
              <option value="Battery Load Test &amp; Terminal Servicing">Battery Load Test &amp; Terminal Servicing</option>
              <option value="General Inspection &amp; Repair">General Inspection &amp; Unscheduled Repair</option>
            </select>
          </div>

          <div class="field-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="field">
              <label for="record-service-runtime">Engine Runtime (hrs)</label>
              <input id="record-service-runtime" type="number" step="0.1" value="${totalHours !== null ? totalHours.toFixed(1) : "0.0"}" required>
            </div>
            <div class="field">
              <label for="record-service-date">Service Date</label>
              <input id="record-service-date" type="date" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
          </div>

          <div class="field">
            <label for="record-service-technician">Technician / Operator Name</label>
            <input id="record-service-technician" type="text" placeholder="e.g. P. Perera, Field Service Team" value="${esc(state.user?.name || "")}" required maxlength="80">
          </div>

          <div class="field">
            <label for="record-service-notes">Work Notes &amp; Fluid Specs</label>
            <textarea id="record-service-notes" rows="3" placeholder="Specify oil grade, filter parts, fluid condition, and any issues addressed…" required maxlength="300" style="width: 100%; border: 1px solid #d8e1e3; border-radius: 8px; padding: 10px; font: inherit; box-sizing: border-box;"></textarea>
          </div>

          <div style="margin: 12px 0 16px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
              <input type="checkbox" id="record-reset-checkbox" checked style="width: 16px; height: 16px; accent-color: #248165;">
              <span><strong>Reset 250-hour service countdown cycle</strong> for this generator</span>
            </label>
          </div>

          <div class="form-actions" style="justify-content: flex-end; margin-top: 18px; display: flex; gap: 10px;">
            <button type="button" class="button secondary" id="cancel-record-dialog-btn">Cancel</button>
            <button type="submit" class="button" id="submit-record-dialog-btn">Save Record</button>
          </div>
        </form>
      </div>
    </dialog>
  </section>`;
}

export function bindMaintenance(render) {
  // Generator dropdown change
  const genSelect = $("#maintenance-generator-select");
  if (genSelect) {
    genSelect.onchange = async () => {
      const selectedId = Number(genSelect.value) || genSelect.value;
      state.selected = selectedId;
      try {
        const result = await api("/api/generators/" + selectedId + "/latest");
        state.reading = result.reading || null;
      } catch {
        state.reading = null;
      }
      await render();
    };
  }

  // Modal dialog open/close
  const modal = $("#record-service-dialog");
  const openButtons = [$("#record-service-btn"), $("#service-action-record-btn")];
  openButtons.forEach((btn) => {
    if (btn && modal) {
      btn.onclick = () => {
        modalOpen = true;
        if (typeof modal.showModal === "function") modal.showModal();
        else modal.setAttribute("open", "");
      };
    }
  });

  const hideModal = () => {
    modalOpen = false;
    if (modal) {
      if (typeof modal.close === "function") modal.close();
      else modal.removeAttribute("open");
    }
  };

  const closeBtn = $("#close-record-dialog-btn");
  const cancelBtn = $("#cancel-record-dialog-btn");
  if (closeBtn) closeBtn.onclick = hideModal;
  if (cancelBtn) cancelBtn.onclick = hideModal;

  // Form submission to log maintenance
  const form = $("#record-service-form");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const targetGenId = Number($("#record-service-gen")?.value) || state.selected;
      const serviceType = $("#record-service-type")?.value || "Routine Service";
      const runtimeVal = $("#record-service-runtime")?.value || "0.0";
      const dateVal = $("#record-service-date")?.value || new Date().toISOString().slice(0, 10);
      const techVal = $("#record-service-technician")?.value || "Operator";
      const notesVal = $("#record-service-notes")?.value || "Standard service completed.";
      const shouldReset = $("#record-reset-checkbox")?.checked;

      const genObj = state.generators.find((g) => String(g.generator_id) === String(targetGenId));
      const newRecord = {
        id: "rec-" + Date.now(),
        generator_id: targetGenId,
        generator_name: genObj ? genObj.name : "Generator " + targetGenId,
        service_type: serviceType,
        runtime_hours: Number(runtimeVal).toFixed(1),
        performed_by: techVal.trim(),
        date: dateVal,
        status: "Completed",
        notes: notesVal.trim(),
      };

      const history = getServiceHistory();
      history.unshift(newRecord);
      saveServiceHistory(history);

      if (shouldReset) {
        setLastServiceHours(targetGenId, Number(runtimeVal));
      }

      hideModal();
      await render();
    };
  }

  // Quick Reset Countdown buttons
  const resetButtons = [$("#reset-service-btn"), $("#service-action-reset-btn")];
  resetButtons.forEach((btn) => {
    if (btn) {
      btn.onclick = async () => {
        const g = state.generators.find((x) => String(x.generator_id) === String(state.selected));
        const genName = g ? g.name : "this generator";
        if (!confirm(`Reset the 250-hour service countdown for ${genName} to current operating hours?`)) return;

        const runtime = state.reading?.runtime_seconds ?? 0;
        const totalHours = runtime / 3600;
        setLastServiceHours(state.selected, totalHours);
        await render();
      };
    }
  });

  // Export to CSV
  const exportBtn = $("#export-maintenance-btn");
  if (exportBtn) {
    exportBtn.onclick = () => {
      const history = getServiceHistory();
      const header = ["ID", "Generator", "Service Type", "Runtime Hours", "Technician", "Date", "Status", "Notes"];
      const rows = history.map((h) => [
        `"${h.id}"`,
        `"${h.generator_name}"`,
        `"${h.service_type}"`,
        `"${h.runtime_hours}"`,
        `"${h.performed_by}"`,
        `"${h.date}"`,
        `"${h.status}"`,
        `"${(h.notes || "").replace(/"/g, '""')}"`,
      ]);
      const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `maintenance-records-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };
  }
}

// In-place smooth DOM updates - NO full page re-render
export function updateMaintenance() {
  // If user is actively inside modal or dropdown, skip in-place update to preserve focus
  const modal = $("#record-service-dialog");
  if (modal && modal.hasAttribute("open")) return;
  const select = $("#maintenance-generator-select");
  if (select && document.activeElement === select) return;

  const g =
    state.generators.find((x) => String(x.generator_id) === String(state.selected)) ||
    state.generators[0] ||
    null;
  if (!g) return;

  const r = state.reading;
  const recordedAt = r?.recorded_at || null;
  if (recordedAt && recordedAt === lastRecordedAt) return;
  lastRecordedAt = recordedAt;

  const c = Object.fromEntries(state.config.map((x) => [x.parameter, x]));
  const fresh = Boolean(r && r.status !== "offline");
  const checks = getCheckDefinitions(c);

  // Runtime and interval calculations
  const runtime = r?.runtime_seconds ?? null;
  const totalHours = runtime === null ? null : runtime / 3600;
  const interval = 250;
  const genId = g?.generator_id ?? 1;
  const lastBaseline = getLastServiceHours(genId);
  const cycleHours = totalHours !== null ? Math.max(0, totalHours - lastBaseline) : 0;
  const currentIntervalHours = cycleHours % interval;
  const remainingHours = totalHours !== null ? Math.max(0, interval - currentIntervalHours) : null;
  const isOverdue = totalHours !== null && cycleHours >= interval;
  const progressPercent = totalHours === null ? 0 : Math.min(100, (currentIntervalHours / interval) * 100);

  const serviceState =
    totalHours === null
      ? { label: "Telemetry Offline", cls: "unavailable" }
      : isOverdue
        ? { label: "Service Overdue", cls: "critical" }
        : remainingHours !== null && remainingHours <= 35
          ? { label: "Service Due Soon", cls: "warning" }
          : { label: "Optimal Condition", cls: "running" };

  // Helper safe DOM mutators (only update when text has changed)
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el && el.textContent !== text) el.textContent = text;
  };
  const setHtml = (id, html) => {
    const el = document.getElementById(id);
    if (el && el.innerHTML !== html) el.innerHTML = html;
  };
  const setClass = (id, cls) => {
    const el = document.getElementById(id);
    if (el && el.className !== cls) el.className = cls;
  };
  const setWidth = (id, widthStr) => {
    const el = document.getElementById(id);
    if (el && el.style.width !== widthStr) el.style.width = widthStr;
  };

  // 1. Generator Status Badges
  setText("maint-gen-live-status", fresh ? (r?.status || "STANDBY").toUpperCase() : "UNKNOWN");
  setClass("maint-gen-live-status", `status ${fresh && r?.status === "running" ? "running" : "warning"}`);
  setText("maint-gen-service-status", serviceState.label);
  setClass("maint-gen-service-status", `status ${serviceState.cls}`);
  setText("maint-panel-service-badge", serviceState.label);
  setClass("maint-panel-service-badge", `status ${serviceState.cls}`);

  // 2. High-Level KPIs
  setHtml("maint-kpi-runtime", `${totalHours === null ? "—" : totalHours.toFixed(1)} <small style="font-size: 13px; font-weight: 500; color: #6e8088;">hrs</small>`);
  setText("maint-kpi-runtime-sub", runtime !== null ? `${Math.floor(runtime / 3600)}h ${Math.floor((runtime % 3600) / 60)}m logged` : "Telemetry unavailable");

  const countdownEl = document.getElementById("maint-kpi-countdown");
  if (countdownEl) {
    countdownEl.innerHTML = `${remainingHours === null ? "—" : remainingHours.toFixed(1)} <small style="font-size: 13px; font-weight: 500; color: #6e8088;">hrs</small>`;
    countdownEl.style.color = isOverdue ? "#c44035" : remainingHours !== null && remainingHours <= 35 ? "#d59a31" : "#153b35";
  }
  setHtml("maint-kpi-countdown-sub", isOverdue ? '<span style="color:#c44035; font-weight:600;">Service overdue</span>' : "Until 250h routine service");
  setText("maint-kpi-progress", `${totalHours === null ? "—" : progressPercent.toFixed(0)}%`);

  // 3. Condition Checks
  let abnormalCount = 0;
  for (const chk of checks) {
    const v = r?.[chk.key] ?? null;
    const s = evaluateStatus(chk.key, v, c);
    if (s[1] === "warning" || s[1] === "critical") abnormalCount++;

    const num = Number(v);
    const percent =
      Number.isFinite(num) && chk.maxLimit > chk.minLimit
        ? Math.min(100, Math.max(0, ((num - chk.minLimit) / (chk.maxLimit - chk.minLimit)) * 100))
        : 0;

    setClass(`maint-card-${chk.key}`, `maintenance-check-card ${s[1]}`);
    setText(`maint-status-${chk.key}`, s[0]);
    setClass(`maint-status-${chk.key}`, `status ${s[1]}`);
    setHtml(`maint-val-${chk.key}`, `${v === null ? "—" : esc(v)}<span>${chk.unit}</span>`);
    setWidth(`maint-gauge-${chk.key}`, `${percent.toFixed(1)}%`);
  }

  const condEl = document.getElementById("maint-kpi-conditions");
  if (condEl) {
    condEl.textContent = abnormalCount === 0 ? "4/4 OK" : `${abnormalCount} Alert`;
    condEl.style.color = abnormalCount > 0 ? "#bd8217" : "#2a9973";
  }
  setText("maint-kpi-conditions-sub", abnormalCount === 0 ? "All parameters within limits" : "Parameter deviation flagged");

  // 4. Cycle Progress Section
  setText("maint-cycle-current", totalHours === null ? "—" : currentIntervalHours.toFixed(1));
  setText("maint-cycle-percent-text", `${progressPercent.toFixed(1)}% completed`);

  const fillEl = document.getElementById("maint-progress-fill");
  if (fillEl) {
    fillEl.style.width = `${progressPercent}%`;
    fillEl.className = `maintenance-progress-fill ${isOverdue ? "overdue" : remainingHours !== null && remainingHours <= 35 ? "warning" : ""}`;
  }

  const remStatEl = document.getElementById("maint-cycle-remaining-stat");
  if (remStatEl) {
    remStatEl.textContent = `${remainingHours === null ? "—" : remainingHours.toFixed(1)} hrs`;
    remStatEl.style.color = isOverdue ? "#c44035" : remainingHours !== null && remainingHours <= 35 ? "#d59a31" : "#173831";
  }

  setText("maint-cycle-days-stat", remainingHours === null ? "—" : `~${Math.max(1, Math.round(remainingHours / 8))} days`);

  setHtml("maint-cycle-advice", isOverdue
    ? '<strong style="color:#c44035;">Action required:</strong> This generator has exceeded its scheduled 250-hour service interval. Perform engine lube replacement immediately to prevent premature wear.'
    : remainingHours !== null && remainingHours <= 35
      ? '<strong style="color:#bd8217;">Notice:</strong> Service milestone approaching. Prepare lube oil, OEM filter cartridge, and schedule a maintenance window.'
      : "All engine lubricants, filters, and fluid levels operate within manufacturer tolerance limits. No immediate intervention required.");
}
