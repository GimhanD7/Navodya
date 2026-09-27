import { telemetryStatus } from "../services/telemetry-status.js";
import { $ } from "../icons.js";
import { icons } from "../icons.js";
import { state } from "../state.js";

const unavailable = (unit) =>
  `<span class="unavailable">—</span><span>${unit}</span>`;

const sparkline = (data, key) => {
  if (data.length < 2 || key === "runtime_seconds") return "";
  const values = data.map((d) => Number(d[key])).filter((n) => Number.isFinite(n));
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max === min ? 1 : max - min;
  const padding = range * 0.2;
  const bottom = min - padding;
  const top = max + padding;
  const w = 100, h = 40;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - bottom) / (top - bottom)) * h}`).join(" ");
  const fillPoints = `0,${h} ${points} ${w},${h}`;
  return `<svg viewBox="0 0 ${w} ${h}" class="sparkline" preserveAspectRatio="none">
    <polygon points="${fillPoints}" fill="var(--primary)" opacity="0.1" />
    <polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
};

export function dashboard() {
  const g = state.generators.find((x) => x.generator_id === state.selected),
    r = state.reading;
  const simulated = ["seed-demo", "test-simulator", "browser-demo"].includes(r?.source);
  const diagnosis = telemetryStatus({ reading: r, error: state.demo ? null : state.generatorError || state.telemetryError, hasGenerator: Boolean(g) });
  const fresh = diagnosis.available;
  const connection = state.demo ? "Live demo" : diagnosis.title;
  const active = state.notifications.filter(n => n.status === "active" && n.generator_name === g?.name);
  const health = !r || !fresh ? "UNAVAILABLE" : active.length ? "ALERT" : "NO ACTIVE ALERTS";
  const labels = [
    ["AC voltage", "voltage", "V"],
    ["AC current", "current", "A"],
    ["Frequency", "frequency", "Hz"],
    ["Temperature", "temperature", "°C"],
    ["Fuel level", "fuel_level", "%"],
    ["Runtime", "runtime_seconds", ""],
  ];
  const format = (key, unit) =>
    r?.[key] !== undefined && r?.[key] !== null
      ? (key === "runtime_seconds"
          ? `${Math.floor(r[key] / 3600)}h ${Math.floor((r[key] % 3600) / 60)}m`
          : r[key]) + `<span>${unit}</span>`
      : unavailable(unit);
  return `<div class="page-heading"><div><div class="eyebrow">Overview</div><h1>Dashboard</h1><p>Monitor generator health and service status.</p></div><div class="date-label"><span class="status ${fresh && r?.status === "running" ? "running" : "warning"}">${connection}</span> ${new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div></div><div class="panel generator-bar"><div class="generator-identity"><div class="generator-symbol">${icons.bolt}</div><div><select id="generator-select" aria-label="Select generator">${state.generators.length ? state.generators.map((x) => `<option value="${x.generator_id}" ${x.generator_id === state.selected ? "selected" : ""}>${x.name}</option>`).join("") : "<option>No generators connected</option>"}</select><p>${g?.location || "No generator selected"}</p></div></div><span class="status ${fresh ? "running" : "warning"}">${fresh ? (r?.status || "UNKNOWN").toUpperCase() : "UNKNOWN"}</span></div><div class="connection-notice">${icons.info}<div><strong>${simulated ? "Simulated telemetry." : diagnosis.title + "."}</strong> ${state.demo ? "Values change automatically. Temperature and fuel alerts appear as toast messages every demo cycle. No database writes." : simulated ? "Test data, not physical generator measurements." : diagnosis.detail}</div></div><div class="readings-heading"><h2>${simulated ? "Simulated readings" : "Actual readings"}</h2><div class="timestamp">${icons.info} ${connection} · Refreshes every 1 second</div></div><div class="readings">${labels.map(([label, key, unit]) => `<article class="panel metric"><div class="metric-header"><h3>${label}</h3><span class="metric-icon">${icons[key === "runtime_seconds" ? "bolt" : "info"]}</span></div><div class="metric-value">${format(key, unit)}</div>${sparkline(state.history, key)}<div class="metric-footer">${icons.info} ${r?.recorded_at ? (fresh ? "Recorded: " : "Last known: ") + new Date(r.recorded_at).toLocaleString() : "No reading available"}</div></article>`).join("")}</div><div class="panel maintenance-strip"><div class="generator-symbol">${icons.wrench}</div><div><h3>Maintenance status</h3><p>${fresh ? "Based on active notifications for this generator." : "Cannot evaluate without a recent reading."}</p></div><span class="status ${!fresh || active.length ? "warning" : "normal"}">${health}</span></div><div class="footer"><span>Smart Generator Monitoring</span><span>Data status: ${connection}</span></div>`;
}

export function bindDashboard(render) {
  const genSelect = $("#generator-select");
  if (genSelect) {
    genSelect.addEventListener("change", (e) => {
      state.selected = state.demo ? e.target.value : Number(e.target.value);
      state.history = [];
      render();
    });
  }
}
