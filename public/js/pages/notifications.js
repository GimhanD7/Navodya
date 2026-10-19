import { icons, $, $$ } from "../icons.js";
import { state } from "../state.js";
import { api } from "../api.js";
import { escapeHtml as esc, filterNotifications, severity } from "../services/notification-view.js";

const filters = { search: "", status: "all", severity: "all", generator: "all", sort: "priority" };
let owner;
const options = (values, selected) => values.map(([value, label]) => `<option value="${esc(value)}" ${selected === value ? "selected" : ""}>${esc(label)}</option>`).join("");

function results() {
  const rows = filterNotifications(state.notifications, filters);
  return `<div class="notification-result-heading"><h2>Alert activity</h2><span class="muted small" role="status">${rows.length} of ${state.notifications.length} loaded alerts</span></div>
    <div class="notifications">${rows.length ? rows.map(n => {
      const level = severity(n);
      const date = new Date(n.created_at);
      return `<article class="panel alert-card ${n.status === "active" ? level : "resolved"}">
        <div class="alert-symbol">${icons.bell}</div>
        <div class="alert-body"><div class="alert-labels"><span class="status ${n.status === "active" ? "warning" : "resolved"}">${esc(n.status)}</span><span class="alert-severity">${level}</span></div>
        <h3>${esc(n.title)}</h3><p>${esc(n.detail)}</p><div class="alert-meta"><strong>${esc(n.generator_name)}</strong><span>${Number.isNaN(date.getTime()) ? "Time unavailable" : esc(date.toLocaleString())}</span></div></div>
        ${n.status === "active" ? `<button class="button secondary resolve-notification" data-id="${esc(n.notification_id)}" aria-label="Resolve ${esc(n.title)}">Resolve</button>` : '<span class="alert-resolved">Resolved</span>'}
      </article>`;
    }).join("") : `<div class="panel empty">${icons.bell}<h3>${state.notificationError ? "Notifications unavailable" : state.notifications.length ? "No matching notifications" : "No notifications yet"}</h3><p>${state.notificationError ? "We are retrying the connection automatically." : state.notifications.length ? "Change your search or filters to see more alerts." : "New generator alerts will appear here automatically."}</p></div>`}</div>`;
}

export function notifications() {
  if (owner !== state.user) { Object.assign(filters, { search: "", status: "all", severity: "all", generator: "all", sort: "priority" }); owner = state.user; }
  const active = state.notifications.filter(n => n.status === "active");
  const critical = active.filter(n => severity(n) === "critical").length;
  const resolved = state.notifications.filter(n => n.status === "resolved").length;
  const generators = [...new Set(state.notifications.map(n => n.generator_name).filter(Boolean))].sort();
  return `<section class="notification-center"><div class="page-heading"><div><div class="eyebrow">Operations inbox</div><h1>Notifications</h1><p>${state.demo ? "Simulated generator alerts. No physical device is connected." : "Review generator alerts, investigate issues, and resolve them."}</p></div><button id="read-all-button" class="button secondary" ${!active.length || state.notificationError ? "disabled" : ""}>Resolve all active</button></div>
    <div class="alert-summary"><div class="panel"><span>Active alerts</span><strong>${active.length}</strong><small>Need your attention</small></div><div class="panel"><span>Critical active</span><strong>${critical}</strong><small>Review these first</small></div><div class="panel"><span>Resolved</span><strong>${resolved}</strong><small>Within loaded history</small></div></div>
    <div class="alert-connection ${state.notificationError ? "error" : ""}" role="status">${state.notificationError ? "Connection interrupted. Retrying automatically; displayed alerts may be out of date." : "Automatic updates enabled · Latest 100 notifications"}</div>
    <div class="panel alert-filters"><label class="alert-search">Search<input id="notification-search" type="search" placeholder="Search alerts or generators…" value="${esc(filters.search)}"></label>
    <label>Status<select id="notification-status">${options([["all","All statuses"],["active","Active"],["resolved","Resolved"]], filters.status)}</select></label>
    <label>Severity<select id="notification-severity">${options([["all","All severities"],["critical","Critical"],["warning","Warning"],["notice","Notice"]], filters.severity)}</select></label>
    <label>Generator<select id="notification-generator">${options([["all","All generators"],...generators.map(n => [n,n])], filters.generator)}</select></label>
    <label>Sort<select id="notification-sort">${options([["priority","Active & critical first"],["newest","Newest first"]], filters.sort)}</select></label><button class="button secondary" id="notification-reset">Clear filters</button></div>
    <p class="error" id="notification-action-error" role="alert"></p><div id="notification-results">${results()}</div>
    <p class="muted small">Resolving an alert records your acknowledgement. Check the generator to confirm the underlying issue is fixed.</p></section>`;
}

export function bindNotifications(render) {
  const updateResults = () => { $("#notification-results").innerHTML = results(); bindActions(render); };
  const search = $("#notification-search");
  if (search) search.oninput = () => { filters.search = search.value; updateResults(); };
  for (const key of ["status", "severity", "generator", "sort"]) {
    const select = $("#notification-" + key);
    if (select) select.onchange = () => { filters[key] = select.value; updateResults(); };
  }
  const reset = $("#notification-reset");
  if (reset) reset.onclick = () => { Object.assign(filters, { search: "", status: "all", severity: "all", generator: "all", sort: "priority" }); render(); };
  bindActions(render);
}

function bindActions(render) {
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
