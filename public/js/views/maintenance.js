import { state } from "../state.js";

export function maintenance() {
  const r = state.reading,
    c = Object.fromEntries(state.config.map((x) => [x.parameter, x]));
  const checks = [
    [
      "Temperature",
      "temperature",
      "°C",
      c.temperature?.warning_max,
      c.temperature?.critical_max,
    ],
    [
      "Voltage",
      "voltage",
      "V",
      c.voltage?.warning_min + "–" + c.voltage?.warning_max,
      c.voltage?.critical_min + "–" + c.voltage?.critical_max,
    ],
    [
      "Frequency",
      "frequency",
      "Hz",
      c.frequency?.warning_min + "–" + c.frequency?.warning_max,
      c.frequency?.critical_min + "–" + c.frequency?.critical_max,
    ],
    [
      "Fuel level",
      "fuel_level",
      "%",
      c.fuel?.warning_min,
      c.fuel?.critical_min,
    ],
  ];
  const value = (key) => r?.[key] ?? null;
  const status = (key, v) => {
    if (v === null) return ["Unavailable", ""];
    if (key === "temperature")
      return v >= Number(c.temperature?.critical_max)
        ? ["Critical", "critical"]
        : v >= Number(c.temperature?.warning_max)
          ? ["Warning", "warning"]
          : ["Normal", "normal"];
    if (key === "fuel_level")
      return v <= Number(c.fuel?.critical_min)
        ? ["Critical", "critical"]
        : v <= Number(c.fuel?.warning_min)
          ? ["Warning", "warning"]
          : ["Normal", "normal"];
    const x = c[key];
    if (!x) return ["Normal", "normal"];
    return v < Number(x.critical_min) || v > Number(x.critical_max)
      ? ["Critical", "critical"]
      : v < Number(x.warning_min) || v > Number(x.warning_max)
        ? ["Warning", "warning"]
        : ["Normal", "normal"];
  };
  const cards = checks
    .map(([label, key, unit, warn, crit]) => {
      const v = value(key),
        s = status(key, v);
      return `<article class="panel config-card"><div class="metric-header"><h2>${label}</h2><span class="status ${s[1]}">${s[0]}</span></div><div class="metric-value">${v === null ? "—" : v}<span>${unit}</span></div><p class="muted small">Warning: ${warn ?? "—"} · Critical: ${crit ?? "—"}</p></article>`;
    })
    .join("");
  const runtime = r?.runtime_seconds ?? null;
  const hours = runtime === null ? null : runtime / 3600;
  const interval = 250;
  const progress =
    hours === null ? 0 : Math.min(100, ((hours % interval) / interval) * 100);
  return `<div class="page-heading"><div><div class="eyebrow">Service planning</div><h1>Maintenance</h1><p>Live condition checks use the central configuration.</p></div></div><div class="readings">${cards}</div><div class="maintenance-layout"><div class="panel"><div class="section-header"><div><h2>Maintenance status</h2><p>${r ? "Based on the latest reading." : "Waiting for telemetry."}</p></div></div><div class="service-body"><div class="metric-value">${hours === null ? "—" : hours.toFixed(1)} <span>runtime hours</span></div><progress value="${progress}" max="100"></progress><div class="service-caption"><span>${hours === null ? "Runtime unavailable" : `${(interval - (hours % interval)).toFixed(1)} hours until service`}</span><span>${interval} hour interval</span></div></div></div></div>`;
}
