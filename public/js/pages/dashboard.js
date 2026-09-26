import { $ } from "../icons.js";
import { icons } from "../icons.js";
import { state } from "../state.js";

const unavailable = (unit) =>
  `<span class="unavailable">—</span><span>${unit}</span>`;

export function dashboard() {
  const g = state.generators.find((x) => x.generator_id === state.selected),
    r = state.reading;
  const simulated = ["seed-demo", "test-simulator", "browser-demo"].includes(r?.source);
  const age = r?.recorded_at ? Date.now() - new Date(r.recorded_at).getTime() : Infinity;
  const fresh = Number.isFinite(age) && age < 30000;
  const connection = state.liveError ? "Reconnecting" : !r ? "Awaiting telemetry" : !fresh ? "Stale reading" : simulated ? "Live demo" : "Live readings";
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
  return `<div class="page-heading"><div><div class="eyebrow">Overview</div><h1>Dashboard</h1><p>Monitor generator health and service status.</p></div><div class="date-label"><span class="status ${fresh && !state.liveError ? "running" : "warning"}">${connection}</span> ${new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div></div><div class="panel generator-bar"><div class="generator-identity"><div class="generator-symbol">${icons.bolt}</div><div><select id="generator-select" aria-label="Select generator">${state.generators.length ? state.generators.map((x) => `<option value="${x.generator_id}" ${x.generator_id === state.selected ? "selected" : ""}>${x.name}</option>`).join("") : "<option>No generators connected</option>"}</select><p>${g?.location || "No generator selected"}</p></div></div><span class="status ${fresh ? "running" : "warning"}">${fresh ? r?.status?.toUpperCase() : "UNAVAILABLE"}</span></div><div class="readings-heading"><h2>${simulated ? "Simulated readings" : "Actual readings"}</h2><div class="timestamp">${icons.info} ${connection} · Refreshes every 2 seconds</div></div><div class="readings">${labels.map(([label, key, unit]) => `<article class="panel metric"><div class="metric-header"><h3>${label}</h3><span class="metric-icon">${icons[key === "runtime_seconds" ? "bolt" : "info"]}</span></div><div class="metric-value">${format(key, unit)}</div><div class="metric-footer">${icons.info} ${r?.recorded_at ? new Date(r.recorded_at).toLocaleString() : "Awaiting actual reading"}</div></article>`).join("")}</div><div class="panel maintenance-strip"><div class="generator-symbol">${icons.wrench}</div><div><h3>Maintenance status</h3><p>${fresh ? "Based on active notifications for this generator." : "Cannot evaluate without a recent reading."}</p></div><span class="status ${active.length ? "warning" : "normal"}">${health}</span></div><div class="connection-notice">${icons.info}<div><strong>${simulated ? "Simulated telemetry." : connection + "."}</strong> ${state.demo ? "Values change automatically. Temperature and fuel alerts appear as toast messages every demo cycle. No database writes." : simulated ? "Test data, not physical generator measurements." : "New notifications appear automatically. Readings older than 30 seconds are marked stale."}</div></div><div class="footer"><span>Smart Generator Monitoring</span><span>Data status: ${r ? "reading available" : "awaiting telemetry"}</span></div>`;
}

export function bindDashboard(render) {
  const genSelect = $("#generator-select");
  if (genSelect) {
    genSelect.addEventListener("change", (e) => {
      state.selected = state.demo ? e.target.value : Number(e.target.value);
      render();
    });
  }
}
