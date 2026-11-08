import Link from "next/link";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { namaPejabat, rekapTunggakan } from "@/lib/laporan";
import { rupiah, tanggal } from "@/lib/format";
import { BilahCetak, KopSurat, TandaTangan } from "@/components/cetak";

export const dynamic = "force-dynamic";

export default async function CetakTunggakan({ searchParams }: { searchParams: Promise<{ kelas?: string; semua?: string }> }) {
  await wajib();
  const p = await searchParams;
  const kelasId = p.kelas ? Number(p.kelas) : undefined;
  const [rekap, pejabat, { data: kelas }] = await Promise.all([
    rekapTunggakan(kelasId),
    namaPejabat(),
    db().from("kelas").select("id, nama").order("nama"),
  ]);
  const namaKelas = kelas?.find((k) => k.id === kelasId)?.nama;
  // default hanya siswa yang masih menunggak; ?semua=1 untuk semua siswa bertagihan
  const baris = rekap.baris.filter((b) => b.total > 0 && (p.semua ? true : b.sisa > 0));
  const biaya = rekap.biaya.filter((j) => baris.some((b) => b.per[j.kode]));
  const jumlah = (f: (b: (typeof baris)[number]) => number) => baris.reduce((a, b) => a + f(b), 0);

  return (
    <div className="mx-auto max-w-5xl bg-white p-4 text-black print:p-0">
      <style>{"@page { size: A4 landscape; margin: 12mm; }"}</style>
      <BilahCetak kembali={<Link href="/dashboard/laporan" className="text-sm text-gray-500 hover:underline">← Laporan</Link>}>
        <form className="flex items-center gap-2 text-sm">
          <select name="kelas" defaultValue={p.kelas ?? ""} className="isian py-1" aria-label="Kelas">
            <option value="">Semua kelas</option>
            {kelas?.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" name="semua" value="1" defaultChecked={!!p.semua} className="accent-green-800" />
            termasuk yang lunas
          </label>
          <button className="tombol-garis py-1">Terapkan</button>
        </form>
      </BilahCetak>
      <KopSurat
        judul={p.semua ? "Rekap Pembayaran Siswa" : "Daftar Tunggakan Pembayaran Siswa"}
        sub={`${namaKelas ? `Kelas ${namaKelas}` : "Semua kelas"} — per ${tanggal(new Date())}`}
      />

      <table className="w-full border-collapse text-xs [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:bg-gray-100 [&_th]:px-1.5 [&_th]:py-1">
        <thead>
          <tr>
            <th rowSpan={2}>No</th>
            <th rowSpan={2}>Nama Siswa</th>
            <th rowSpan={2}>NISN</th>
            <th rowSpan={2}>Kelas</th>
            <th colSpan={biaya.length}>Sisa per jenis biaya</th>
            <th rowSpan={2}>Total Tagihan</th>
            <th rowSpan={2}>Sudah Bayar</th>
            <th rowSpan={2}>Sisa</th>
          </tr>
          <tr>
            {biaya.map((j) => <th key={j.id}>{j.nama.replace(/ selama 3 tahun| satu semester/i, "")}</th>)}
          </tr>
        </thead>
        <tbody>
          {baris.map((b, i) => (
            <tr key={b.nisn + b.nama}>
              <td className="text-center">{i + 1}</td>
              <td>{b.nama}</td>
              <td className="font-mono">{b.nisn}</td>
              <td className="text-center">{b.kelas}</td>
              {biaya.map((j) => {
                const x = b.per[j.kode];
                return <td key={j.id} className="text-right whitespace-nowrap">{!x ? "-" : x.sisa ? rupiah(x.sisa) : "Lunas"}</td>;
              })}
              <td className="text-right whitespace-nowrap">{rupiah(b.total)}</td>
              <td className="text-right whitespace-nowrap">{rupiah(b.dibayar)}</td>
              <td className="text-right font-semibold whitespace-nowrap">{b.sisa ? rupiah(b.sisa) : "Lunas"}</td>
            </tr>
          ))}
          {!baris.length && (
            <tr>
              <td colSpan={7 + biaya.length} className="text-center">Tidak ada tunggakan.</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td colSpan={4 + biaya.length} className="text-right">JUMLAH ({baris.length} siswa)</td>
            <td className="text-right whitespace-nowrap">{rupiah(jumlah((b) => b.total))}</td>
            <td className="text-right whitespace-nowrap">{rupiah(jumlah((b) => b.dibayar))}</td>
            <td className="text-right whitespace-nowrap">{rupiah(jumlah((b) => b.sisa))}</td>
          </tr>
        </tfoot>
      </table>
      <TandaTangan bendahara={pejabat.bendahara} kepala={pejabat.kepala} />
    </div>
  );
}
