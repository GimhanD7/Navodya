import test from "node:test";
import assert from "node:assert/strict";
import { telemetryStatus } from "./telemetry-status.js";

test("diagnoses database, missing, stale, clock, and reported operating states separately", () => {
  const diagnose = (reading, error) => telemetryStatus({ reading, error, hasGenerator: true });
  assert.equal(diagnose(null, { code: "DATABASE_UNAVAILABLE" }).title, "Database not connected");
  assert.equal(diagnose(null, { code: "TELEMETRY_QUERY_FAILED" }).title, "Unable to read generator data");
  assert.equal(diagnose(null).title, "No readings received");
  assert.equal(diagnose({ age_seconds: 90, status: "running" }).available, false);
  assert.equal(diagnose({ age_seconds: -8000, status: "running" }).title, "Reading timestamp mismatch");
  assert.equal(diagnose({ age_seconds: 2, status: "stopped" }).title, "Generator reported stopped");
  assert.equal(diagnose({ age_seconds: 2, status: "running" }).title, "Generator running");
  assert.equal(diagnose({ age_seconds: 2, status: "running" }, { code: "DATABASE_UNAVAILABLE" }).available, false);
});
