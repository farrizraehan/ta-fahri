import Link from "next/link";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { hariIni, rupiah, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DaftarTransaksi({ searchParams }: { searchParams: Promise<{ dari?: string; sampai?: string; metode?: string; q?: string }> }) {
  await wajib();
  const p = await searchParams;
  const sampai = p.sampai || hariIni();
  const dari = p.dari || sampai.slice(0, 8) + "01";
  let q = db()
    .from("transaksi")
    .select("id, no_kuitansi, jumlah, waktu, metode, petugas_nama, dibatalkan, siswa(nama, kelas(nama)), tagihan(semester, jenis_biaya(nama))")
    .gte("waktu", new Date(`${dari}T00:00:00+07:00`).toISOString())
    .lte("waktu", new Date(`${sampai}T23:59:59+07:00`).toISOString())
    .order("waktu", { ascending: false })
    .limit(1000);
  if (p.metode) q = q.eq("metode", p.metode);
  if (p.q) q = q.ilike("no_kuitansi", `%${p.q.replace(/[^A-Za-z0-9-]/g, "")}%`);
  const { data } = await q;
  const total = (data ?? []).filter((t) => !t.dibatalkan).reduce((a, t) => a + Number(t.jumlah), 0);

  return (
    <div className="space-y-5">
      <h1 className="judul">Transaksi</h1>
      <form className="kartu flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="dari">Dari</label>
          <input id="dari" type="date" name="dari" defaultValue={dari} className="isian" />
        </div>
        <div>
          <label className="label" htmlFor="sampai">Sampai</label>
          <input id="sampai" type="date" name="sampai" defaultValue={sampai} className="isian" />
        </div>
        <div>
          <label className="label" htmlFor="metode">Metode</label>
          <select id="metode" name="metode" defaultValue={p.metode ?? ""} className="isian">
            <option value="">Semua</option>
            <option value="tunai">Tunai</option>
            <option value="midtrans">Midtrans</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="q">No. kuitansi</label>
          <input id="q" name="q" defaultValue={p.q ?? ""} className="isian" />
        </div>
        <button className="tombol">Tampilkan</button>
      </form>
      <div className="kartu overflow-x-auto">
        <p className="mb-2 text-sm">
          {data?.length ?? 0} transaksi · total <b>{rupiah(total)}</b>
        </p>
        <table className="tabel">
          <thead>
            <tr>
              <th>Kuitansi</th>
              <th>Waktu</th>
              <th>Siswa</th>
              <th>Pembayaran</th>
              <th>Metode</th>
              <th>Petugas</th>
              <th className="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((t) => {
              const s = t.siswa as unknown as { nama: string; kelas: { nama: string } | null };
              const tg = t.tagihan as unknown as { semester: string | null; jenis_biaya: { nama: string } };
              return (
                <tr key={t.id} className={t.dibatalkan ? "text-gray-400 line-through" : ""}>
                  <td>
                    <Link href={`/dashboard/kuitansi/${t.id}`} className="font-mono text-xs underline">{t.no_kuitansi}</Link>
                  </td>
                  <td className="whitespace-nowrap">{tanggalJam(t.waktu)}</td>
                  <td>{s.nama} <span className="text-xs text-gray-500">{s.kelas?.nama}</span></td>
                  <td>{tg.jenis_biaya.nama}{tg.semester ? ` (${tg.semester})` : ""}</td>
                  <td>{t.metode === "midtrans" ? "Midtrans" : "Tunai"}</td>
                  <td>{t.petugas_nama}</td>
                  <td className="text-right">{rupiah(t.jumlah)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
