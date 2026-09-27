import { telemetryStatus } from "../services/telemetry-status.js";
import { $ } from "../icons.js";
import { icons } from "../icons.js";
import { state } from "../state.js";

const unavailable = (unit) => `<span class="unavailable">—</span><span>${unit}</span>`;

const labels = [
  ["AC voltage", "voltage", "V"],
  ["AC current", "current", "A"],
  ["Frequency", "frequency", "Hz"],
  ["Temperature", "temperature", "°C"],
  ["Fuel level", "fuel_level", "%"],
  ["Runtime", "runtime_seconds", ""],
];

const format = (r, key, unit) =>
  r?.[key] !== undefined && r?.[key] !== null
    ? (key === "runtime_seconds"
        ? `${Math.floor(r[key] / 3600)}h ${Math.floor((r[key] % 3600) / 60)}m`
        : r[key]) + `<span>${unit}</span>`
    : unavailable(unit);

export function dashboard() {
  const g = state.generators.find((x) => x.generator_id === state.selected), r = state.reading;
  const simulated = ["seed-demo", "test-simulator", "browser-demo"].includes(r?.source);
  const diagnosis = telemetryStatus({ reading: r, error: state.demo ? null : state.generatorError || state.telemetryError, hasGenerator: Boolean(g) });
  const fresh = diagnosis.available;
  const connection = state.demo ? "Live demo" : diagnosis.title;
  const active = state.notifications.filter(n => n.status === "active" && n.generator_name === g?.name);
  const health = !r || !fresh ? "UNAVAILABLE" : active.length ? "ALERT" : "NO ACTIVE ALERTS";
  
  return `<div class="page-heading">
    <div><div class="eyebrow">Overview</div><h1>Dashboard</h1><p>Monitor generator health and service status.</p></div>
    <div class="date-label"><span id="header-status" class="status ${fresh && r?.status === "running" ? "running" : "warning"}">${connection}</span> ${new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
  </div>
  <div class="panel generator-bar">
    <div class="generator-identity"><div class="generator-symbol">${icons.bolt}</div>
      <div>
        <select id="generator-select" aria-label="Select generator">
          ${state.generators.length ? state.generators.map((x) => `<option value="${x.generator_id}" ${x.generator_id === state.selected ? "selected" : ""}>${x.name}</option>`).join("") : "<option>No generators connected</option>"}
        </select>
        <p>${g?.location || "No generator selected"}</p>
      </div>
    </div>
    <span id="gen-status-badge" class="status ${fresh ? "running" : "warning"}">${fresh ? (r?.status || "UNKNOWN").toUpperCase() : "UNKNOWN"}</span>
  </div>
  <div class="connection-notice">${icons.info}
    <div><strong id="notice-title">${simulated ? "Simulated telemetry." : diagnosis.title + "."}</strong> <span id="notice-detail">${state.demo ? "Values change automatically. Temperature and fuel alerts appear as toast messages every demo cycle. No database writes." : simulated ? "Test data, not physical generator measurements." : diagnosis.detail}</span></div>
  </div>
  <div class="readings-heading">
    <h2 id="readings-title">${simulated ? "Simulated readings" : "Actual readings"}</h2>
    <div class="timestamp">${icons.info} <span id="timestamp-connection">${connection}</span> · Refreshes every 1 second</div>
  </div>
  <div class="readings">
    ${labels.map(([label, key, unit]) => `
    <article class="panel metric">
      <div class="metric-header"><h3>${label}</h3><span class="metric-icon">${icons[key === "runtime_seconds" ? "bolt" : "info"]}</span></div>
      <div class="metric-value" id="val-${key}">${format(r, key, unit)}</div>
      ${key !== "runtime_seconds" ? `<div class="chart-container" style="position: relative; height: 60px; width: 100%; margin-top: 8px; margin-bottom: 4px;"><canvas id="chart-${key}"></canvas></div>` : ""}
      <div class="metric-footer" id="foot-${key}">${icons.info} ${r?.recorded_at ? (fresh ? "Recorded: " : "Last known: ") + new Date(r.recorded_at).toLocaleString() : "No reading available"}</div>
    </article>`).join("")}
  </div>
  <div class="panel maintenance-strip">
    <div class="generator-symbol">${icons.wrench}</div>
    <div><h3>Maintenance status</h3><p id="maint-desc">${fresh ? "Based on active notifications for this generator." : "Cannot evaluate without a recent reading."}</p></div>
    <span id="maint-badge" class="status ${!fresh || active.length ? "warning" : "normal"}">${health}</span>
  </div>
  <div class="footer"><span>Smart Generator Monitoring</span><span>Data status: <span id="footer-connection">${connection}</span></span></div>`;
}

