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

/** Nama bendahara dan kepala madrasah aktif untuk kolom tanda tangan. */
export async function namaPejabat() {
  const { data } = await db().from("profil").select("nama, peran").eq("aktif", true).in("peran", ["bendahara", "kepala"]).order("dibuat");
  return {
    bendahara: data?.find((p) => p.peran === "bendahara")?.nama,
    kepala: data?.find((p) => p.peran === "kepala")?.nama,
  };
}

export type FilterTransaksi = { dari: string; sampai: string; metode?: string; q?: string };

/** Transaksi pada rentang tanggal (WIB), terbaru dulu kecuali urut=naik. */
export async function ambilTransaksi(f: FilterTransaksi, urut: "naik" | "turun" = "turun") {
  let q = db()
    .from("transaksi")
    .select("id, no_kuitansi, jumlah, waktu, metode, petugas_nama, dibatalkan, hash_sha512, siswa(nama, nisn, kelas(nama)), tagihan(semester, jenis_biaya(nama))")
    .gte("waktu", new Date(`${f.dari}T00:00:00+07:00`).toISOString())
    .lte("waktu", new Date(`${f.sampai}T23:59:59+07:00`).toISOString())
    .order("waktu", { ascending: urut === "naik" })
    .limit(5000);
  if (f.metode) q = q.eq("metode", f.metode);
  if (f.q) q = q.ilike("no_kuitansi", `%${f.q.replace(/[^A-Za-z0-9-]/g, "")}%`);
  const { data } = await q;
  return (data ?? []).map((t) => {
    const s = t.siswa as unknown as { nama: string; nisn: string | null; kelas: { nama: string } | null };
    const tg = t.tagihan as unknown as { semester: string | null; jenis_biaya: { nama: string } };
    return {
      ...t,
      jumlah: Number(t.jumlah),
      siswaNama: s.nama,
      nisn: s.nisn,
      kelas: s.kelas?.nama ?? "-",
      pembayaran: `${tg.jenis_biaya.nama}${tg.semester ? ` (${tg.semester})` : ""}`,
    };
  });
}
