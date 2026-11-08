import { sha512 } from "./sha512.ts";

/**
 * Data transaksi yang "dikunci" oleh tanda tangan SHA-512.
 * Mengubah salah satu field ini (misalnya nominal di database) membuat hash tidak cocok lagi.
 */
export type DataTransaksi = {
  no_kuitansi: string;
  siswa_id: string;
  tagihan_id: string;
  jumlah: number | string;
  waktu: string; // ISO 8601
  petugas_nama: string;
  metode: string;
};

/** Ubah waktu ke bentuk baku (UTC, presisi detik) supaya hash tidak bergantung format dari database. */
export function waktuBaku(waktu: string | Date): string {
  const d = typeof waktu === "string" ? new Date(waktu) : waktu;
  return d.toISOString().slice(0, 19) + "Z";
}

/** Susun pesan baku: field dipisah '|' dengan urutan tetap. */
export function pesanBaku(t: DataTransaksi): string {
  return [
    t.no_kuitansi,
    t.siswa_id,
    t.tagihan_id,
    String(Math.round(Number(t.jumlah))),
    waktuBaku(t.waktu),
    t.petugas_nama,
    t.metode,
  ].join("|");
}

/**
 * Tanda tangan transaksi:  SHA512( pesan_baku | kunci_rahasia )
 * Prinsipnya sama dengan signature_key Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey).
 * Kunci rahasia hanya ada di server, sehingga orang luar tidak bisa membuat hash yang sah.
 */
export function buatHash(t: DataTransaksi, kunci: string): string {
  if (!kunci) throw new Error("Kunci rahasia SHA-512 belum diatur");
  return sha512(`${pesanBaku(t)}|${kunci}`);
}

/** Bandingkan dua string dengan waktu konstan (mencegah timing attack). */
export function samaPersis(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beda === 0;
}

export type HasilValidasi =
  | { hasil: "valid"; alasan: string }
  | { hasil: "tidak_valid"; alasan: string }
  | { hasil: "dibatalkan"; alasan: string };

/**
 * Validasi transaksi:
 *  1. Hitung ulang hash dari data di database lalu bandingkan dengan hash tersimpan
 *     → mendeteksi data yang diubah langsung di database.
 *  2. Bila ada hash dari kuitansi (QR), bandingkan dengan hash tersimpan
 *     → mendeteksi kuitansi palsu/dimodifikasi.
 */
export function validasi(
  t: DataTransaksi & { hash_sha512: string; dibatalkan?: boolean },
  kunci: string,
  hashKuitansi?: string | null,
): HasilValidasi {
  const hitungUlang = buatHash(t, kunci);
  const tersimpan = t.hash_sha512.trim().toLowerCase();
  if (!samaPersis(hitungUlang, tersimpan)) {
    return { hasil: "tidak_valid", alasan: "Data transaksi di database tidak cocok dengan hash SHA-512 (data telah diubah)." };
  }
  if (hashKuitansi) {
    const h = hashKuitansi.trim().toLowerCase();
    const cocok = h.length === 128 ? samaPersis(h, tersimpan) : h.length >= 16 && tersimpan.startsWith(h);
    if (!cocok) {
      return { hasil: "tidak_valid", alasan: "Hash pada kuitansi tidak cocok dengan catatan sekolah (kuitansi palsu atau diubah)." };
    }
  }
  if (t.dibatalkan) {
    return { hasil: "dibatalkan", alasan: "Transaksi ini asli tetapi sudah dibatalkan oleh bendahara." };
  }
  return { hasil: "valid", alasan: "Hash SHA-512 cocok. Transaksi asli dan tidak pernah diubah." };
}
