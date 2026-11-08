import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sha512, bitBerbeda } from "./sha512.ts";
import { buatHash, validasi, type DataTransaksi } from "./validasi.ts";
import { hitungSignature, verifikasiNotifikasi, sudahDibayar } from "./midtrans.ts";

const ref = (s: string) => createHash("sha512").update(s, "utf8").digest("hex");

test("vektor uji resmi FIPS 180-4", () => {
  assert.equal(
    sha512("abc"),
    "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
  );
  assert.equal(
    sha512(""),
    "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
  );
});

test("sama dengan node:crypto untuk berbagai panjang pesan (termasuk batas blok 111/112/128)", () => {
  for (const n of [1, 55, 64, 111, 112, 113, 127, 128, 129, 255, 1000]) {
    const s = "a".repeat(n);
    assert.equal(sha512(s), ref(s), `panjang ${n}`);
  }
  assert.equal(sha512("Pembayaran DSP Rp 1.100.000 — MTs Al Riyadhul Janah"), ref("Pembayaran DSP Rp 1.100.000 — MTs Al Riyadhul Janah"));
});

test("avalanche effect: ubah 1 karakter → sekitar setengah bit berubah", () => {
  const a = sha512("KW-20261108-0001|1100000");
  const b = sha512("KW-20261108-0001|1100001");
  const beda = bitBerbeda(a, b);
  assert.ok(beda > 200 && beda < 312, `bit berbeda ${beda} dari 512`);
});

const trx: DataTransaksi = {
  no_kuitansi: "KW-20261108-0001",
  siswa_id: "11111111-1111-1111-1111-111111111111",
  tagihan_id: "22222222-2222-2222-2222-222222222222",
  jumlah: 1100000,
  waktu: "2026-11-08T03:15:00.123Z",
  petugas_nama: "Bendahara",
  metode: "tunai",
};
const KUNCI = "kunci-rahasia-uji";

test("transaksi asli dinyatakan VALID", () => {
  const hash = buatHash(trx, KUNCI);
  assert.equal(hash.length, 128);
  assert.equal(validasi({ ...trx, hash_sha512: hash }, KUNCI, hash).hasil, "valid");
  // format waktu dari Postgres berbeda tetapi momennya sama → tetap valid
  assert.equal(validasi({ ...trx, waktu: "2026-11-08 03:15:00.123+00", hash_sha512: hash }, KUNCI).hasil, "valid");
});

test("nominal diubah di database → TIDAK VALID", () => {
  const hash = buatHash(trx, KUNCI);
  assert.equal(validasi({ ...trx, jumlah: 110000, hash_sha512: hash }, KUNCI).hasil, "tidak_valid");
});

test("hash kuitansi palsu → TIDAK VALID", () => {
  const hash = buatHash(trx, KUNCI);
  const palsu = sha512("kuitansi palsu");
  assert.equal(validasi({ ...trx, hash_sha512: hash }, KUNCI, palsu).hasil, "tidak_valid");
});

test("tanpa kunci rahasia yang benar, hash tidak bisa dipalsukan", () => {
  const hashPenyerang = buatHash({ ...trx, jumlah: 50000 }, "tebakan");
  assert.equal(validasi({ ...trx, jumlah: 50000, hash_sha512: hashPenyerang }, KUNCI).hasil, "tidak_valid");
});

test("transaksi dibatalkan dilaporkan sebagai dibatalkan", () => {
  const hash = buatHash(trx, KUNCI);
  assert.equal(validasi({ ...trx, hash_sha512: hash, dibatalkan: true }, KUNCI).hasil, "dibatalkan");
});

test("signature Midtrans = SHA512(order_id+status_code+gross_amount+ServerKey)", () => {
  const sk = "SB-Mid-server-contoh";
  const sig = hitungSignature("MTS-ABC-1", "200", "1100000.00", sk);
  assert.equal(sig, ref("MTS-ABC-1" + "200" + "1100000.00" + sk));
  const notif = { order_id: "MTS-ABC-1", status_code: "200", gross_amount: "1100000.00", signature_key: sig, transaction_status: "settlement" };
  assert.equal(verifikasiNotifikasi(notif, sk).valid, true);
  assert.equal(verifikasiNotifikasi({ ...notif, gross_amount: "10000.00" }, sk).valid, false, "nominal dimanipulasi");
  assert.equal(verifikasiNotifikasi(notif, "server-key-salah").valid, false, "notifikasi palsu");
  assert.equal(sudahDibayar(notif), true);
  assert.equal(sudahDibayar({ transaction_status: "pending" }), false);
  assert.equal(sudahDibayar({ transaction_status: "capture", fraud_status: "challenge" }), false);
});
