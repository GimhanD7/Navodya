export const defaults = Object.freeze({
  temperatureWarning: 85,
  temperatureCritical: 95,
  voltageWarningMin: 210,
  voltageWarningMax: 250,
  voltageCriticalMin: 190,
  voltageCriticalMax: 260,
  frequencyWarningMin: 49,
  frequencyWarningMax: 51,
  frequencyCriticalMin: 47,
  frequencyCriticalMax: 53,
  fuelWarning: 20,
  fuelCritical: 10,
  oilServiceInterval: 250,
});
export function parameterStatus(parameter, value, configuration = defaults) {
  if (value === null || value === undefined || !Number.isFinite(Number(value)))
    return "unavailable";
  const v = Number(value),
    c = configuration;
  if (parameter === "temperature")
    return v >= c.temperatureCritical
      ? "critical"
      : v >= c.temperatureWarning
        ? "warning"
        : "normal";
  if (parameter === "fuel")
    return v <= c.fuelCritical
      ? "critical"
      : v <= c.fuelWarning
        ? "warning"
        : "normal";
  if (parameter === "voltage" || parameter === "frequency")
    return v < c[parameter + "CriticalMin"] || v > c[parameter + "CriticalMax"]
      ? "critical"
      : v < c[parameter + "WarningMin"] || v > c[parameter + "WarningMax"]
        ? "warning"
        : "normal";
  return "unavailable";
}
export function validateConfiguration(c) {
  for (const key of Object.keys(defaults))
    if (typeof c[key] !== "number" || !Number.isFinite(c[key]))
      return `${key} must be a number.`;
  if (c.temperatureWarning >= c.temperatureCritical)
    return "Temperature warning must be below critical.";
  if (
    c.fuelCritical < 0 ||
    c.fuelWarning > 100 ||
    c.fuelCritical >= c.fuelWarning
  )
    return "Fuel limits must be between 0 and 100, with critical below warning.";
  if (c.oilServiceInterval <= 0)
    return "Oil service interval must be positive.";
  for (const p of ["voltage", "frequency"])
    if (
      c[p + "CriticalMin"] < 0 ||
      !(
        c[p + "CriticalMin"] < c[p + "WarningMin"] &&
        c[p + "WarningMin"] < c[p + "WarningMax"] &&
        c[p + "WarningMax"] < c[p + "CriticalMax"]
      )
    )
      return `${p} warning range must be inside the critical range.`;
  return null;
}
export function serviceProgress(
  runtimeSeconds,
  lastServiceRuntimeSeconds,
  intervalHours,
) {
  if (
    !Number.isFinite(runtimeSeconds) ||
    !Number.isFinite(lastServiceRuntimeSeconds) ||
    runtimeSeconds < lastServiceRuntimeSeconds ||
    intervalHours <= 0
  )
    return null;
  const hours = (runtimeSeconds - lastServiceRuntimeSeconds) / 3600;
  return {
    hours,
    intervalHours,
    remainingHours: Math.max(0, intervalHours - hours),
    overdueHours: Math.max(0, hours - intervalHours),
    percent: Math.min(100, (hours / intervalHours) * 100),
  };
}
