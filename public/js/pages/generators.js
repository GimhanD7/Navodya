import { state } from "../state.js";
import { $ } from "../icons.js";
import { api } from "../api.js";

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function generators() {
  const isAdmin = state.user?.role === "admin";
  const rows = state.generators.length
    ? state.generators
        .map(
          (g) =>
            `<tr><td class="table-name">${esc(g.name)}</td><td>${esc(g.serial_no || "—")}</td><td>${esc(g.location || "—")}</td><td>${g.rated_capacity_kva ? esc(g.rated_capacity_kva) + " kVA" : "—"}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="empty">No generators available.</td></tr>`;

  return `<div class="page-heading">
      <div>
        <div class="eyebrow">Administration</div>
        <h1>Generators</h1>
        <p>Keep each asset connected to its place and owner.</p>
      </div>
      ${isAdmin ? `<button type="button" class="button" id="add-generator">+ Add generator</button>` : ""}
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Serial number</th><th>Location</th><th>Capacity</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <dialog class="create-alert-modal" id="add-generator-dialog">
      <div class="modal-inner">
        <div class="modal-header">
          <h2>Add Generator</h2>
          <button type="button" class="icon-button" id="close-generator-dialog" aria-label="Close dialog">×</button>
        </div>
        <form id="add-generator-form">
          <div class="field">
            <label for="gen-name">Name *</label>
            <input id="gen-name" name="name" type="text" required maxlength="100" placeholder="e.g. Generator 03">
          </div>
          <div class="field">
            <label for="gen-serial">Serial number *</label>
            <input id="gen-serial" name="serial_no" type="text" required maxlength="100" placeholder="e.g. SN-2026-003">
          </div>
          <div class="field">
            <label for="gen-location">Location</label>
            <input id="gen-location" name="location" type="text" maxlength="150" placeholder="e.g. Main Building">
          </div>
          <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="field">
              <label for="gen-capacity">Capacity (kVA)</label>
              <input id="gen-capacity" name="rated_capacity_kva" type="number" min="0" step="0.1" placeholder="e.g. 50">
            </div>
            <div class="field">
              <label for="gen-install">Install date</label>
              <input id="gen-install" name="install_date" type="date">
            </div>
          </div>
          <p class="error" id="add-generator-error" role="alert"></p>
          <div class="form-actions" style="justify-content:flex-end;display:flex;gap:10px;margin-top:16px;">
            <button type="button" class="button secondary" id="cancel-generator-dialog">Cancel</button>
            <button type="submit" class="button" id="submit-generator">Add generator</button>
          </div>
        </form>
      </div>
    </dialog>`;
}

export function bindGenerators(render) {
  const dialog = $("#add-generator-dialog");
  const openBtn = $("#add-generator");
  const form = $("#add-generator-form");
  const error = $("#add-generator-error");
  if (!dialog || !form) return;

  const close = () => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    form.reset();
    if (error) error.textContent = "";
  };

  if (openBtn) {
    openBtn.onclick = () => {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      $("#gen-name")?.focus();
    };
  }
  const closeBtn = $("#close-generator-dialog");
  const cancelBtn = $("#cancel-generator-dialog");
  if (closeBtn) closeBtn.onclick = close;
  if (cancelBtn) cancelBtn.onclick = close;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const submit = $("#submit-generator");
    const data = Object.fromEntries(new FormData(form).entries());
    data.name = data.name.trim();
    data.serial_no = data.serial_no.trim();
    data.location = data.location.trim();
    if (!data.name || !data.serial_no) {
      if (error) error.textContent = "Name and serial number are required.";
      return;
    }
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Adding…";
    }
    if (error) error.textContent = "";
    try {
      await api("/api/generators", { method: "POST", body: JSON.stringify(data) });
      close();
      await render();
    } catch (err) {
      if (error) error.textContent = err.message || "Unable to add generator.";
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Add generator";
      }
    }
  };
}
