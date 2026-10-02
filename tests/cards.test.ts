import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOcrText } from "../lib/ocr";
import { applyOcrGuess } from "../lib/scan";
import { emptyCard } from "../lib/defaults";
import { estimateSoldPrices } from "../lib/pricing";
import { fetchAllRows } from "../lib/pagination";
import { imageObjectPath, validateImageFile } from "../lib/images";
import { duplicateKey } from "../lib/matching";

test("OCR recognizes uppercase names, specific parallels, card number, and grading label", () => {
  const card = parseOcrText("CONNOR MCDAVID\n2023 Upper Deck\nYoung Guns # 201\nEdmonton Oilers\nBlue Refractor\nPSA GEM MINT 10");
  assert.equal(card.player, "Connor Mcdavid");
  assert.equal(card.brand, "Upper Deck");
  assert.equal(card.parallel, "Blue Refractor");
  assert.equal(card.cardNumber, "201");
  assert.equal(card.grade, "10");
  assert.equal(card.rookie, true);
  assert.equal(parseOcrText("John Smith\n2023 Topps\nCard 9").grade, undefined);
  assert.equal(parseOcrText("SPx\nJohn Smith").brand, "SPx");
});
test("new OCR guesses include parallel and replace stale fields", () => {
  const old = { ...emptyCard(), player: "Old Player", grade: "10", parallel: "Gold", autograph: true };
  const next = applyOcrGuess(old, { player: "New Player", parallel: "Blue" });
  assert.equal(next.player, "New Player"); assert.equal(next.parallel, "Blue");
  assert.equal(next.grade, ""); assert.equal(next.autograph, false);
});
test("sold estimates use median, respect thousands separators, and reject invalid input", () => {
  assert.deepEqual(estimateSoldPrices("CAD 20\n$30\n1000.00"), { estimateCad: 30, sampleCount: 3, low: 20, high: 1000 });
  assert.equal(estimateSoldPrices("$1,000.00\nC$ 2,000.00 CAD").estimateCad, 1500);
  assert.equal(estimateSoldPrices("20.01\n20.02").estimateCad, 20.02);
  for (const input of ["", "0", "-1", "25 USD", "1,23", "10\nunknown"]) assert.throws(() => estimateSoldPrices(input));
});
test("pagination retrieves more than 1,000 rows with a lower server row cap", async () => {
  const records = Array.from({ length: 1205 }, (_, id) => ({ id }));
  const result = await fetchAllRows(async (from, to) => ({ data: records.slice(from, Math.min(to + 1, from + 73)), error: null }));
  assert.deepEqual(result, records);
  await assert.rejects(fetchAllRows(async () => ({ data: null, error: new Error("network failed") })), /network failed/);
});
test("cleanup paths restrict project, bucket, owner, and directory traversal", () => {
  const origin = "https://example.supabase.co";
  const path = "/storage/v1/object/public/card-images/owner/front/image.jpg";
  assert.equal(imageObjectPath(origin + path, "owner", origin), "owner/front/image.jpg");
  assert.equal(imageObjectPath("https://evil.test" + path, "owner", origin), null);
  assert.equal(imageObjectPath(origin + path, "other", origin), null);
  assert.equal(imageObjectPath(origin + path.replace("image.jpg", "%2Fprivate%2Ffile"), "owner", origin), null);
  assert.equal(imageObjectPath(origin + path.replace("front", "private"), "owner", origin), null);
});
test("upload validation rejects unsuitable types and large files", () => {
  assert.throws(() => validateImageFile({ type: "text/html", size: 12 }), /JPEG/);
  assert.throws(() => validateImageFile({ type: "image/jpeg", size: 13 * 1024 * 1024 }), /12 MB/);
  validateImageFile({ type: "image/png", size: 1000 });
});
test("duplicate identity distinguishes autographed and ordinary cards", () => {
  const card = { ...emptyCard(), player: "John Smith" };
  assert.notEqual(duplicateKey(card), duplicateKey({ ...card, autograph: true }));
});
