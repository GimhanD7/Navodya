import { state } from "../state.js";

let started = 0;
let previousPhase = 0;
let sequence = 0;

export function startDemo() {
  state.demo = true;
  state.user = { id: "demo", name: "Demo viewer", role: "viewer" };
  state.route = "dashboard";
  state.generators = [{ generator_id: "demo-generator", name: "Demo generator", location: "Simulated power station" }];
  state.selected = "demo-generator";
  state.notifications = [];
  state.dataError = "";
  state.liveError = "";
  state.config = [
    { parameter: "temperature", warning_max: 85, critical_max: 95 },
    { parameter: "voltage", warning_min: 210, warning_max: 250, critical_min: 190, critical_max: 260 },
    { parameter: "frequency", warning_min: 49, warning_max: 51, critical_min: 47, critical_max: 53 },
    { parameter: "fuel", warning_min: 20, critical_min: 10 },
  ];
  started = Date.now();
  previousPhase = 0;
  sequence = 0;
  updateDemo();
}

export function updateDemo(now = Date.now()) {
  const elapsed = Math.floor((now - started) / 1000);
  const phase = Math.floor(elapsed / 10) % 4;
  state.reading = {
    status: "running", source: "browser-demo", recorded_at: new Date(now).toISOString(),
    voltage: (231 + Math.sin(elapsed / 4) * 2).toFixed(1),
    current: (12.5 + Math.sin(elapsed / 3)).toFixed(1),
    frequency: (50 + Math.sin(elapsed / 5) * 0.15).toFixed(2),
    temperature: (phase === 1 ? 88 + Math.sin(elapsed) : 77 + Math.sin(elapsed / 3) * 2).toFixed(1),
    fuel_level: phase === 2 ? 18 : 68,
    runtime_seconds: 154200 + elapsed,
  };
  if (phase !== previousPhase) {
    for (const notification of state.notifications) notification.status = "resolved";
    if (phase === 1 || phase === 2) {
      state.notifications.unshift({
        notification_id: "demo-" + ++sequence,
        generator_name: "Demo generator", status: "active", created_at: new Date(now).toISOString(),
        title: phase === 1 ? "Demo: high temperature" : "Demo: low fuel",
        detail: phase === 1 ? "Simulated temperature crossed the 85 °C warning limit." : "Simulated fuel level fell below 20%.",
      });
      state.notifications = state.notifications.slice(0, 50);
    }
    previousPhase = phase;
  }
}
