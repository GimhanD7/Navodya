export function parseThresholds(body) {
  const fields = {
    temperature: ["warning_max", "critical_max"],
    fuel: ["warning_min", "critical_min"],
    voltage: ["warning_min", "warning_max", "critical_min", "critical_max"],
    frequency: ["warning_min", "warning_max", "critical_min", "critical_max"],
  };
  if (!Object.hasOwn(fields, body.parameter)) throw new Error("Invalid parameter.");
  const result = { parameter: body.parameter, warning_min: null, warning_max: null, critical_min: null, critical_max: null };
  for (const field of fields[body.parameter]) {
    const raw = body[field];
    if ((typeof raw !== "number" && typeof raw !== "string") || String(raw).trim() === "" || !Number.isFinite(Number(raw))) throw new Error("Enter a valid number for every threshold.");
    result[field] = Number(raw);
  }
  const { warning_min: wmin, warning_max: wmax, critical_min: cmin, critical_max: cmax } = result;
  if (body.parameter === "temperature" && wmax >= cmax) throw new Error("Warning maximum must be below critical maximum.");
  if (body.parameter === "fuel" && !(0 <= cmin && cmin < wmin && wmin <= 100)) throw new Error("Fuel thresholds must be between 0 and 100, with critical below warning.");
  if (["voltage", "frequency"].includes(body.parameter) && !(0 <= cmin && cmin < wmin && wmin < wmax && wmax < cmax)) throw new Error("Warning range must be inside the critical range.");
  return result;
}
