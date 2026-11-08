import Link from "next/link";
import { wajib } from "@/lib/auth";
import { ambilTransaksi, namaPejabat } from "@/lib/laporan";
import { hariIni, rupiah, tanggal, tanggalJam, terbilang } from "@/lib/format";
import { BilahCetak, KopSurat, TandaTangan } from "@/components/cetak";

export const dynamic = "force-dynamic";

export default async function CetakTransaksi({ searchParams }: { searchParams: Promise<{ dari?: string; sampai?: string; metode?: string }> }) {
  await wajib();
  const p = await searchParams;
  const sampai = p.sampai || hariIni();
  const dari = p.dari || sampai.slice(0, 8) + "01";
  const [data, pejabat] = await Promise.all([ambilTransaksi({ dari, sampai, metode: p.metode }, "naik"), namaPejabat()]);

  const sah = data.filter((t) => !t.dibatalkan);
  const total = sah.reduce((a, t) => a + t.jumlah, 0);
  const tunai = sah.filter((t) => t.metode === "tunai").reduce((a, t) => a + t.jumlah, 0);
  const periode = dari === sampai ? tanggal(dari) : `${tanggal(dari)} s.d. ${tanggal(sampai)}`;
  const metode = p.metode === "tunai" ? " — Tunai" : p.metode === "midtrans" ? " — Midtrans" : "";

  return (
    <div className="mx-auto max-w-5xl bg-white p-4 text-black print:p-0">
      <style>{"@page { size: A4 landscape; margin: 12mm; }"}</style>
      <BilahCetak kembali={<Link href={`/dashboard/transaksi?dari=${dari}&sampai=${sampai}`} className="text-sm text-gray-500 hover:underline">← Transaksi</Link>} />
      <KopSurat judul="Laporan Transaksi Pembayaran Siswa" sub={`Periode ${periode}${metode}`} />

      <table className="w-full border-collapse text-xs [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:bg-gray-100 [&_th]:px-1.5 [&_th]:py-1">
        <thead>
          <tr>
            <th>No</th>
            <th>No. Kuitansi</th>
            <th>Waktu</th>
            <th>Nama Siswa</th>
            <th>Kelas</th>
            <th>Pembayaran</th>
            <th>Metode</th>
            <th>Petugas</th>
            <th>Jumlah</th>
            <th>SHA-512 (16 awal)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((t, i) => (
            <tr key={t.id} className={t.dibatalkan ? "text-gray-500 line-through" : ""}>
              <td className="text-center">{i + 1}</td>
              <td className="font-mono whitespace-nowrap">{t.no_kuitansi}</td>
              <td className="whitespace-nowrap">{tanggalJam(t.waktu)}</td>
              <td>{t.siswaNama}</td>
              <td className="text-center">{t.kelas}</td>
              <td>{t.pembayaran}</td>
              <td>{t.metode === "midtrans" ? "Midtrans" : "Tunai"}</td>
              <td>{t.petugas_nama}</td>
              <td className="text-right whitespace-nowrap">{rupiah(t.jumlah)}</td>
              <td className="font-mono text-[10px]">{t.hash_sha512.slice(0, 16)}</td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td colSpan={10} className="text-center">Tidak ada transaksi pada periode ini.</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td colSpan={8} className="text-right">Tunai {rupiah(tunai)} · Midtrans {rupiah(total - tunai)} · TOTAL</td>
            <td className="text-right whitespace-nowrap">{rupiah(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-xs">
        Terbilang: <i>{terbilang(total)}</i>. Jumlah transaksi sah: {sah.length}
        {data.length !== sah.length && `, dibatalkan: ${data.length - sah.length} (dicoret, tidak dijumlahkan)`}.
      </p>
      <TandaTangan bendahara={pejabat.bendahara} kepala={pejabat.kepala} />
    </div>
  );
}
