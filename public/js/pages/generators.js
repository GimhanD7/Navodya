import { state } from "../state.js";

export function generators() {
  return `<div class="page-heading"><div><div class="eyebrow">Administration</div><h1>Generators</h1><p>Keep each asset connected to its place and owner.</p></div><button class="button" id="add-generator">+ Add generator</button></div><div class="panel table-wrap"><table><thead><tr><th>Name</th><th>Serial number</th><th>Location</th><th>Capacity</th></tr></thead><tbody>${state.generators.length ? state.generators.map((g) => `<tr><td class="table-name">${g.name}</td><td>${g.serial_no || "—"}</td><td>${g.location || "—"}</td><td>${g.rated_capacity_kva ? g.rated_capacity_kva + " kVA" : "—"}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">No generators available.</td></tr>`}</tbody></table></div>`;
}
