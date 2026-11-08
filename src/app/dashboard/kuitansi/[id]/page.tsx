import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, kunciSha512 } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { validasi } from "@/lib/validasi";
import { qrSvg, urlCek } from "@/lib/qr";
import { rupiah, tanggalJam, terbilang } from "@/lib/format";
import { TombolCetak } from "./tombol-cetak";
import { batalkan } from "../../transaksi/actions";

export const dynamic = "force-dynamic";

export default async function Kuitansi({ params }: { params: Promise<{ id: string }> }) {
  const u = await wajib();
  const { id } = await params;
  const { data: t } = await db()
    .from("transaksi")
    .select("*, siswa(nama, nisn, nis, kelas(nama)), tagihan(semester, jenis_biaya(nama), tahun_ajaran(nama))")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const v = validasi(t, kunciSha512());
  const s = t.siswa as { nama: string; nisn: string | null; nis: string | null; kelas: { nama: string } | null };
  const tg = t.tagihan as { semester: string | null; jenis_biaya: { nama: string }; tahun_ajaran: { nama: string } };
  const svg = await qrSvg(urlCek(t.no_kuitansi, t.hash_sha512));
  const untuk = `${tg.jenis_biaya.nama}${tg.semester ? ` semester ${tg.semester}` : ""} — TA ${tg.tahun_ajaran.nama}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="tanpa-cetak flex flex-wrap items-center justify-between gap-2">
        <Link href="/dashboard/transaksi" className="text-sm text-gray-500 hover:underline">← Transaksi</Link>
        <div className="flex gap-2">
          {(u.peran === "bendahara" || u.peran === "admin") && !t.dibatalkan && (
            <details className="relative">
              <summary className="tombol-bahaya cursor-pointer list-none">Batalkan</summary>
              <form action={batalkan} className="kartu absolute right-0 z-10 mt-1 w-72 space-y-2">
                <input type="hidden" name="id" value={t.id} />
                <label className="label" htmlFor="alasan">Alasan pembatalan</label>
                <input id="alasan" name="alasan" required className="isian" />
                <button className="tombol-bahaya w-full">Ya, batalkan transaksi</button>
              </form>
            </details>
          )}
          <TombolCetak />
        </div>
      </div>

      <div
        className={`tanpa-cetak rounded-lg p-3 text-sm ${v.hasil === "valid" ? "bg-green-50 text-green-800" : v.hasil === "dibatalkan" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"}`}
      >
        <b>{v.hasil === "valid" ? "✔ VALID" : v.hasil === "dibatalkan" ? "DIBATALKAN" : "✖ TIDAK VALID"}</b> — {v.alasan}
      </div>

      <article className="relative overflow-hidden rounded-xl border-2 border-[var(--hijau)] bg-white p-6 print:border-black">
        {t.dibatalkan && (
          <p className="pointer-events-none absolute inset-0 flex rotate-[-20deg] items-center justify-center text-7xl font-black text-red-600/20">BATAL</p>
        )}
        <header className="flex items-center gap-4 border-b-2 border-[var(--hijau)] pb-3">
          <Image src="/logo.png" alt="" width={64} height={64} />
          <div className="flex-1">
            <p className="text-lg font-bold">MTs AL RIYADHUL JANAH MAJA</p>
            <p className="text-xs text-gray-600">Kp. Maja, Kec. Maja, Kab. Lebak, Banten</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black tracking-widest text-[var(--hijau)]">KUITANSI</p>
            <p className="font-mono text-sm">{t.no_kuitansi}</p>
          </div>
        </header>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <dl className="grid grid-cols-[9rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-gray-500">Telah terima dari</dt>
            <dd className="font-semibold">{s.nama} ({s.kelas?.nama ?? "-"})</dd>
            <dt className="text-gray-500">NISN</dt>
            <dd className="font-mono">{s.nisn ?? s.nis ?? "-"}</dd>
            <dt className="text-gray-500">Uang sejumlah</dt>
            <dd className="italic">{terbilang(Number(t.jumlah))}</dd>
            <dt className="text-gray-500">Untuk pembayaran</dt>
            <dd>{untuk}</dd>
            <dt className="text-gray-500">Metode</dt>
            <dd>{t.metode === "midtrans" ? `Online Midtrans (${t.order_id})` : "Tunai"}</dd>
            <dt className="text-gray-500">Waktu</dt>
            <dd>{tanggalJam(t.waktu)} WIB</dd>
          </dl>
          <div className="text-center">
            <div className="mx-auto w-32" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-1 text-[10px] text-gray-500">Scan untuk cek keaslian</p>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <p className="rounded-lg bg-[var(--hijau)] px-4 py-2 text-xl font-bold text-white print:border print:border-black print:bg-white print:text-black">
            {rupiah(t.jumlah)}
          </p>
          <div className="text-center text-sm">
            <p>Petugas,</p>
            <p className="mt-10 font-semibold underline">{t.petugas_nama}</p>
          </div>
        </div>

        <footer className="mt-4 border-t pt-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase">Tanda tangan digital SHA-512</p>
          <p className="font-mono text-[9px] leading-tight break-all text-gray-600">{t.hash_sha512}</p>
        </footer>
      </article>
    </div>
  );
}
