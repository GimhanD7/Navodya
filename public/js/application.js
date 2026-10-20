import { startDemo } from "./services/demo.js";
import { $ } from "./icons.js";
import { api } from "./api.js";
import { state } from "./state.js";
import { shell, bindShell } from "./ui/shell.js";
import { login } from "./pages/login.js";
import { pages } from "./pages/index.js";
import { loadData } from "./services/data.js";
import { startLiveUpdates, syncNotifications } from "./services/live.js";

const titles = {
  dashboard: "Dashboard",
  reports: "Reports",
  users: "Users",
  generators: "Generators",
  maintenance: "Maintenance",
  notifications: "Notifications",
  configuration: "Configuration",
};

// Read the page name from the URL path (e.g. /notifications), with #hash fallback.
function routeFromLocation() {
  const fromPath = window.location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  const fromHash = window.location.hash.replace(/^#\/?/, "");
  const route = fromPath || fromHash || "dashboard";
  return titles[route] ? route : "dashboard";
}

// Keep the browser URL in sync with the current page.
function syncUrl(route, replace) {
  const target = "/" + route + window.location.search;
  document.title = `${titles[route] || "Dashboard"} · Generator System`;
  if (window.location.pathname + window.location.search === target && !window.location.hash) return;
  window.history[replace ? "replaceState" : "pushState"]({ route }, "", target);
}

let firstRender = true;

export async function render() {
  if (!state.user) {
    login(render);
    return;
  }
  document.body.innerHTML = shell();
  $("#content").innerHTML = '<div class="skeleton-message">Loading workspace…</div>';
  if (!state.demo) await loadData();
  if (!state.notificationError) syncNotifications(state.notifications, render);
  
  const allowed =
    state.user?.role === "admin"
      ? ["dashboard", "reports", "users", "generators", "maintenance", "notifications", "configuration"]
      : state.user?.role === "operator"
        ? ["dashboard", "generators", "maintenance", "notifications"]
        : ["dashboard", "maintenance", "notifications"];

  // Initial load and permission redirects replace the history entry; navigation pushes a new one.
  let replace = firstRender;
  firstRender = false;
  if (!allowed.includes(state.route)) {
    state.route = "dashboard";
    replace = true;
  }
  syncUrl(state.route, replace);

  const page = pages[state.route] || pages.dashboard;
  $("#content").innerHTML = page.render();
  bindShell(render);
  page.bind?.(render);
}

export function start() {
  // Restore the page from the URL so a refresh stays on the same page.
  state.route = routeFromLocation();
  window.addEventListener("popstate", () => {
    state.route = routeFromLocation();
    if (state.user) render();
  });

  if (new URLSearchParams(window.location.search).get("demo") === "1") {
    startDemo();
    state.route = routeFromLocation();
    render();
  } else api("/api/session")
    .then((d) => {
      state.user = d.user;
      return render();
    })
    .catch(() => login(render));

  startLiveUpdates(() => {
    if (state.notificationBusy && state.route === "notifications") return;
    if (!["dashboard", "maintenance", "notifications"].includes(state.route)) return;
    const content = $("#content");
    if (!content || content.contains(document.activeElement)) return;
    const page = pages[state.route];
    if (page.update) {
      page.update(render);
    } else {
      content.innerHTML = page.render();
      page.bind?.(render);
    }
  }, render);
}
