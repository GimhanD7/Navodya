export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function severity(notification) {
  if (/\bcritical\b/i.test(notification.detail || "")) return "critical";
  if (/\bwarning\b/i.test(notification.detail || "")) return "warning";
  return "notice";
}

export function filterNotifications(rows, filters) {
  const query = filters.search.trim().toLowerCase();
  return rows.filter(n =>
    (filters.status === "all" || n.status === filters.status) &&
    (filters.severity === "all" || severity(n) === filters.severity) &&
    (filters.generator === "all" || n.generator_name === filters.generator) &&
    (!query || [n.title, n.detail, n.generator_name].some(value => String(value || "").toLowerCase().includes(query)))
  ).sort((a, b) => {
    if (filters.sort === "priority") {
      const rank = n => (n.status === "active" ? 0 : 10) + ({ critical: 0, warning: 1, notice: 2 })[severity(n)];
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
}
