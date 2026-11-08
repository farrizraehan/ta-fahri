import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { rekapTunggakan } from "@/lib/laporan";
import { hariIni, rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Laporan({ searchParams }: { searchParams: Promise<{ kelas?: string; dari?: string; sampai?: string }> }) {
  await wajib();
  const p = await searchParams;
  const sb = db();
  const sampai = p.sampai || hariIni();
  const dari = p.dari || sampai.slice(0, 8) + "01";
  const [{ data: kelas }, rekap, { data: trx }] = await Promise.all([
    sb.from("kelas").select("id, nama").order("nama"),
    rekapTunggakan(p.kelas ? Number(p.kelas) : undefined),
    sb
      .from("transaksi")
      .select("jumlah, metode, tagihan(jenis_biaya(nama))")
      .eq("dibatalkan", false)
      .gte("waktu", new Date(`${dari}T00:00:00+07:00`).toISOString())
      .lte("waktu", new Date(`${sampai}T23:59:59+07:00`).toISOString()),
  ]);

  const perBiaya = new Map<string, { tunai: number; online: number }>();
  for (const t of trx ?? []) {
    const n = (t.tagihan as unknown as { jenis_biaya: { nama: string } }).jenis_biaya.nama;
    const r = perBiaya.get(n) ?? { tunai: 0, online: 0 };
    if (t.metode === "midtrans") r.online += Number(t.jumlah);
    else r.tunai += Number(t.jumlah);
    perBiaya.set(n, r);
  }
  const totalTunai = [...perBiaya.values()].reduce((a, r) => a + r.tunai, 0);
  const totalOnline = [...perBiaya.values()].reduce((a, r) => a + r.online, 0);
  const qs = new URLSearchParams({ dari, sampai, ...(p.kelas ? { kelas: p.kelas } : {}) }).toString();

  return (
    <div className="space-y-5">
      <h1 className="judul">Laporan</h1>
      <form className="tanpa-cetak kartu flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="dari">Penerimaan dari</label>
          <input id="dari" type="date" name="dari" defaultValue={dari} className="isian" />
        </div>
        <div>
          <label className="label" htmlFor="sampai">Sampai</label>
          <input id="sampai" type="date" name="sampai" defaultValue={sampai} className="isian" />
        </div>
        <div>
          <label className="label" htmlFor="kelas">Kelas (tunggakan)</label>
          <select id="kelas" name="kelas" defaultValue={p.kelas ?? ""} className="isian">
            <option value="">Semua</option>
            {kelas?.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
        <button className="tombol">Tampilkan</button>
        <a href={`/dashboard/laporan/export?${qs}`} className="tombol-garis">Unduh Excel</a>
      </form>

      <section className="tanpa-cetak kartu flex flex-wrap items-center gap-3">
        <h2 className="mr-auto font-bold">Cetak dokumen</h2>
        <a href={`/dashboard/cetak/transaksi?dari=${dari}&sampai=${sampai}`} className="tombol">
          Cetak transaksi {dari} s.d. {sampai}
        </a>
        <a href={`/dashboard/cetak/tunggakan${p.kelas ? `?kelas=${p.kelas}` : ""}`} className="tombol">
          Cetak data tunggakan
        </a>
      </section>

      <section className="kartu overflow-x-auto">
        <h2 className="mb-3 font-bold">Penerimaan {dari} s.d. {sampai}</h2>
        <table className="tabel">
          <thead>
            <tr><th>Jenis biaya</th><th className="text-right">Tunai</th><th className="text-right">Midtrans</th><th className="text-right">Jumlah</th></tr>
          </thead>
          <tbody>
            {[...perBiaya].map(([n, r]) => (
              <tr key={n}><td>{n}</td><td className="text-right">{rupiah(r.tunai)}</td><td className="text-right">{rupiah(r.online)}</td><td className="text-right font-semibold">{rupiah(r.tunai + r.online)}</td></tr>
            ))}
            <tr className="font-bold"><td>Total</td><td className="text-right">{rupiah(totalTunai)}</td><td className="text-right">{rupiah(totalOnline)}</td><td className="text-right">{rupiah(totalTunai + totalOnline)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="kartu overflow-x-auto">
        <h2 className="mb-3 font-bold">Tunggakan per siswa</h2>
        <table className="tabel">
          <thead>
            <tr>
              <th>Kelas</th><th>Nama</th>
              {rekap.biaya.map((b) => <th key={b.id} className="text-right">{b.kode}</th>)}
              <th className="text-right">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {rekap.baris.filter((b) => b.total > 0).map((b) => (
              <tr key={b.nisn + b.nama}>
                <td>{b.kelas}</td>
                <td>{b.nama}</td>
                {rekap.biaya.map((j) => {
                  const x = b.per[j.kode];
                  return <td key={j.id} className={`text-right ${x?.sisa ? "text-red-700" : "text-green-700"}`}>{!x ? "-" : x.sisa ? rupiah(x.sisa) : "✔"}</td>;
                })}
                <td className="text-right font-semibold">{rupiah(b.sisa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
