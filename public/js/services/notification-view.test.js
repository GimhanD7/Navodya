import test from "node:test";
import assert from "node:assert/strict";
import { filterNotifications, escapeHtml } from "./notification-view.js";

test("notification filters combine and prioritize active critical alerts", () => {
  const rows = [
    { title: "Fuel", generator_name: "North", detail: "warning", status: "active", created_at: "2026-10-19" },
    { title: "Temperature", generator_name: "South", detail: "critical", status: "active", created_at: "2026-10-18" },
    { title: "Temperature", generator_name: "North", detail: "critical", status: "resolved", created_at: "2026-10-20" },
  ];
  const filters = { search: "", status: "all", severity: "all", generator: "all", sort: "priority" };
  assert.deepEqual(filterNotifications(rows, filters), [rows[1], rows[0], rows[2]]);
  assert.deepEqual(filterNotifications(rows, { ...filters, status: "resolved", generator: "North", search: "TEMP", severity: "critical" }), [rows[2]]);
  assert.equal(filterNotifications(rows, { ...filters, search: "missing" }).length, 0);
  assert.equal(filterNotifications(rows, { ...filters, sort: "newest" })[0], rows[2]);
  assert.equal(escapeHtml('<img title="x">'), "&lt;img title=&quot;x&quot;&gt;");
});
