import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyCard } from "../lib/defaults";
import { isCommonsImageUrl, parseCommonsPhotos, matchingReferencePhotos, fillReferencePhotos, type ReferencePhoto } from "../lib/reference-photos";
const card = () => ({ ...emptyCard(), player: "Nick Suzuki", year: "2026-27", brand: "Upper Deck", set: "Tim Hortons", cardNumber: "14", notes: "My collection" });
const photo: ReferencePhoto = { title: "File:2026-27 Upper Deck Tim Hortons base card 14 Nick Suzuki front.jpg", description: "Base card front", side: "front", url: "https://upload.wikimedia.org/example.jpg", source: "https://commons.wikimedia.org/wiki/File:Example.jpg", license: "CC BY-SA 4.0", author: "Example author" };
test("reference photos require exact identity, side and variant and preserve owned photos", () => {
  assert.equal(matchingReferencePhotos(card(), [photo]).length, 1);
  assert.equal(matchingReferencePhotos({ ...card(), year: "2025-26" }, [photo]).length, 0);
  assert.equal(matchingReferencePhotos(card(), [{ ...photo, title: photo.title.replace("card 14", "card AI-14") }]).length, 0);
  assert.equal(matchingReferencePhotos(card(), [{ ...photo, title: photo.title.replace("base", "gold") }]).length, 0);
  assert.equal(matchingReferencePhotos({ ...card(), parallel: "Gold" }, [photo]).length, 0);
  assert.equal(fillReferencePhotos(card(), [photo, { ...photo, url: photo.url + "2" }]).added, 0);
  const filled = fillReferencePhotos(card(), [photo]);
  assert.equal(filled.added, 1); assert.equal(filled.card.frontImage, photo.url); assert.equal(filled.card.backImage, "");
  assert.match(filled.card.notes, /My collection\nReference front image/); assert.match(filled.card.notes, /CC BY-SA 4.0/);
  assert.equal(fillReferencePhotos({ ...card(), frontImage: "my-own-photo.jpg" }, [photo]).added, 0);
});
test("Commons parser accepts only open licenses and Wikimedia image hosts with an unambiguous side", () => {
  assert.equal(isCommonsImageUrl(photo.url), true);
  for (const url of ["http://upload.wikimedia.org/file.jpg", "https://upload.wikimedia.org.evil.example/file.jpg", "https://user@upload.wikimedia.org/file.jpg", "https://upload.wikimedia.org:8443/file.jpg"]) assert.equal(isCommonsImageUrl(url), false);
  const info = { url: photo.url, descriptionurl: photo.source, mime: "image/jpeg", extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" }, ImageDescription: { value: "Base card front" }, Artist: { value: "<a>Example author</a>" } } };
  const parse = (imageinfo: any, title = photo.title) => parseCommonsPhotos({ query: { pages: { 1: { title, imageinfo: [imageinfo] } } } });
  assert.equal(parse(info).length, 1); assert.equal(parse(info)[0].author, "Example author");
  assert.equal(parse({ ...info, url: "https://evil.example/photo.jpg" }).length, 0);
  assert.equal(parse({ ...info, extmetadata: { ...info.extmetadata, LicenseShortName: { value: "All rights reserved" } } }).length, 0);
  assert.equal(parse(info, "front back card.jpg").length, 0);
});