let charts = {};

export function bindDashboard(render) {
  const genSelect = $("#generator-select");
  if (genSelect) {
    genSelect.addEventListener("change", (e) => {
      state.selected = state.demo ? e.target.value : Number(e.target.value);
      state.history = [];
      Object.values(charts).forEach(c => c.destroy());
      charts = {};
      render();
    });
  }

  // Initialize charts
  if (!window.Chart) return;
  
  // Custom dark mode compatible colors
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
  Chart.defaults.font.family = 'inherit';

  labels.forEach(([_, key]) => {
    if (key === "runtime_seconds") return;
    const ctx = document.getElementById(`chart-${key}`);
    if (!ctx) return;
    const color = isDark ? '#59e0aa' : '#047857';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    
    charts[key] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: state.history.map((_, i) => i),
        datasets: [{
          data: state.history.map(d => d[key]),
          borderColor: color,
          backgroundColor: isDark ? 'rgba(89, 224, 170, 0.1)' : 'rgba(4, 120, 87, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: { display: false, grid: { display: false } },
          y: { display: true, position: 'right', grid: { color: gridColor }, ticks: { font: { size: 10 }, maxTicksLimit: 3 } }
        }
      }
    });
  });
}

export function updateDashboard(render) {
  const g = state.generators.find((x) => x.generator_id === state.selected), r = state.reading;
  if (!g) return render();
  const simulated = ["seed-demo", "test-simulator", "browser-demo"].includes(r?.source);
  const diagnosis = telemetryStatus({ reading: r, error: state.demo ? null : state.generatorError || state.telemetryError, hasGenerator: Boolean(g) });
  const fresh = diagnosis.available;
  const connection = state.demo ? "Live demo" : diagnosis.title;
  const active = state.notifications.filter(n => n.status === "active" && n.generator_name === g?.name);
  const health = !r || !fresh ? "UNAVAILABLE" : active.length ? "ALERT" : "NO ACTIVE ALERTS";

  // Update text elements
  const el = (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
  const cls = (id, classStr) => { const e = document.getElementById(id); if (e) e.className = classStr; };

  el("header-status", connection);
  cls("header-status", `status ${fresh && r?.status === "running" ? "running" : "running"}`); // keep UI stable
  el("gen-status-badge", fresh ? (r?.status || "UNKNOWN").toUpperCase() : "UNKNOWN");
  cls("gen-status-badge", `status ${fresh ? "running" : "warning"}`);
  el("notice-title", simulated ? "Simulated telemetry." : diagnosis.title + ".");
  el("notice-detail", state.demo ? "Values change automatically. Temperature and fuel alerts appear as toast messages every demo cycle. No database writes." : simulated ? "Test data, not physical generator measurements." : diagnosis.detail);
  el("readings-title", simulated ? "Simulated readings" : "Actual readings");
  el("timestamp-connection", connection);
  el("footer-connection", connection);
  el("maint-desc", fresh ? "Based on active notifications for this generator." : "Cannot evaluate without a recent reading.");
  el("maint-badge", health);
  cls("maint-badge", `status ${!fresh || active.length ? "warning" : "normal"}`);

  labels.forEach(([_, key, unit]) => {
    el(`val-${key}`, format(r, key, unit));
    el(`foot-${key}`, `${icons.info} ${r?.recorded_at ? (fresh ? "Recorded: " : "Last known: ") + new Date(r.recorded_at).toLocaleString() : "No reading available"}`);
    
    // Update charts
    if (charts[key] && key !== "runtime_seconds") {
      charts[key].data.labels = state.history.map((_, i) => i);
      charts[key].data.datasets[0].data = state.history.map(d => d[key]);
      charts[key].update('none'); // Update without animation for smooth polling
    }
  });
}
