import test from "node:test";
import assert from "node:assert/strict";
import { createNotificationTracker } from "./notification-tracker.js";

test("notification polling ignores history, emits new active alerts once, and resets for a new session", () => {
  const tracker = createNotificationTracker();
  const old = { notification_id: 1, status: "active" };
  const fresh = { notification_id: 2, status: "active" };
  const resolved = { notification_id: 3, status: "resolved" };
  assert.deepEqual(tracker.update([old]), []);
  assert.deepEqual(tracker.update([resolved, fresh, old]), [fresh]);
  assert.deepEqual(tracker.update([fresh, old]), []);
  tracker.update([]);
  assert.deepEqual(tracker.update([old]), []);
  tracker.reset();
  assert.deepEqual(tracker.update([fresh, old]), []);
});
