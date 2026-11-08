import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { hitungTagihan, labelStatus } from "@/lib/tagihan";
import { rupiah, tanggal, tanggalJam } from "@/lib/format";
import { aturPotongan, hapusTagihan } from "../actions";
import { FormBayar } from "./form-bayar";

export const dynamic = "force-dynamic";

export default async function DetailSiswa({ params }: { params: Promise<{ id: string }> }) {
  const u = await wajib();
  const { id } = await params;
  const sb = db();
  const { data: s } = await sb.from("siswa").select("*, kelas(nama)").eq("id", id).maybeSingle();
  if (!s) notFound();
  const [{ data: tagihan }, { data: trx }] = await Promise.all([
    sb
      .from("tagihan")
      .select("id, nominal, potongan, semester, jatuh_tempo, jenis_biaya(nama, urutan), tahun_ajaran(nama), transaksi(jumlah, dibatalkan)")
      .eq("siswa_id", id),
    sb.from("transaksi").select("id, no_kuitansi, jumlah, waktu, metode, petugas_nama, dibatalkan").eq("siswa_id", id).order("waktu", { ascending: false }),
  ]);

  const baris = (tagihan ?? [])
    .map((t) => {
      const jb = t.jenis_biaya as unknown as { nama: string; urutan: number };
      const ta = t.tahun_ajaran as unknown as { nama: string };
      return { ...t, nama: jb.nama, urutan: jb.urutan, ta: ta.nama, h: hitungTagihan(t) };
    })
    .sort((a, b) => a.ta.localeCompare(b.ta) || a.urutan - b.urutan);
  const bisaBayar = u.peran === "bendahara" || u.peran === "admin";
  const warna = { lunas: "bg-green-100 text-green-800", sebagian: "bg-amber-100 text-amber-800", belum: "bg-red-100 text-red-800" };

  return (
    <div className="space-y-5">
      <Link href="/dashboard/siswa" className="text-sm text-gray-500 hover:underline">← Daftar siswa</Link>
      <div className="kartu grid gap-2 text-sm sm:grid-cols-3">
        <div className="sm:col-span-3">
          <h1 className="judul">{s.nama}</h1>
        </div>
        <p>Kelas: <b>{(s.kelas as { nama: string } | null)?.nama ?? "-"}</b></p>
        <p>NISN: <b className="font-mono">{s.nisn ?? "-"}</b></p>
        <p>NIS: <b className="font-mono">{s.nis ?? "-"}</b></p>
        <p>Wali: <b>{s.nama_wali ?? "-"}</b></p>
        <p>HP wali: <b>{s.hp_wali ?? "-"}</b></p>
        <p>Tahun masuk: <b>{s.tahun_masuk ?? "-"}</b></p>
      </div>

      <section className="kartu overflow-x-auto">
        <h2 className="mb-3 font-bold">Tagihan</h2>
        {!baris.length && <p className="text-sm text-gray-500">Belum ada tagihan. Buat lewat menu Buat Tagihan.</p>}
        <table className="tabel">
          <thead>
            <tr>
              <th>Biaya</th>
              <th>Periode</th>
              <th>Batas</th>
              <th className="text-right">Total</th>
              <th className="text-right">Dibayar</th>
              <th>Status</th>
              {bisaBayar && <th>Bayar tunai</th>}
            </tr>
          </thead>
          <tbody>
            {baris.map((t) => (
              <tr key={t.id}>
                <td className="font-medium">
                  {t.nama}
                  {Number(t.potongan) > 0 && <p className="text-xs text-gray-500">potongan {rupiah(t.potongan)}</p>}
                  {u.peran === "admin" && (
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer text-gray-500">atur</summary>
                      <form action={aturPotongan} className="mt-1 flex gap-1">
                        <input type="hidden" name="tagihan_id" value={t.id} />
                        <input name="potongan" defaultValue={t.potongan} className="isian w-28 py-1" aria-label="Potongan" />
                        <button className="tombol-garis px-2 py-1">Simpan</button>
                      </form>
                      {t.h.dibayar === 0 && (
                        <form action={hapusTagihan} className="mt-1">
                          <input type="hidden" name="tagihan_id" value={t.id} />
                          <button className="text-red-700 underline">Hapus tagihan</button>
                        </form>
                      )}
                    </details>
                  )}
                </td>
                <td>{t.semester ? `${t.semester} ${t.ta}` : `Sekali (${t.ta})`}</td>
                <td>{t.jatuh_tempo ? tanggal(t.jatuh_tempo) : "-"}</td>
                <td className="text-right">{rupiah(t.h.total)}</td>
                <td className="text-right">{rupiah(t.h.dibayar)}</td>
                <td>
                  <span className={`lencana ${warna[t.h.status]}`}>{labelStatus[t.h.status]}</span>
                </td>
                {bisaBayar && <td>{t.h.sisa > 0 ? <FormBayar tagihanId={t.id} sisa={t.h.sisa} /> : "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="kartu overflow-x-auto">
        <h2 className="mb-3 font-bold">Riwayat transaksi</h2>
        <table className="tabel">
          <thead>
            <tr>
              <th>Kuitansi</th>
              <th>Waktu</th>
              <th>Metode</th>
              <th>Petugas</th>
              <th className="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(trx ?? []).map((t) => (
              <tr key={t.id} className={t.dibatalkan ? "text-gray-400 line-through" : ""}>
                <td>
                  <Link href={`/dashboard/kuitansi/${t.id}`} className="font-mono text-xs underline">{t.no_kuitansi}</Link>
                </td>
                <td>{tanggalJam(t.waktu)}</td>
                <td>{t.metode === "midtrans" ? "Midtrans" : "Tunai"}</td>
                <td>{t.petugas_nama}</td>
                <td className="text-right">{rupiah(t.jumlah)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
