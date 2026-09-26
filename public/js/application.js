import { $ } from "./icons.js";
import { api } from "./api.js";
import { state } from "./state.js";
import { shell, bindShell } from "./ui/shell.js";
import { login } from "./pages/login.js";
import { pages } from "./pages/index.js";
import { loadData } from "./services/data.js";

export async function render() {
  if (!state.user) {
    login(render);
    return;
  }
  document.body.innerHTML = shell();
  $("#content").innerHTML = '<div class="skeleton-message">Loading workspace…</div>';
  await loadData();
  const page = pages[state.route] || pages.dashboard;
  $("#content").innerHTML = page.render();
  bindShell(render);
  page.bind?.(render);
}

export function start() {
  api("/api/session")
    .then((d) => {
      state.user = d.user;
      return render();
    })
    .catch(() => login(render));

  setInterval(async () => {
    if (state.user && state.route === "dashboard" && state.selected) {
      const selected = state.selected;
      try {
        const result = await api("/api/generators/" + selected + "/latest");
        if (!state.user || state.route !== "dashboard" || state.selected !== selected) return;
        state.reading = result.reading;
        const content = $("#content");
        if (content) {
          content.innerHTML = pages.dashboard.render();
          pages.dashboard.bind(render);
        }
      } catch {
        /* Retry on the next polling interval. */
      }
    }
  }, 1000);
}
