// Tiny formatting helpers with no dependencies on app state — split out so
// both app.js and src/ui.js can use them without a circular import between
// the two (ui.js renders shared components that app.js's render functions
// call into).

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function statusLabel(status) {
  const labels = {
    awaiting_nonprofit: "Awaiting nonprofit",
    awaiting_business: "Awaiting business",
    mutually_approved: "Mutually approved",
    outreach_pending: "Outreach pending",
    outreach_sent: "Outreach sent",
    under_review: "Under review",
    on_hold: "On hold",
    active: "Active",
    completed: "Completed",
  };
  if (labels[status]) return labels[status];
  return status.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
