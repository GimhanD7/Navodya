import { icons } from "../icons.js";
import { state } from "../state.js";

import { api } from "../api.js";
import { $ } from "../icons.js";

export function notifications() {
  const hasActive = state.notifications.some(n => n.status === "active");
  const readAllButton = hasActive ? `<button id="read-all-button" class="button secondary">Mark all as read</button>` : '';

  return `<div class="page-heading"><div><div class="eyebrow">Operational signals</div><h1>Notifications</h1><p>${state.demo ? "Simulated alerts from the live demo. No physical generator is connected." : "Alerts generated from actual readings and service reminders."}</p></div><div class="page-actions">${readAllButton}</div></div><div class="notifications">${state.notifications.length ? state.notifications.map((n) => `<article class="panel notification"><div class="metric-icon">${icons.bell}</div><div><h3>${n.title}</h3><p>${n.generator_name}<br>${n.detail}<br><span class="muted small">${new Date(n.created_at).toLocaleString()}</span></p></div><span class="status ${n.status === "active" ? "warning" : "resolved"}">${n.status}</span></article>`).join("") : `<div class="panel empty">${icons.bell}<h3>No notifications</h3><p>No alerts have been generated.</p></div>`}</div>`;
}

export function bindNotifications(render) {
  const btn = $("#read-all-button");
  if (btn) {
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = "Marking...";
      if (!state.demo) {
        try {
          await api("/api/notifications/resolve-all", { method: "POST" });
        } catch (e) {
          console.error(e);
        }
      }
      state.notifications.forEach(n => n.status = "resolved");
      render();
    };
  }
}
