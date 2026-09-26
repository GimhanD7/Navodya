import { $ } from "../icons.js";
import { icons } from "../icons.js";
import { state } from "../state.js";

const unavailable = (unit) =>
  `<span class="unavailable">—</span><span>${unit}</span>`;

export function dashboard() {
  const g = state.generators.find((x) => x.generator_id === state.selected),
    r = state.reading;
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
  return `<div class="page-heading"><div><div class="eyebrow">Overview</div><h1>Dashboard</h1><p>Monitor generator health and service status.</p></div><div class="date-label">${new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div></div><div class="panel generator-bar"><div class="generator-identity"><div class="generator-symbol">${icons.bolt}</div><div><select id="generator-select" aria-label="Select generator">${state.generators.length ? state.generators.map((x) => `<option value="${x.generator_id}" ${x.generator_id === state.selected ? "selected" : ""}>${x.name}</option>`).join("") : "<option>No generators connected</option>"}</select><p>${g?.location || "No generator selected"}</p></div></div><span class="status running">${r?.status?.toUpperCase() || "UNAVAILABLE"}</span></div><div class="readings-heading"><h2>Actual readings</h2><div class="timestamp">${icons.info} ${r?.source === "seed-demo" ? "Seeded test telemetry" : "No telemetry source connected"}</div></div><div class="readings">${labels.map(([label, key, unit]) => `<article class="panel metric"><div class="metric-header"><h3>${label}</h3><span class="metric-icon">${icons[key === "runtime_seconds" ? "bolt" : "info"]}</span></div><div class="metric-value">${format(key, unit)}</div><div class="metric-footer">${icons.info} ${r?.recorded_at ? new Date(r.recorded_at).toLocaleString() : "Awaiting actual reading"}</div></article>`).join("")}</div><div class="panel maintenance-strip"><div class="generator-symbol">${icons.wrench}</div><div><h3>Maintenance status</h3><p>${r ? "Based on latest available telemetry." : "Cannot evaluate until actual readings are available."}</p></div><span class="status normal">${r ? "NORMAL" : "UNAVAILABLE"}</span></div><div class="connection-notice">${icons.info}<div><strong>${r?.source === "seed-demo" ? "Demo telemetry is active." : "Telemetry connection required."}</strong> ${r?.source === "seed-demo" ? "These readings were seeded for dashboard testing and can be replaced with device data." : "The database contains no live measurement source yet."}</div></div><div class="footer"><span>Smart Generator Monitoring</span><span>Data status: ${r ? "reading available" : "awaiting telemetry"}</span></div>`;
}

export function bindDashboard(render) {
  const genSelect = $("#generator-select");
  if (genSelect) {
    genSelect.addEventListener("change", (e) => {
      state.selected = Number(e.target.value);
      render();
    });
  }
}
