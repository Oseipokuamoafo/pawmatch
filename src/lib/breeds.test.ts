import { test } from "node:test";
import assert from "node:assert/strict";

import { slugifyBreed } from "./breeds";

test("lowercases + hyphenates the typical breed name", () => {
  assert.equal(slugifyBreed("Golden Retriever"), "golden-retriever");
  assert.equal(slugifyBreed("French Bulldog"), "french-bulldog");
});

test("collapses runs of non-alphanumerics into a single hyphen", () => {
  assert.equal(slugifyBreed("Cavalier King   Charles  Spaniel"), "cavalier-king-charles-spaniel");
  assert.equal(slugifyBreed("Coton de Tuléar"), "coton-de-tul-ar"); // diacritics get collapsed too
});

test("trims leading/trailing hyphens", () => {
  assert.equal(slugifyBreed("  Border Collie  "), "border-collie");
  assert.equal(slugifyBreed("-Akita-"), "akita");
});

test("strips punctuation", () => {
  assert.equal(slugifyBreed("Pembroke Welsh Corgi"), "pembroke-welsh-corgi");
  assert.equal(slugifyBreed("St. Bernard"), "st-bernard");
});

test("name → slug is stable across rounds", () => {
  const names = ["Beagle", "Maine Coon", "British Shorthair", "Pug"];
  for (const n of names) {
    const once = slugifyBreed(n);
    const twice = slugifyBreed(once.replace(/-/g, " "));
    assert.equal(twice, once);
  }
});
