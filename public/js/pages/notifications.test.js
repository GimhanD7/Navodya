import test from "node:test";
import assert from "node:assert/strict";
import { bindNotifications } from "./notifications.js";
import { state } from "../state.js";

test("resolve preserves active alerts on failure and updates only the selected alert on success", async () => {
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const all = { textContent: "Resolve all" };
  const one = { textContent: "Resolve", dataset: { id: "1" } };
  const message = { textContent: "" };
  let renders = 0;
  globalThis.document = {
    querySelector: selector => selector === "#read-all-button" ? all : message,
    querySelectorAll: () => [one],
  };
  state.user = { id: 1 };
  state.demo = false;
  state.notifications = [{ notification_id: 1, status: "active" }, { notification_id: 2, status: "active" }];
  try {
    globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({ error: "Database unavailable" }) });
    bindNotifications(async () => { renders++; });
    await all.onclick();
    assert.ok(state.notifications.every(n => n.status === "active"));
    assert.equal(message.textContent, "Database unavailable");
    assert.equal(all.disabled, false);
    assert.equal(renders, 0);
    globalThis.fetch = async url => {
      assert.equal(url, "/api/notifications/1/resolve");
      return { ok: true, json: async () => ({ success: true }) };
    };
    await one.onclick();
    assert.equal(state.notifications[0].status, "resolved");
    assert.equal(state.notifications[1].status, "active");
    assert.equal(renders, 1);
    assert.equal(state.notificationBusy, false);
  } finally {
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
  }
});
