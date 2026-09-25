import { state } from "../state.js";
import { icons, $$ } from "../icons.js";
import { api } from "../api.js";
import { render } from "../../app.js";

export function users() {
  return `<div class="page-heading"><div><div class="eyebrow">Administration</div><h1>Users</h1><p>People who can manage or monitor generators.</p></div><button class="button" id="add-user">+ Add user</button></div><div class="panel table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>${state.users.length ? state.users.map((u) => `<tr><td class="table-name">${u.name}</td><td>${u.email}</td><td><span class="status normal">${u.role}</span></td><td><button class="button secondary user-edit" data-id="${u.user_id}">Edit</button> <button class="button secondary user-delete" data-id="${u.user_id}">Delete</button></td></tr>`).join("") : `<tr><td colspan="4" class="empty">No users available.</td></tr>`}</tbody></table></div>`;
}

export function bindUsers() {
  $$(".user-edit").forEach(
    (b) =>
      (b.onclick = async () => {
        const u = state.users.find((x) => String(x.user_id) === b.dataset.id);
        if (!u) return;
        const name = prompt("Name", u.name);
        if (name === null) return;
        const email = prompt("Email", u.email);
        if (email === null) return;
        const role = prompt("Role: admin, operator, or viewer", u.role);
        if (role === null || !["admin", "operator", "viewer"].includes(role)) {
          return;
        }
        try {
          await api("/api/users/" + u.user_id, {
            method: "PUT",
            body: JSON.stringify({ name, email, role }),
          });
          await render();
        } catch (err) {
          alert(err.message);
        }
      }),
  );
  $$(".user-delete").forEach(
    (b) =>
      (b.onclick = async () => {
        if (confirm("Delete this user?")) {
          try {
            await api("/api/users/" + b.dataset.id, { method: "DELETE" });
            await render();
          } catch (err) {
            alert(err.message);
          }
        }
      }),
  );
  const btn = $("#add-user");
  if (btn) {
    btn.onclick = async () => {
      const name = prompt("Name");
      if (name === null) return;
      const email = prompt("Email");
      if (email === null) return;
      const role = prompt("Role: admin, operator, or viewer");
      if (role === null || !["admin", "operator", "viewer"].includes(role)) {
        return;
      }
      const password = prompt("Password for new user");
      if (password === null) return;
      try {
        await api("/api/users", {
          method: "POST",
          body: JSON.stringify({ name, email, role, password }),
        });
        await render();
      } catch (err) {
        alert(err.message);
      }
    };
  }
}
