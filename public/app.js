import { $, $$ } from "./js/icons.js";
import { api } from "./js/api.js";
import { state } from "./js/state.js";
import { shell } from "./js/ui/shell.js";
import { login } from "./js/ui/login.js";
import { dashboard } from "./js/views/dashboard.js";
import { users } from "./js/views/users.js";
import { generators } from "./js/views/generators.js";
import { maintenance } from "./js/views/maintenance.js";
import { notifications } from "./js/views/notifications.js";
import { config } from "./js/views/config.js";

async function data() {
  try {
    const requests = [api("/api/generators"), api("/api/notifications")];
    if (state.route === "users" && state.user?.role === "admin")
      requests.push(api("/api/users"));
    if (state.route === "configuration" || state.route === "maintenance")
      requests.push(api("/api/config"));
    const [g, n, ...optional] = await Promise.all(requests);
    state.generators = g.rows || [];
    state.notifications = n.rows || [];
    let index = 0;
    if (state.route === "users" && state.user?.role === "admin")
      state.users = optional[index++]?.rows || [];
    if (state.route === "configuration" || state.route === "maintenance")
      state.config = optional[index++]?.rows || [];
    state.selected ??= state.generators[0]?.generator_id;
    if (state.selected)
      state.reading = (
        await api("/api/generators/" + state.selected + "/latest")
      ).reading;
  } catch (e) {
    state.dataError = e.message;
  }
}

export async function render() {
  if (!state.user) {
    login();
    return;
  }
  document.body.innerHTML = shell();
  $("#content").innerHTML =
    '<div class="skeleton-message">Loading workspace…</div>';
  await data();
  const views = {
    dashboard,
    users,
    generators,
    maintenance,
    notifications,
    configuration: config,
  };
  $("#content").innerHTML = (views[state.route] || dashboard)();
  bind();
}

function bind() {
  const allowed =
    state.user?.role === "admin"
      ? [
          "dashboard",
          "users",
          "generators",
          "maintenance",
          "notifications",
          "configuration",
        ]
      : state.user?.role === "operator"
        ? ["dashboard", "generators", "maintenance", "notifications"]
        : ["dashboard", "maintenance", "notifications"];
  $$(".nav a").forEach((a) => {
    if (!allowed.includes(a.dataset.route)) {
      a.remove();
      return;
    }
    a.onclick = (e) => {
      e.preventDefault();
      state.route = a.dataset.route;
      render();
    };
  });
  const logoutBtn = $("#logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await api("/api/logout", { method: "POST" });
      state.user = null;
      login();
    });
  }
  const mobileMenuBtn = $("#mobile-menu");
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () =>
      $("#sidebar").classList.toggle("open"),
    );
  }
  const genSelect = $("#generator-select");
  if (genSelect) {
    genSelect.addEventListener("change", (e) => {
      state.selected = Number(e.target.value);
      render();
    });
  }
  $$(".user-edit").forEach(
    (b) =>
      (b.onclick = async () => {
        const u = state.users.find((x) => String(x.user_id) === b.dataset.id);
        const name = prompt("Name", u.name),
          email = prompt("Email", u.email),
          role = prompt("Role: admin, operator, or viewer", u.role);
        if (name && email && ["admin", "operator", "viewer"].includes(role)) {
          await api("/api/users/" + u.user_id, {
            method: "PUT",
            body: JSON.stringify({ name, email, role }),
          });
          await render();
        }
      }),
  );
  $$(".user-delete").forEach(
    (b) =>
      (b.onclick = async () => {
        if (confirm("Delete this user?")) {
          await api("/api/users/" + b.dataset.id, { method: "DELETE" });
          await render();
        }
      }),
  );
  $$(".config-form").forEach(
    (form) =>
      (form.onsubmit = async (e) => {
        e.preventDefault();
        const message = form.querySelector(".config-message");
        try {
          const body = Object.fromEntries(new FormData(form));
          await api("/api/config", {
            method: "PUT",
            body: JSON.stringify({
              parameter: form.dataset.parameter,
              ...body,
            }),
          });
          message.textContent = "Saved";
          state.config = (await api("/api/config")).rows;
        } catch (err) {
          message.textContent = err.message;
        }
      }),
  );
}

api("/api/session")
  .then((d) => {
    state.user = d.user;
    render();
  })
  .catch(() => login());

setInterval(async () => {
  if (state.user && state.route === "dashboard" && state.selected) {
    try {
      state.reading = (
        await api("/api/generators/" + state.selected + "/latest")
      ).reading;
      const c = $("#content");
      if (c) {
        c.innerHTML = dashboard();
        bind();
      }
    } catch {
      /* ignore intermittent polling errors */
    }
  }
}, 1000);
