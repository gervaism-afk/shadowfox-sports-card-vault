import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanupCardImages, removeUnreferencedCardImage } from "../lib/image-cleanup";

function fixture({ referenced = false, fail = false, queryFails = false } = {}) {
  const origin = "https://project.supabase.co";
  const image = `${origin}/storage/v1/object/public/card-images/owner/front/image.jpg`;
  const deleted: string[] = [];
  const removed: string[] = [];
  class Query {
    action = "select";
    filters: Record<string, string> = {};
    constructor(public table: string) {}
    select() { return this; } order() { return this; } limit() { return this; }
    eq(key: string, value: string) { this.filters[key] = value; return this; }
    delete() { this.action = "delete"; return this; }
    then(resolve: (value: unknown) => unknown) {
      if (this.table === "cards") return Promise.resolve({ data: null, count: queryFails ? null : referenced ? 1 : 0, error: queryFails ? new Error("network failed") : null }).then(resolve);
      if (this.action === "delete") { deleted.push(this.filters.id); return Promise.resolve({ error: null }).then(resolve); }
      return Promise.resolve({ data: [{ id: "job", image_url: image }], error: null }).then(resolve);
    }
  }
  const client = {
    from: (table: string) => new Query(table),
    storage: { from: () => ({ remove: async (paths: string[]) => { removed.push(...paths); return { error: fail ? new Error("storage failed") : null }; } }) },
  } as unknown as SupabaseClient;
  return { client, origin, image, deleted, removed };
}
test("cleanup deletes unreferenced objects and completes the queue job", async () => {
  const f = fixture();
  await cleanupCardImages(f.client, "owner", f.origin);
  assert.deepEqual(f.removed, ["owner/front/image.jpg"]);
  assert.deepEqual(f.deleted, ["job"]);
});
test("shared images and failed reference checks are never removed", async () => {
  for (const options of [{ referenced: true }, { queryFails: true }]) {
    const f = fixture(options);
    await cleanupCardImages(f.client, "owner", f.origin);
    assert.deepEqual(f.removed, []); assert.deepEqual(f.deleted, []);
  }
});
test("failed object removal leaves the queue job for retry", async () => {
  const f = fixture({ fail: true });
  await cleanupCardImages(f.client, "owner", f.origin);
  assert.equal(f.removed.length, 1); assert.deepEqual(f.deleted, []);
});
test("failed-save compensation preserves images from a committed save", async () => {
  const f = fixture({ referenced: true });
  assert.equal(await removeUnreferencedCardImage(f.client, "owner", f.image, f.origin), false);
  assert.deepEqual(f.removed, []);
});
