import { startDemo } from "../services/demo.js";
import { $, icons } from "../icons.js";
import { api } from "../api.js";
import { state } from "../state.js";

export function login(render) {
  document.body.innerHTML = `<main class="login"><section class="login-aside"><div class="brand"><div class="brand-mark">${icons.bolt}</div><div>Generator System<small>Monitoring platform</small></div></div><div class="login-aside-content"><div class="eyebrow">Operations control</div><h1>Know your generators.<br>Act before they stop.</h1><p>One clear view for generator health, service planning, and the people responsible for keeping power online.</p></div><footer>Smart Generator Monitoring · Internal operations</footer></section><section class="login-main"><form class="login-form" id="login-form"><div class="eyebrow">Welcome back</div><h2>Sign in to your workspace</h2><p>Use your monitoring account to continue.</p><div class="field"><label for="username">Username or email</label><input id="username" name="username" autocomplete="username" required></div><div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><p class="error" id="login-error"></p><button class="button" type="submit">Log in</button><button class="button secondary" type="button" id="start-demo">Open live demo</button><div class="login-footnote">Access is managed by your system administrator.<br>Contact them if your account needs help.</div></form></section></main>`;
  $("#start-demo").onclick = () => { startDemo(); render(); };
  $("#login-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const d = await api("/api/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      state.user = d.user;
      render();
    } catch (err) {
      $("#login-error").textContent = err.message;
    }
  };
}
