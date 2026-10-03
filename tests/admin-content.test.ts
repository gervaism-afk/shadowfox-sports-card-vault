import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateContent,
  isEditablePage,
  PAGE_CONTENT_DEFAULTS,
} from "../lib/content/defaults";
test("public shop content permits eBay shop URLs but rejects unsafe links and unrecognized fields", () => {
  assert.equal(isEditablePage("shop"), true);
  assert.ok(validateContent("shop", PAGE_CONTENT_DEFAULTS.shop));
  for (const ebayUrl of [
    "javascript:alert(1)",
    "https://evil.example/usr/shop",
    "https://www.ebay.ca@evil.example/usr/shop",
    "https://www.ebay.ca/signin",
    "http://www.ebay.ca/usr/shop",
  ])
    assert.equal(validateContent("shop", { ebayUrl }), null);
  assert.equal(validateContent("shop", { apiKey: "secret" }), null);
  assert.equal(
    validateContent("homepage", { primaryHref: "//evil.example" }),
    null,
  );
});
