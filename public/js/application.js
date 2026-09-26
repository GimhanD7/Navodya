import { startDemo } from "./services/demo.js";
import { $ } from "./icons.js";
import { api } from "./api.js";
import { state } from "./state.js";
import { shell, bindShell } from "./ui/shell.js";
import { login } from "./pages/login.js";
import { pages } from "./pages/index.js";
import { loadData } from "./services/data.js";
import { startLiveUpdates, syncNotifications } from "./services/live.js";

export async function render() {
  if (!state.user) {
    login(render);
    return;
  }
  document.body.innerHTML = shell();
  $("#content").innerHTML = '<div class="skeleton-message">Loading workspace…</div>';
  if (!state.demo) await loadData();
  syncNotifications(state.notifications, render);
  const page = pages[state.route] || pages.dashboard;
  $("#content").innerHTML = page.render();
  bindShell(render);
  page.bind?.(render);
}

export function start() {
  if (new URLSearchParams(window.location.search).get("demo") === "1") {
    startDemo();
    render();
  } else api("/api/session")
    .then((d) => {
      state.user = d.user;
      return render();
    })
    .catch(() => login(render));

  startLiveUpdates(() => {
    if (!["dashboard", "maintenance", "notifications"].includes(state.route)) return;
    const content = $("#content");
    if (!content || content.contains(document.activeElement)) return;
    const page = pages[state.route];
    content.innerHTML = page.render();
    page.bind?.(render);
  }, render);
}
