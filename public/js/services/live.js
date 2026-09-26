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
    try {
      const [notifications, reading] = await Promise.allSettled([
        api("/api/notifications"),
        selected ? api("/api/generators/" + selected + "/latest") : Promise.resolve({ reading: null }),
      ]);
      if (state.user !== user) return;
      if (notifications.status === "fulfilled") syncNotifications(notifications.value.rows || [], render);
      state.liveError = reading.status === "rejected" ? "Connection interrupted — retrying…" : "";
      if (selected === state.selected && reading.status === "fulfilled") state.reading = reading.value.reading;
      refresh();
    } finally { busy = false; }
  }, 2000);
  return () => clearInterval(timer);
}
