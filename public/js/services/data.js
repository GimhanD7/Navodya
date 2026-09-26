import { api } from "../api.js";
import { state } from "../state.js";

export async function loadData() {
  const user = state.user;
  const route = state.route;
  const loadGenerators = async () => {
    try {
      const g = await api("/api/generators");
      if (state.user !== user) return;
      state.generators = g.rows || [];
      state.generatorError = null;
      if (!state.generators.some(g => g.generator_id === state.selected)) state.selected = state.generators[0]?.generator_id ?? null;
      state.reading = null;
      state.telemetryError = null;
      if (state.selected) {
        const selected = state.selected;
        try {
          const result = await api("/api/generators/" + selected + "/latest");
          if (state.user === user && state.selected === selected) state.reading = result.reading;
        } catch (error) { if (state.user === user && state.selected === selected) state.telemetryError = error; }
      }
    } catch (error) { if (state.user === user) state.generatorError = error; }
  };
  const requests = [loadGenerators(), api("/api/notifications").then(n => { if (state.user === user) state.notifications = n.rows || []; })];
  if (route === "users" && user?.role === "admin") requests.push(api("/api/users").then(d => { if (state.user === user) state.users = d.rows || []; }));
  if (["configuration", "maintenance"].includes(route)) requests.push(api("/api/config").then(d => { if (state.user === user) state.config = d.rows || []; }));
  await Promise.allSettled(requests);
}
