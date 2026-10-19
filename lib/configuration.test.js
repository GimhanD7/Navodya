import test from "node:test";
import assert from "node:assert/strict";
import { parseThresholds } from "./configuration.js";
import { defaults, parameterStatus } from "./status.js";

test("saved temperature limits trigger warning and critical alerts", () => {
  const saved = parseThresholds({ parameter: "temperature", warning_max: "70", critical_max: "90" });
  const limits = { ...defaults, temperatureWarning: saved.warning_max, temperatureCritical: saved.critical_max };
  assert.equal(parameterStatus("temperature", 69, limits), "normal");
  assert.equal(parameterStatus("temperature", 70, limits), "warning");
  assert.equal(parameterStatus("temperature", 90, limits), "critical");
});

test("threshold validation preserves zero and rejects invalid ranges and empty values", () => {
  assert.equal(parseThresholds({ parameter: "fuel", warning_min: 20, critical_min: 0 }).critical_min, 0);
  assert.throws(() => parseThresholds({ parameter: "fuel", warning_min: 101, critical_min: 5 }));
  assert.throws(() => parseThresholds({ parameter: "temperature", warning_max: "", critical_max: 95 }));
  assert.throws(() => parseThresholds({ parameter: "voltage", warning_min: 220, warning_max: 210, critical_min: 190, critical_max: 260 }));
  assert.throws(() => parseThresholds({ parameter: "constructor" }));
});
