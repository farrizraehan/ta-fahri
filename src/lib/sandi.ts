import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Kata sandi akun wali/siswa.
 * Disimpan dengan scrypt (salt acak, sengaja lambat), BUKAN SHA-512:
 * SHA-512 dirancang cepat sehingga kata sandi pendek mudah ditebak secara brute force,
 * sedangkan scrypt memperlambat setiap tebakan. SHA-512 tetap dipakai untuk validasi transaksi.
 */
const N = 16384, R = 8, P = 1, PANJANG = 32;

export function hashSandi(sandi: string): string {
  const salt = randomBytes(16).toString("base64url");
  const h = scryptSync(sandi, salt, PANJANG, { N, r: R, p: P }).toString("base64url");
  return `scrypt$${salt}$${h}`;
}

export function cocokSandi(sandi: string, simpan: string): boolean {
  const [alg, salt, h] = simpan.split("$");
  if (alg !== "scrypt" || !salt || !h) return false;
  const hitung = scryptSync(sandi, salt, PANJANG, { N, r: R, p: P });
  const asli = Buffer.from(h, "base64url");
  return asli.length === hitung.length && timingSafeEqual(asli, hitung);
}

// tanpa huruf/angka yang mirip (0/O, 1/l/I) supaya mudah dibaca dari kertas
const HURUF = "abcdefghjkmnpqrstuvwxyz23456789";

/** Kata sandi awal acak, misalnya "k7mq4xtr". */
export function sandiAcak(panjang = 8): string {
  let s = "";
  for (let i = 0; i < panjang; i++) s += HURUF.at(randomInt(HURUF.length));
  return s;
}

export function cekSandiBaru(sandi: string): string | null {
  if (sandi.length < 8) return "Kata sandi minimal 8 karakter.";
  if (!/[A-Za-z]/.test(sandi) || !/\d/.test(sandi)) return "Kata sandi harus berisi huruf dan angka.";
  return null;
}
