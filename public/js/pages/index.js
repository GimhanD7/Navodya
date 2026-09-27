import { dashboard, bindDashboard, updateDashboard } from "./dashboard.js";
import { users, bindUsers } from "./users.js";
import { generators } from "./generators.js";
import { maintenance } from "./maintenance.js";
import { notifications } from "./notifications.js";
import { config, bindConfiguration } from "./configuration.js";

export const pages = {
  dashboard: { render: dashboard, bind: bindDashboard, update: updateDashboard },
  users: { render: users, bind: bindUsers },
  generators: { render: generators },
  maintenance: { render: maintenance },
  notifications: { render: notifications },
  configuration: { render: config, bind: bindConfiguration },
};
