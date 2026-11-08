import { test } from "node:test";
import assert from "node:assert/strict";
import { cekSandiBaru, cocokSandi, hashSandi, sandiAcak } from "./sandi.ts";

test("hash kata sandi bisa dicocokkan dan bergaram (salt) acak", () => {
  const h1 = hashSandi("rahasia123"), h2 = hashSandi("rahasia123");
  assert.notEqual(h1, h2, "salt berbeda menghasilkan hash berbeda");
  assert.ok(cocokSandi("rahasia123", h1));
  assert.ok(!cocokSandi("rahasia124", h1));
  assert.ok(!cocokSandi("rahasia123", "rusak"));
});

test("kata sandi acak 8 karakter tanpa huruf yang membingungkan", () => {
  for (let i = 0; i < 200; i++) {
    const s = sandiAcak();
    assert.equal(s.length, 8);
    assert.ok(!/[01oil]/.test(s), s);
  }
});

test("aturan kata sandi baru", () => {
  assert.ok(cekSandiBaru("pendek1"));
  assert.ok(cekSandiBaru("hanyahuruf"));
  assert.equal(cekSandiBaru("anakku2026"), null);
});
