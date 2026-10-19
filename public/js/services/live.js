import { updateDemo } from "./demo.js";
import { api } from "../api.js";
import { state } from "../state.js";
import { createNotificationTracker } from "./notification-tracker.js";
import { showToast } from "../ui/toasts.js";

const tracker = createNotificationTracker();
let owner = null;

export function syncNotifications(rows, render) {
  if (owner !== state.user) { tracker.reset(); owner = state.user; }
  state.notifications = rows;
  const fresh = tracker.update(rows);
  for (const notification of fresh.slice(-4)) {
    showToast(notification, () => { state.route = "notifications"; render(); });
  }
  const badge = document.querySelector("#notification-count");
  if (badge) {
    const count = rows.filter(row => row.status === "active").length;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  }
}

export function startLiveUpdates(refresh, render) {
  let busy = false;
  const timer = setInterval(async () => {
    if (busy || !state.user) return;
    if (state.demo) {
      updateDemo();
      syncNotifications(state.notifications, render);
      refresh();
      return;
    }
    busy = true;
    const user = state.user;
    const selected = state.selected;
    const notificationRevision = state.notificationRevision || 0;
    try {
      const [notifications, reading, generators] = await Promise.allSettled([
        api("/api/notifications"),
        selected ? api("/api/generators/" + selected + "/latest") : Promise.resolve({ reading: null }),
        state.generatorError || !selected ? api("/api/generators") : Promise.resolve(null),
      ]);
      if (state.user !== user) return;
      if (generators.status === "fulfilled" && generators.value) {
        state.generators = generators.value.rows || [];
        state.generatorError = null;
        state.selected ??= state.generators[0]?.generator_id;
      } else if (generators.status === "rejected") state.generatorError = generators.reason;
      if (!state.notificationBusy && notificationRevision === (state.notificationRevision || 0)) {
        if (notifications.status === "fulfilled") {
          state.notificationError = null;
          syncNotifications(notifications.value.rows || [], render);
        } else state.notificationError = notifications.reason;
      }
      if (selected === state.selected) state.telemetryError = reading.status === "rejected" ? reading.reason : null;
      if (selected === state.selected && reading.status === "fulfilled") {
        const newReading = reading.value.reading;
        if (newReading && (!state.reading || state.reading.recorded_at !== newReading.recorded_at)) {
          state.history.push(newReading);
          if (state.history.length > 30) state.history.shift();
        }
        state.reading = newReading;
      }
      refresh();
    } finally { busy = false; }
  }, 1000);
  return () => clearInterval(timer);
}
