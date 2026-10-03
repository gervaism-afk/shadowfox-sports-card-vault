import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityCsv,
  activityDetail,
  type AdminActivity,
} from "../lib/admin-activity";
test("history exports preserve field labels and escape formula-like user text", () => {
  const row: AdminActivity = {
    id: "id",
    created_at: "2026-10-03T01:00:00Z",
    actor_id: "admin",
    actor_label: "admin@example.test",
    action: "card.updated",
    subject_type: "card",
    subject_id: "card",
    summary: '=HYPERLINK("unsafe")',
    details: { fields: ["set_name", "parallel"] },
  };
  assert.equal(activityDetail(row), "set name, parallel");
  const csv = activityCsv([row]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=HYPERLINK(""unsafe"")"'));
  assert.equal(
    activityDetail({
      ...row,
      action: "user.role_changed",
      details: { from: "user", to: "admin" },
    }),
    "user → admin",
  );
});
