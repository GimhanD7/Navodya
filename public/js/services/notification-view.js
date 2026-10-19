export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function severity(notification) {
  if (notification.severity) return notification.severity;
  const text = `${notification.detail || ""} ${notification.title || ""}`;
  if (/\bcritical\b/i.test(text)) return "critical";
  if (/\bwarning\b/i.test(text)) return "warning";
  return "notice";
}

export function detectCategory(notification) {
  const text = `${notification.title || ""} ${notification.detail || ""}`.toLowerCase();
  if (text.includes("temp") || text.includes("°c") || text.includes("overheat")) {
    return { key: "temp", label: "Temperature", icon: "thermometer" };
  }
  if (text.includes("fuel") || text.includes("diesel") || text.includes("tank")) {
    return { key: "fuel", label: "Fuel System", icon: "droplet" };
  }
  if (text.includes("volt") || text.includes("current") || text.includes("overload") || text.includes("power")) {
    return { key: "power", label: "Electrical", icon: "bolt" };
  }
  if (text.includes("freq") || text.includes("hz")) {
    return { key: "freq", label: "Frequency", icon: "activity" };
  }
  if (text.includes("maint") || text.includes("service") || text.includes("oil") || text.includes("filter") || text.includes("inspection")) {
    return { key: "service", label: "Maintenance", icon: "wrench" };
  }
  return { key: "system", label: "System", icon: "bell" };
}

export function formatRelativeTime(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 45) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function filterNotifications(rows, filters) {
  const query = (filters.search || "").trim().toLowerCase();
  const now = Date.now();
  return rows.filter(n => {
    if (filters.status && filters.status !== "all" && n.status !== filters.status) return false;
    if (filters.severity && filters.severity !== "all" && severity(n) !== filters.severity) return false;
    if (filters.generator && filters.generator !== "all" && n.generator_name !== filters.generator) return false;
    if (filters.timeframe && filters.timeframe !== "all") {
      const created = new Date(n.created_at).getTime();
      if (!Number.isNaN(created)) {
        const diffMs = now - created;
        if (filters.timeframe === "today" && diffMs > 24 * 60 * 60 * 1000) return false;
        if (filters.timeframe === "week" && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
        if (filters.timeframe === "month" && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
      }
    }
    if (query) {
      const match = [n.title, n.detail, n.generator_name, n.generator_location]
        .some(value => String(value || "").toLowerCase().includes(query));
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    if (filters.sort === "priority") {
      const rank = n => (n.status === "active" ? 0 : 10) + ({ critical: 0, warning: 1, notice: 2 })[severity(n)];
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
    } else if (filters.sort === "oldest") {
      return new Date(a.created_at) - new Date(b.created_at);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

export function exportNotificationsToCsv(rows) {
  const headers = ["ID", "Generator", "Location", "Title", "Severity", "Detail", "Status", "Timestamp"];
  const lines = [headers.join(",")];
  for (const n of rows) {
    const fields = [
      n.notification_id,
      `"${String(n.generator_name || "").replace(/"/g, '""')}"`,
      `"${String(n.generator_location || "").replace(/"/g, '""')}"`,
      `"${String(n.title || "").replace(/"/g, '""')}"`,
      `"${severity(n)}"`,
      `"${String(n.detail || "").replace(/"/g, '""')}"`,
      `"${n.status || ""}"`,
      `"${n.created_at || ""}"`,
    ];
    lines.push(fields.join(","));
  }
  return lines.join("\r\n");
}

