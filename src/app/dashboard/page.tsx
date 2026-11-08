import Link from "next/link";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { hitungTagihan } from "@/lib/tagihan";
import { hariIni, rupiah, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Ringkasan({ searchParams }: { searchParams: Promise<{ galat?: string }> }) {
  const u = await wajib();
  const { galat } = await searchParams;
  const sb = db();
  const awalHari = new Date(`${hariIni()}T00:00:00+07:00`).toISOString();

  const [{ data: tagihan }, { data: hariIniTrx }, { data: terbaru }, { count: notifPalsu }] = await Promise.all([
    sb.from("tagihan").select("nominal, potongan, transaksi(jumlah, dibatalkan)"),
    sb.from("transaksi").select("jumlah, metode").eq("dibatalkan", false).gte("waktu", awalHari),
    sb
      .from("transaksi")
      .select("id, no_kuitansi, jumlah, waktu, metode, dibatalkan, siswa(nama)")
      .order("waktu", { ascending: false })
      .limit(8),
    sb.from("log_notifikasi").select("id", { count: "exact", head: true }).eq("signature_valid", false),
  ]);

  let total = 0,
    terkumpul = 0,
    lunas = 0;
  for (const t of tagihan ?? []) {
    const h = hitungTagihan(t);
    total += h.total;
    terkumpul += h.dibayar;
    if (h.status === "lunas") lunas++;
  }
  const masukHariIni = (hariIniTrx ?? []).reduce((a, t) => a + Number(t.jumlah), 0);
  const online = (hariIniTrx ?? []).filter((t) => t.metode === "midtrans").length;

  const kotak = [
    { label: "Total tagihan", nilai: rupiah(total) },
    { label: "Sudah terkumpul", nilai: rupiah(terkumpul), sub: total ? `${Math.round((terkumpul / total) * 100)}%` : "" },
    { label: "Tunggakan", nilai: rupiah(total - terkumpul), sub: `${(tagihan?.length ?? 0) - lunas} tagihan belum lunas` },
    { label: "Masuk hari ini", nilai: rupiah(masukHariIni), sub: `${hariIniTrx?.length ?? 0} transaksi · ${online} online` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Assalamu&apos;alaikum,</p>
        <h1 className="judul">{u.nama}</h1>
      </div>
      {galat === "akses" && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Anda tidak punya akses ke halaman itu.</p>}
      {!!notifPalsu && (
        <Link href="/dashboard/midtrans" className="block rounded-lg bg-red-50 p-3 text-sm text-red-700">
          ⚠ {notifPalsu} notifikasi pembayaran dengan signature SHA-512 tidak valid telah ditolak. Lihat log.
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kotak.map((k) => (
          <div key={k.label} className="kartu">
            <p className="text-xs font-semibold text-gray-500 uppercase">{k.label}</p>
            <p className="mt-1 text-xl font-bold text-[var(--hijau)]">{k.nilai}</p>
            {k.sub && <p className="text-xs text-gray-500">{k.sub}</p>}
          </div>
        ))}
      </div>
      <section className="kartu overflow-x-auto">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Transaksi terbaru</h2>
          <Link href="/dashboard/transaksi" className="text-sm text-[var(--hijau)] underline">
            Semua
          </Link>
        </div>
        <table className="tabel">
          <thead>
            <tr>
              <th>Kuitansi</th>
              <th>Siswa</th>
              <th>Waktu</th>
              <th>Metode</th>
              <th className="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(terbaru ?? []).map((t) => (
              <tr key={t.id} className={t.dibatalkan ? "text-gray-400 line-through" : ""}>
                <td>
                  <Link href={`/dashboard/kuitansi/${t.id}`} className="font-mono text-xs underline">
                    {t.no_kuitansi}
                  </Link>
                </td>
                <td>{(t.siswa as unknown as { nama: string })?.nama}</td>
                <td>{tanggalJam(t.waktu)}</td>
                <td>{t.metode === "midtrans" ? "Midtrans" : "Tunai"}</td>
                <td className="text-right">{rupiah(t.jumlah)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
