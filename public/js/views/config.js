import { state } from "../state.js";

export function config() {
  const cfg = Object.fromEntries(state.config.map((x) => [x.parameter, x]));
  const card = (key, label, unit, fields) => {
    const c = cfg[key] || {};
    return `<form class="panel config-card config-form" data-parameter="${key}"><h2>${label}</h2><p class="range-description">Values are used by maintenance and notification checks.</p><div class="field-row">${fields.map(([name, prop]) => `<div class="field"><label>${name} ${unit}</label><input name="${prop}" type="number" step="0.01" value="${c[prop] ?? ""}" required></div>`).join("")}</div><div class="form-actions"><button class="button" type="submit">Save ${label}</button><span class="muted small config-message"></span></div></form>`;
  };
  return `<div class="page-heading"><div><div class="eyebrow">Administrator</div><h1>Configuration</h1><p>Central limits used by maintenance checks and notifications.</p></div></div><div class="config-grid">${card(
    "temperature",
    "Temperature",
    "°C",
    [
      ["Warning maximum", "warning_max"],
      ["Critical maximum", "critical_max"],
    ],
  )}${card("voltage", "Voltage", "V", [
    ["Warning minimum", "warning_min"],
    ["Warning maximum", "warning_max"],
    ["Critical minimum", "critical_min"],
    ["Critical maximum", "critical_max"],
  ])}${card("frequency", "Frequency", "Hz", [
    ["Warning minimum", "warning_min"],
    ["Warning maximum", "warning_max"],
    ["Critical minimum", "critical_min"],
    ["Critical maximum", "critical_max"],
  ])}${card("fuel", "Fuel", "%", [
    ["Warning minimum", "warning_min"],
    ["Critical minimum", "critical_min"],
  ])}<div class="panel config-card"><h2>Oil service</h2><p class="range-description">Service interval is currently fixed at 250 runtime hours.</p><div class="metric-value">250 <span>hours</span></div></div></div>`;
}
