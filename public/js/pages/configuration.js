import { $$ } from "../icons.js";
import { api } from "../api.js";
import { state } from "../state.js";

export function config() {
  const cfg = Object.fromEntries(state.config.map((x) => [x.parameter, x]));
  
  const iconMap = {
    temperature: "temperature",
    voltage: "bolt",
    frequency: "activity",
    fuel: "droplet"
  };

  const card = (key, label, unit, fields, description) => {
    const c = cfg[key] || {};
    return `
      <form class="panel config-card config-form" data-parameter="${key}" style="padding: 24px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <div class="config-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--primary); padding: 8px; border-radius: 8px;">
             <!-- Icon placeholder -->
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>
          <h2 style="margin: 0; font-size: 1.25rem;">${label} Thresholds</h2>
        </div>
        <p class="range-description" style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px;">${description}</p>
        
        <div class="field-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          ${fields.map(([name, prop]) => `
            <div class="field" style="display: flex; flex-direction: column; gap: 6px;">
              <label style="font-size: 0.85rem; font-weight: 500; color: var(--text-muted);">${name} <span style="opacity: 0.7;">(${unit})</span></label>
              <input name="${prop}" type="number" step="0.01" value="${c[prop] ?? ""}" required style="padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); transition: border-color 0.2s;">
            </div>
          `).join("")}
        </div>
        
        <div class="form-actions" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 16px;">
          <span class="muted small config-message" style="color: var(--primary); font-weight: 500;"></span>
          <button class="button primary" type="submit" style="padding: 8px 24px;">Save Changes</button>
        </div>
      </form>
    `;
  };

  return `
    <div class="page-heading" style="margin-bottom: 32px;">
      <div>
        <div class="eyebrow">Administrator</div>
        <h1>System Configuration</h1>
        <p>Manage central telemetry limits used for maintenance checks and automated alert generation.</p>
      </div>
    </div>
    <div class="config-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
      ${card("temperature", "Temperature", "°C", [
        ["Warning Maximum", "warning_max"],
        ["Critical Maximum", "critical_max"],
      ], "Triggers alerts when the engine temperature exceeds safe operating conditions.")}
      
      ${card("voltage", "Voltage", "V", [
        ["Warning Minimum", "warning_min"],
        ["Warning Maximum", "warning_max"],
        ["Critical Minimum", "critical_min"],
        ["Critical Maximum", "critical_max"],
      ], "Defines the acceptable output voltage range to prevent equipment damage.")}
      
      ${card("frequency", "Frequency", "Hz", [
        ["Warning Minimum", "warning_min"],
        ["Warning Maximum", "warning_max"],
        ["Critical Minimum", "critical_min"],
        ["Critical Maximum", "critical_max"],
      ], "Sets the bounds for alternator frequency. Typically tightly bound around 50Hz or 60Hz.")}
      
      ${card("fuel", "Fuel Level", "%", [
        ["Warning Minimum", "warning_min"],
        ["Critical Minimum", "critical_min"],
      ], "Alerts operators when fuel drops below required reserves.")}
      
      <div class="panel config-card" style="padding: 24px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <div class="config-icon" style="background: rgba(168, 85, 247, 0.1); color: #a855f7; padding: 8px; border-radius: 8px;">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h2 style="margin: 0; font-size: 1.25rem;">Oil Service Interval</h2>
        </div>
        <p class="range-description" style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px;">Service interval for regular engine maintenance.</p>
        <div class="metric-value" style="font-size: 2rem; font-weight: 600;">250 <span style="font-size: 1rem; font-weight: 400; color: var(--text-muted);">runtime hours</span></div>
        <p style="margin-top: 16px; font-size: 0.85rem; color: var(--text-muted);"><em>This parameter is currently fixed in the firmware.</em></p>
      </div>
    </div>
  `;
}

export function bindConfiguration() {
  $$(".config-form").forEach(
    (form) =>
      (form.onsubmit = async (e) => {
        e.preventDefault();
        const message = form.querySelector(".config-message");
        try {
          const body = Object.fromEntries(new FormData(form));
          
          // Basic Client-Side Validation
          if (body.warning_max && body.critical_max && Number(body.warning_max) >= Number(body.critical_max)) {
            throw new Error("Warning max must be less than Critical max.");
          }
          if (body.warning_min && body.critical_min && Number(body.warning_min) <= Number(body.critical_min)) {
            throw new Error("Warning min must be greater than Critical min.");
          }
          if (body.warning_min && body.warning_max && Number(body.warning_min) >= Number(body.warning_max)) {
            throw new Error("Warning min must be less than Warning max.");
          }

          message.style.color = "var(--text-muted)";
          message.textContent = "Saving...";

          await api("/api/config", {
            method: "PUT",
            body: JSON.stringify({
              parameter: form.dataset.parameter,
              ...body,
            }),
          });
          
          message.style.color = "var(--primary)";
          message.textContent = "Changes Saved Successfully";
          setTimeout(() => { if (message.textContent === "Changes Saved Successfully") message.textContent = ""; }, 3000);
          
          state.config = (await api("/api/config")).rows;
        } catch (err) {
          message.style.color = "var(--danger, #ef4444)";
          message.textContent = err.message || "Failed to save configuration.";
        }
      }),
  );
}
