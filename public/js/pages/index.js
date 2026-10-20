import { dashboard, bindDashboard, updateDashboard } from "./dashboard.js";
import { users, bindUsers } from "./users.js";
import { generators, bindGenerators } from "./generators.js";
import { maintenance, bindMaintenance, updateMaintenance } from "./maintenance.js";
import { notifications, bindNotifications, updateNotifications } from "./notifications.js";
import { config, bindConfiguration } from "./configuration.js";
import { reports, bindReports } from "./reports.js";

export const pages = {
  dashboard: { render: dashboard, bind: bindDashboard, update: updateDashboard },
  users: { render: users, bind: bindUsers },
  generators: { render: generators, bind: bindGenerators },
  maintenance: { render: maintenance, bind: bindMaintenance, update: updateMaintenance },
  notifications: { render: notifications, bind: bindNotifications, update: updateNotifications },
  configuration: { render: config, bind: bindConfiguration },
  reports: { render: reports, bind: bindReports },
};
