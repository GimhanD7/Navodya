import test from "node:test";
import assert from "node:assert/strict";
import {
  parameterStatus,
  serviceProgress,
  validateConfiguration,
} from "./status.js";
test("threshold evaluation prioritizes critical and handles lower fuel limits", () => {
  assert.equal(parameterStatus("temperature", 96), "critical");
  assert.equal(parameterStatus("temperature", 86), "warning");
  assert.equal(parameterStatus("fuel", 9), "critical");
  assert.equal(parameterStatus("fuel", 19), "warning");
  assert.equal(parameterStatus("voltage", 230), "normal");
});
test("missing measurements remain unavailable", () =>
  assert.equal(parameterStatus("frequency", null), "unavailable"));
test("service progress uses runtime delta", () => {
  const p = serviceProgress(250 * 3600, 243 * 3600, 250);
  assert.equal(p.hours, 7);
  assert.equal(p.remainingHours, 243);
});
test("configuration validation rejects inverted ranges", () =>
  assert.match(
    validateConfiguration({
      temperatureWarning: 95,
      temperatureCritical: 85,
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
    }),
    /Temperature/,
  ));
