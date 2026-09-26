export function telemetryStatus({ reading, error, hasGenerator }, now = Date.now()) {
  if (error) {
    const titles = { DATABASE_UNAVAILABLE: "Database not connected", TELEMETRY_QUERY_FAILED: "Unable to read generator data", SESSION_EXPIRED: "Please sign in again" };
    return { title: titles[error.code] || "Server connection unavailable", detail: error.code ? error.message : "Cannot reach the server. Check your internet connection. Retrying automatically.", available: false };
  }
  if (!hasGenerator) return { title: "No generator configured", detail: "The database is reachable, but no generator is available. Add a generator before connecting telemetry.", available: false };
  if (!reading) return { title: "No readings received", detail: "The database is connected, but this generator has no readings. Check the device, power supply, and telemetry sender. Its running status is unknown.", available: false };
  const age = reading.age_seconds !== undefined ? Number(reading.age_seconds) * 1000 : now - new Date(reading.recorded_at).getTime();
  if (!Number.isFinite(age) || age < -30000) return { title: "Reading timestamp mismatch", detail: "The reading time is invalid or ahead of the database clock. Check the device and database time zones. Current generator status cannot be verified.", available: false };
  if (age >= 30000) return { title: "Readings have stopped updating", detail: "The database is connected, but the latest reading is older than 30 seconds. Check the device connection and telemetry sender. This does not confirm that the generator has stopped.", available: false };
  const status = String(reading.status || "").toLowerCase();
  if (["stopped", "off", "idle"].includes(status)) return { title: "Generator reported " + status, detail: "Recent telemetry is arriving. The device reports " + status + ". Telemetry alone does not explain why it is not running.", available: true };
  if (["fault", "error", "failed"].includes(status)) return { title: "Generator reports a fault", detail: "Recent telemetry is arriving with a fault status. Check the generator controller for the fault code.", available: true };
  return { title: status === "running" ? "Generator running" : "Readings received — status unknown", detail: status === "running" ? "The database is connected and recent telemetry reports the generator running." : "Recent readings are available, but the device has not reported a recognized operating status.", available: true };
}
