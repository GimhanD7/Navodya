import { icons } from "../icons.js";
import { state } from "../state.js";

import { api } from "../api.js";
import { $, $$ } from "../icons.js";

export function notifications() {
  const hasActive = state.notifications.some(n => n.status === "active");
  const readAllButton = hasActive ? `<button id="read-all-button" class="button secondary">Resolve all</button>` : '';

  const errorMessage = state.notificationError ? `<p class="error" role="alert">Notifications could not be loaded. Retrying automatically; the list below may be out of date.</p>` : "";
  return `<div class="page-heading"><div><div class="eyebrow">Operational signals</div><h1>Notifications</h1><p>${state.demo ? "Simulated alerts from the live demo. No physical generator is connected." : "Alerts generated from actual readings and service reminders."}</p></div><div class="page-actions">${readAllButton}</div></div>${errorMessage}<p class="error" id="notification-action-error" role="alert"></p><div class="notifications">${state.notifications.length ? state.notifications.map((n) => `<article class="panel notification"><div class="metric-icon">${icons.bell}</div><div><h3>${n.title}</h3><p>${n.generator_name}<br>${n.detail}<br><span class="muted small">${new Date(n.created_at).toLocaleString()}</span></p></div><span class="status ${n.status === "active" ? "warning" : "resolved"}">${n.status}</span>${n.status === "active" ? `<button class="button secondary resolve-notification" data-id="${n.notification_id}">Resolve</button>` : ""}</article>`).join("") : `<div class="panel empty">${icons.bell}<h3>No notifications</h3><p>No alerts have been generated.</p></div>`}</div>`;
}

export function bindNotifications(render) {
  const resolve = async (id, button) => {
    if (state.notificationBusy) return;
    const user = state.user;
    state.notificationBusy = true;
    button.disabled = true;
    const label = button.textContent;
    button.textContent = "Resolving…";
    $("#notification-action-error").textContent = "";
    try {
      if (!state.demo) {
        await api(id ? "/api/notifications/" + encodeURIComponent(id) + "/resolve" : "/api/notifications/resolve-all", { method: "POST" });
      }
      if (state.user !== user) return;
      state.notificationRevision = (state.notificationRevision || 0) + 1;
      state.notifications.forEach(n => {
        if (!id || String(n.notification_id) === id) n.status = "resolved";
      });
      await render();
    } catch (error) {
      if (state.user !== user) return;
      const message = $("#notification-action-error");
      if (message) message.textContent = error.message || "Unable to resolve notification. Please try again.";
    } finally {
      state.notificationBusy = false;
      button.disabled = false;
      button.textContent = label;
    }
  };
  const all = $("#read-all-button");
  if (all) all.onclick = () => resolve(null, all);
  $$(".resolve-notification").forEach(button => {
    button.onclick = () => resolve(button.dataset.id, button);
  });
}
