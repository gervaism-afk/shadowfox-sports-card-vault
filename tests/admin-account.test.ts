import { test } from "node:test";
import assert from "node:assert/strict";
import { isInactiveAccount, validateAccountAction } from "../lib/admin-account";
test("inactivity uses last sign-in or creation and does not classify a new unconfirmed account as stale", () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  assert.equal(isInactiveAccount(null, "2026-10-08", now), false);
  assert.equal(isInactiveAccount(null, "2026-01-01", now), true);
  assert.equal(isInactiveAccount("2026-10-08", "2026-01-01", now), false);
  assert.equal(isInactiveAccount("2026-05-01", "2026-01-01", now), true);
  assert.equal(isInactiveAccount(null, "invalid", now), false);
});
test("account mutations protect self, administrators and require exact target email for deletion", () => {
  for (const action of ["delete", "reset_email", "recovery_link", "reactivate"]) {
    assert.throws(() => validateAccountAction({ action, confirmEmail: "u@example.com" }, "a", "a", "user", "u@example.com"), /own account/);
    assert.throws(() => validateAccountAction({ action, confirmEmail: "u@example.com" }, "a", "b", "admin", "u@example.com"), /protected/);
  }
  assert.throws(() => validateAccountAction({ action: "delete", confirmEmail: "other@example.com" }, "a", "b", "user", "u@example.com"), /exact email/);
  assert.throws(() => validateAccountAction({ action: "set_role" }, "a", "b", "user", "u@example.com"), /valid/);
  assert.equal(validateAccountAction({ action: "delete", confirmEmail: "u@example.com" }, "a", "b", "user", "u@example.com"), "delete");
});
