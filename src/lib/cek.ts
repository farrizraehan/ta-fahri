import "server-only";
import { db, kunciSha512 } from "./supabase";
import { validasi, type HasilValidasi } from "./validasi.ts";

export type HasilCek =
  | (HasilValidasi & {
      t: {
        id: string;
        no_kuitansi: string;
        jumlah: number;
        waktu: string;
        metode: string;
        hash_sha512: string;
        siswa: { nama: string; kelas: { nama: string } | null };
        tagihan: { semester: string | null; jenis_biaya: { nama: string } };
      };
    })
  | { hasil: "tidak_ditemukan"; alasan: string; t?: undefined };

/** Validasi satu kuitansi lalu catat hasilnya di log_validasi. */
export async function cekKuitansi(noKuitansi: string, hash: string | null, sumber: "publik" | "petugas"): Promise<HasilCek> {
  const sb = db();
  const no = noKuitansi.trim().toUpperCase();
  const { data: t } = await sb
    .from("transaksi")
    .select("*, siswa(nama, kelas(nama)), tagihan(semester, jenis_biaya(nama))")
    .eq("no_kuitansi", no)
    .maybeSingle();

  const h = hash?.trim().toLowerCase().replace(/[^0-9a-f]/g, "") || null;
  const hasil: HasilCek = t
    ? { ...validasi(t, kunciSha512(), h), t }
    : { hasil: "tidak_ditemukan", alasan: "Nomor kuitansi tidak terdaftar di sistem sekolah." };

  await sb.from("log_validasi").insert({
    transaksi_id: t?.id ?? null,
    no_kuitansi: no.slice(0, 40),
    hash_diperiksa: h?.slice(0, 128) ?? null,
    hasil: hasil.hasil,
    alasan: hasil.alasan,
    sumber,
  });
  return hasil;
}

/** Audit integritas: hitung ulang SHA-512 seluruh transaksi dan bandingkan dengan hash tersimpan. */
export async function auditSemua() {
  const sb = db();
  const mulai = performance.now();
  const { data } = await sb.from("transaksi").select("*").order("waktu").limit(5000);
  const k = kunciSha512();
  const rusak = (data ?? [])
    .filter((t) => validasi(t, k).hasil === "tidak_valid")
    .map((t) => ({ id: t.id as string, no: t.no_kuitansi as string, jumlah: Number(t.jumlah), waktu: t.waktu as string }));
  const hasil = { total: data?.length ?? 0, ms: Math.round(performance.now() - mulai), rusak };
  await sb.from("log_validasi").insert({
    hasil: rusak.length ? "tidak_valid" : "valid",
    alasan: `Audit ${hasil.total} transaksi, ${rusak.length} tidak valid, ${hasil.ms} ms`,
    sumber: "audit",
  });
  return hasil;
}
