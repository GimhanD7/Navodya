export function createNotificationTracker() {
  let seen = null;
  return {
    reset() { seen = null; },
    update(rows) {
      const ids = new Set(rows.map(row => String(row.notification_id)));
      const fresh = seen === null ? [] : rows.filter(row =>
        !seen.has(String(row.notification_id)) && row.status === "active");
      seen = new Set([...(seen || []), ...ids]);
      return fresh.reverse();
    },
  };
}
