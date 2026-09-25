import { icons } from "../icons.js";
import { state } from "../state.js";

export function shell() {
  return `<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark">${icons.bolt}</div><div>Generator System<small>Monitoring platform</small></div></div><div class="nav-caption">Workspace</div><nav class="nav">${[
    ["dashboard", "Dashboard", "grid"],
    ["users", "Users", "users"],
    ["generators", "Generators", "bolt"],
    ["maintenance", "Maintenance", "wrench"],
    ["notifications", "Notifications", "bell"],
    ["configuration", "Configuration", "gear"],
  ]
    .map(
      ([r, l, i]) =>
        `<a href="#${r}" class="${state.route === r ? "active" : ""}" data-route="${r}">${icons[i]}<span>${l}</span></a>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-bottom"><div class="sidebar-note">Live readings appear here when the telemetry source is connected.</div><button class="logout" id="logout">${icons.logout}<span>Log out</span></button></div></aside><section class="main"><header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" id="mobile-menu" aria-label="Open menu">${icons.menu}</button><div class="breadcrumb"><span>Workspace</span><span>›</span><span>${state.route[0].toUpperCase() + state.route.slice(1)}</span></div></div><div class="topbar-right"><button class="icon-button" title="Notifications">${icons.bell}</button><div class="account"><div class="avatar">${(state.user?.name || "A").slice(0, 1).toUpperCase()}</div><div><strong>${state.user?.name || "Admin"}</strong><small>${state.user?.role || "Administrator"}</small></div></div></div></header><main class="content" id="content"></main></section></div>`;
}
