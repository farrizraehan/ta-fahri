import "server-only";
import { db, kunciSha512 } from "./supabase";
import { buatHash } from "./validasi.ts";
import { hitungTagihan } from "./tagihan.ts";
import { hariIni } from "./format.ts";

type Catat = {
  tagihanId: string;
  jumlah: number;
  metode: "tunai" | "midtrans";
  petugasId?: string | null;
  petugasNama: string;
  keterangan?: string | null;
  orderId?: string | null;
};

/**
 * Mencatat satu transaksi pembayaran dan menandatanganinya dengan SHA-512.
 * Dipakai oleh pembayaran tunai (bendahara) dan notifikasi Midtrans.
 */
export async function catatTransaksi(c: Catat) {
  const sb = db();
  const { data: t, error } = await sb
    .from("tagihan")
    .select("id, siswa_id, nominal, potongan, transaksi(jumlah, dibatalkan)")
    .eq("id", c.tagihanId)
    .single();
  if (error || !t) throw new Error("Tagihan tidak ditemukan");

  const { sisa } = hitungTagihan(t);
  if (c.jumlah <= 0) throw new Error("Jumlah harus lebih dari 0");
  if (c.jumlah > sisa) throw new Error(`Jumlah melebihi sisa tagihan (${sisa})`);

  const { data: no, error: eNo } = await sb.rpc("ambil_nomor_kuitansi", { p_tanggal: hariIni() });
  if (eNo || !no) throw new Error("Gagal membuat nomor kuitansi");

  // presisi detik supaya nilai yang disimpan Postgres sama persis dengan yang di-hash
  const waktu = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
  const data = {
    no_kuitansi: no as string,
    siswa_id: t.siswa_id as string,
    tagihan_id: t.id as string,
    jumlah: c.jumlah,
    waktu,
    petugas_nama: c.petugasNama,
    metode: c.metode,
  };
  const hash_sha512 = buatHash(data, kunciSha512());

  const { data: baru, error: eIns } = await sb
    .from("transaksi")
    .insert({ ...data, hash_sha512, petugas_id: c.petugasId ?? null, keterangan: c.keterangan ?? null, order_id: c.orderId ?? null })
    .select("id, no_kuitansi, hash_sha512")
    .single();
  if (eIns) throw new Error(eIns.message);
  return baru;
}
