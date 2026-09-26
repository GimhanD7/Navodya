import test from "node:test";
import assert from "node:assert/strict";
import { startDemo, updateDemo } from "./demo.js";
import { state } from "../state.js";

test("demo readings advance and alternate temperature/fuel warnings with recovery", () => {
  startDemo();
  const start = new Date(state.reading.recorded_at).getTime();
  assert.equal(state.reading.source, "browser-demo");
  assert.equal(state.notifications.length, 0);
  updateDemo(start + 11000);
  assert.ok(Number(state.reading.temperature) > 85);
  assert.equal(state.notifications[0].status, "active");
  assert.equal(state.reading.runtime_seconds, 154211);
  updateDemo(start + 12000);
  assert.equal(state.notifications.length, 1);
  updateDemo(start + 21000);
  assert.equal(state.reading.fuel_level, 18);
  assert.equal(state.notifications.length, 2);
  assert.equal(state.notifications[1].status, "resolved");
  updateDemo(start + 31000);
  assert.ok(state.notifications.every(n => n.status === "resolved"));
  startDemo();
  assert.equal(state.notifications.length, 0);
});
