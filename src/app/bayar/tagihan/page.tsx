import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { sesiWali } from "@/lib/sesi-wali";
import { hitungTagihan, labelStatus } from "@/lib/tagihan";
import { rupiah, tanggal, tanggalJam } from "@/lib/format";
import { keluarWali } from "../actions";
import { PilihBayar } from "./pilih-bayar";

export const dynamic = "force-dynamic";

export default async function TagihanWali() {
  const siswaId = await sesiWali();
  if (!siswaId) redirect("/bayar");
  const sb = db();
  const [{ data: siswa }, { data: tagihan }, { data: riwayat }, { data: pending }] = await Promise.all([
    sb.from("siswa").select("nama, nis, nisn, kelas(nama)").eq("id", siswaId).single(),
    sb
      .from("tagihan")
      .select("id, nominal, potongan, semester, jatuh_tempo, jenis_biaya(nama, urutan), tahun_ajaran(nama), transaksi(jumlah, dibatalkan)")
      .eq("siswa_id", siswaId),
    sb
      .from("transaksi")
      .select("id, no_kuitansi, jumlah, waktu, metode, dibatalkan, hash_sha512")
      .eq("siswa_id", siswaId)
      .order("waktu", { ascending: false }),
    sb.from("pesanan").select("order_id, jumlah, dibuat").eq("siswa_id", siswaId).eq("status", "pending").order("dibuat", { ascending: false }).limit(3),
  ]);

  const baris = (tagihan ?? [])
    .map((t) => {
      const jb = t.jenis_biaya as unknown as { nama: string; urutan: number };
      const ta = t.tahun_ajaran as unknown as { nama: string };
      return { id: t.id, nama: `${jb.nama}${t.semester ? ` — semester ${t.semester} ${ta.nama}` : ""}`, urutan: jb.urutan, jatuhTempo: t.jatuh_tempo, ...hitungTagihan(t) };
    })
    .sort((a, b) => a.urutan - b.urutan);
  const kelas = (siswa?.kelas as unknown as { nama: string } | null)?.nama;

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-[var(--emas)] uppercase">Tagihan siswa</p>
          <h1 className="judul">{siswa?.nama}</h1>
          <p className="text-sm text-gray-600">
            Kelas {kelas ?? "-"} · NISN {siswa?.nisn ?? "-"}
          </p>
        </div>
        <form action={keluarWali}>
          <button className="tombol-garis">Keluar</button>
        </form>
      </div>

      {!!pending?.length && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Ada {pending.length} pembayaran yang menunggu diselesaikan. Status berubah otomatis setelah notifikasi Midtrans terverifikasi SHA-512 — muat ulang halaman ini beberapa saat lagi.
        </p>
      )}

      <PilihBayar
        tagihan={baris.map((b) => ({
          id: b.id,
          nama: b.nama,
          total: b.total,
          sisa: b.sisa,
          status: labelStatus[b.status],
          jatuhTempo: b.jatuhTempo ? tanggal(b.jatuhTempo) : null,
        }))}
      />

      <section className="kartu">
        <h2 className="mb-3 font-bold">Riwayat pembayaran</h2>
        {!riwayat?.length ? (
          <p className="text-sm text-gray-500">Belum ada pembayaran.</p>
        ) : (
          <ul className="divide-y text-sm">
            {riwayat.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-mono text-xs">{r.no_kuitansi}</p>
                  <p className="text-gray-500">
                    {tanggalJam(r.waktu)} · {r.metode === "midtrans" ? "Online" : "Tunai"}
                    {r.dibatalkan && " · dibatalkan"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{rupiah(r.jumlah)}</p>
                  <Link href={`/cek/${r.no_kuitansi}?h=${r.hash_sha512.slice(0, 32)}`} className="text-xs text-[var(--hijau)] underline">
                    Cek keaslian
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
