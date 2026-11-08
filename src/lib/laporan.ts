import "server-only";
import { db } from "./supabase";
import { hitungTagihan } from "./tagihan.ts";

export type BarisLaporan = {
  nama: string;
  nisn: string;
  kelas: string;
  per: Record<string, { total: number; dibayar: number; sisa: number }>;
  total: number;
  dibayar: number;
  sisa: number;
};

/** Rekap tagihan per siswa dan per jenis biaya, bisa difilter kelas. */
export async function rekapTunggakan(kelasId?: number) {
  const sb = db();
  const { data: biaya } = await sb.from("jenis_biaya").select("id, kode, nama").order("urutan");
  let q = sb
    .from("siswa")
    .select("nama, nisn, nis, kelas_id, kelas(nama), tagihan(nominal, potongan, jenis_biaya(kode), transaksi(jumlah, dibatalkan))")
    .eq("status", "aktif")
    .order("nama");
  if (kelasId) q = q.eq("kelas_id", kelasId);
  const { data: siswa } = await q;

  const baris: BarisLaporan[] = (siswa ?? [])
    .map((s) => {
      const per: BarisLaporan["per"] = {};
      for (const t of s.tagihan ?? []) {
        const kode = (t.jenis_biaya as unknown as { kode: string }).kode;
        const h = hitungTagihan(t);
        const p = (per[kode] ??= { total: 0, dibayar: 0, sisa: 0 });
        p.total += h.total;
        p.dibayar += h.dibayar;
        p.sisa += h.sisa;
      }
      const v = Object.values(per);
      return {
        nama: s.nama,
        nisn: s.nisn ?? s.nis ?? "",
        kelas: (s.kelas as unknown as { nama: string } | null)?.nama ?? "-",
        per,
        total: v.reduce((a, x) => a + x.total, 0),
        dibayar: v.reduce((a, x) => a + x.dibayar, 0),
        sisa: v.reduce((a, x) => a + x.sisa, 0),
      };
    })
    .sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama));
  return { biaya: biaya ?? [], baris };
}
