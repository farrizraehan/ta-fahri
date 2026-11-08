import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { auditSemua, cekKuitansi } from "@/lib/cek";
import { rupiah, tanggalJam } from "@/lib/format";
import { UjiSha512 } from "./uji-sha512";

export const dynamic = "force-dynamic";

async function cekManual(form: FormData) {
  "use server";
  await wajib();
  const no = String(form.get("no") ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const h = String(form.get("h") ?? "").trim().toLowerCase().replace(/[^0-9a-f]/g, "");
  if (!no) return;
  redirect(`/dashboard/validasi?no=${no}${h ? `&h=${h}` : ""}`);
}

export default async function Validasi({ searchParams }: { searchParams: Promise<{ no?: string; h?: string; audit?: string }> }) {
  await wajib();
  const p = await searchParams;
  const sb = db();
  const hasilManual = p.no ? await cekKuitansi(p.no, p.h ?? null, "petugas") : null;

  // Audit integritas: hitung ulang hash seluruh transaksi
  const audit = p.audit ? await auditSemua() : null;

  const { data: log } = await sb.from("log_validasi").select("*").order("waktu", { ascending: false }).limit(30);
  const warna: Record<string, string> = {
    valid: "bg-green-100 text-green-800",
    dibatalkan: "bg-amber-100 text-amber-800",
    tidak_valid: "bg-red-100 text-red-800",
    tidak_ditemukan: "bg-gray-200 text-gray-700",
  };

  return (
    <div className="space-y-5">
      <h1 className="judul">Validasi SHA-512</h1>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="kartu space-y-3">
          <h2 className="font-bold">Cek satu kuitansi</h2>
          <form action={cekManual} className="space-y-3">
            <input name="no" defaultValue={p.no} required placeholder="Nomor kuitansi" className="isian font-mono" aria-label="Nomor kuitansi" />
            <textarea name="h" defaultValue={p.h} rows={2} placeholder="Kode SHA-512 di kuitansi (opsional)" className="isian font-mono text-xs" aria-label="Hash" />
            <button className="tombol">Validasi</button>
          </form>
          {hasilManual && (
            <div className={`rounded-lg p-3 text-sm ${warna[hasilManual.hasil]}`}>
              <b>{hasilManual.hasil.replace("_", " ").toUpperCase()}</b> — {hasilManual.alasan}
              {hasilManual.t && (
                <p className="mt-1">
                  <Link href={`/dashboard/kuitansi/${hasilManual.t.id}`} className="underline">Lihat kuitansi</Link> · {rupiah(hasilManual.t.jumlah)}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="kartu space-y-3">
          <h2 className="font-bold">Audit integritas seluruh transaksi</h2>
          <p className="text-sm text-gray-600">
            Menghitung ulang SHA-512 setiap transaksi dan membandingkannya dengan hash tersimpan. Transaksi yang datanya diubah langsung di database akan terdeteksi.
          </p>
          <Link href="/dashboard/validasi?audit=1" className="tombol">Jalankan audit</Link>
          {audit && (
            <div className={`rounded-lg p-3 text-sm ${audit.rusak.length ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
              {audit.total} transaksi diperiksa dalam {audit.ms} ms. <b>{audit.rusak.length} tidak valid.</b>
              {audit.rusak.map((r) => (
                <p key={r.id}>
                  <Link href={`/dashboard/kuitansi/${r.id}`} className="font-mono underline">{r.no}</Link> — tercatat {rupiah(r.jumlah)}, {tanggalJam(r.waktu)}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>

      <UjiSha512 />

      <section className="kartu overflow-x-auto">
        <h2 className="mb-3 font-bold">Log validasi terbaru</h2>
        <table className="tabel">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Sumber</th>
              <th>Kuitansi</th>
              <th>Hasil</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {(log ?? []).map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{tanggalJam(l.waktu)}</td>
                <td>{l.sumber}</td>
                <td className="font-mono text-xs">{l.no_kuitansi ?? "-"}</td>
                <td><span className={`lencana ${warna[l.hasil]}`}>{l.hasil}</span></td>
                <td className="text-xs">{l.alasan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
