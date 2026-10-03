import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAdminCardUpdates } from "../lib/admin-card-validation";
test("admin edits validate complete card scope and never change ownership or image paths", () => {
  assert.deepEqual(
    validateAdminCardUpdates({
      sport: "Hockey",
      set_name: "MVP",
      parallel: "Silver",
      subset: "Base",
      quantity: 2,
      rookie: false,
      estimated_value_cad: null,
    }),
    {
      sport: "Hockey",
      set_name: "MVP",
      parallel: "Silver",
      subset: "Base",
      quantity: 2,
      rookie: false,
      estimated_value_cad: null,
    },
  );
  for (const value of [
    { quantity: 0 },
    { quantity: 1.5 },
    { estimated_value_cad: -1 },
    { user_id: "other" },
    { front_image_url: "https://evil.example" },
    { rookie: "true" },
    null,
    {},
  ])
    assert.throws(() => validateAdminCardUpdates(value));
});
