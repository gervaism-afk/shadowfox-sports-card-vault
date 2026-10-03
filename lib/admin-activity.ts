export type AdminActivity = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_label: string;
  action: string;
  subject_type: string;
  subject_id: string;
  summary: string;
  details: { fields?: string[]; from?: string; to?: string };
};
export const ACTIVITY_LABELS: Record<string, string> = {
  "card.updated": "Card edited",
  "card.deleted": "Card deleted",
  "user.role_changed": "Role changed",
  "content.updated": "Site content edited",
};
export function activityDetail(row: AdminActivity) {
  if (row.action === "user.role_changed")
    return `${row.details.from || "Unknown"} → ${row.details.to || "Unknown"}`;
  return Array.isArray(row.details.fields)
    ? row.details.fields
        .filter((v) => typeof v === "string")
        .map((v) => v.replace(/_/g, " "))
        .join(", ")
    : "";
}
export function activityCsv(rows: AdminActivity[]) {
  function cell(value: string) {
    const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
    return '"' + safe.replace(/"/g, '""') + '"';
  }
  return (
    "\uFEFF" +
    [
      ["Time (UTC)", "Admin", "Action", "Item", "Changed fields / role"],
      ...rows.map((r) => [
        r.created_at,
        r.actor_label,
        ACTIVITY_LABELS[r.action] || r.action,
        r.summary,
        activityDetail(r),
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
