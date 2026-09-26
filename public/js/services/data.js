import { api } from "../api.js";
import { state } from "../state.js";

export async function loadData() {
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

