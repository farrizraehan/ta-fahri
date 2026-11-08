export const rupiah = (n: number | string) => `Rp ${Math.round(Number(n)).toLocaleString("id-ID")}`;

const ZONA = "Asia/Jakarta";

export const tanggal = (d: string | Date) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: ZONA });

export const tanggalJam = (d: string | Date) =>
  new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  });

/** Tanggal hari ini (YYYY-MM-DD) di zona WIB. */
export const hariIni = () => new Date().toLocaleDateString("en-CA", { timeZone: ZONA });

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function bilang(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${bilang(n - 10)} belas`;
  if (n < 100) return `${bilang(Math.floor(n / 10))} puluh${n % 10 ? ` ${bilang(n % 10)}` : ""}`;
  if (n < 200) return `seratus${n % 100 ? ` ${bilang(n % 100)}` : ""}`;
  if (n < 1000) return `${bilang(Math.floor(n / 100))} ratus${n % 100 ? ` ${bilang(n % 100)}` : ""}`;
  if (n < 2000) return `seribu${n % 1000 ? ` ${bilang(n % 1000)}` : ""}`;
  if (n < 1_000_000) return `${bilang(Math.floor(n / 1000))} ribu${n % 1000 ? ` ${bilang(n % 1000)}` : ""}`;
  if (n < 1_000_000_000) return `${bilang(Math.floor(n / 1_000_000))} juta${n % 1_000_000 ? ` ${bilang(n % 1_000_000)}` : ""}`;
  return `${bilang(Math.floor(n / 1_000_000_000))} miliar${n % 1_000_000_000 ? ` ${bilang(n % 1_000_000_000)}` : ""}`;
}

/** 1.100.000 → "Satu juta seratus ribu rupiah" */
export function terbilang(n: number): string {
  const v = Math.round(n);
  const teks = v === 0 ? "nol" : bilang(v);
  return `${teks[0].toUpperCase()}${teks.slice(1)} rupiah`;
}

/** Samarkan nama untuk halaman publik: "DWI RAHMA ANGGRAINI" → "DWI R*** A***". */
export function samarkanNama(nama: string) {
  return nama
    .split(/\s+/)
    .map((k, i) => (i === 0 ? k : `${k[0]}***`))
    .join(" ");
}

/** Waktu ISO n jam yang lalu. */
export const jamLalu = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();
