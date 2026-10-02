import assert from "node:assert/strict";
import { test } from "node:test";
import { isEditablePage, validateContent } from "../lib/content/defaults";

test("content rejects unknown pages and unknown fields", () => {
  assert.equal(isEditablePage("__proto__"), false);
  assert.equal(isEditablePage("analytics"), true);
  assert.equal(validateContent("homepage", { unexpected: "value" }), null);
});
test("content links accept local routes and reject executable or external links", () => {
  assert.deepEqual(validateContent("homepage", { primaryHref: "/scan" }), { primaryHref: "/scan" });
  for (const href of ["javascript:alert(1)", "//example.com", "/\\example.com", "https://example.com", "/ /example.com"]) {
    assert.equal(validateContent("homepage", { primaryHref: href }), null);
  }
});
test("content rejects non-text values and excessive lengths", () => {
  assert.equal(validateContent("manual", { title: 42 }), null);
  assert.equal(validateContent("manual", { title: "x".repeat(5001) }), null);
  assert.equal(validateContent("manual", []), null);
});
