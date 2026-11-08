import Link from "next/link";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { hitungTagihan } from "@/lib/tagihan";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DaftarSiswa({ searchParams }: { searchParams: Promise<{ q?: string; kelas?: string; status?: string }> }) {
  await wajib();
  const { q = "", kelas = "", status = "" } = await searchParams;
  const sb = db();
  const { data: daftarKelas } = await sb.from("kelas").select("id, nama").order("nama");

  let query = sb
    .from("siswa")
    .select("id, nama, nis, nisn, kelas(nama), tagihan(nominal, potongan, transaksi(jumlah, dibatalkan))")
    .eq("status", "aktif")
    .order("nama")
    .limit(500);
  if (kelas) query = query.eq("kelas_id", Number(kelas));
  if (q) {
    const aman = q.replace(/[^\p{L}\p{N} '.-]/gu, "");
    query = query.or(`nama.ilike.%${aman}%,nisn.ilike.%${aman}%,nis.ilike.%${aman}%`);
  }
  const { data: siswa } = await query;

  const baris = (siswa ?? [])
    .map((s) => {
      const ts = (s.tagihan ?? []).map((t) => hitungTagihan(t));
      const total = ts.reduce((a, t) => a + t.total, 0);
      const sisa = ts.reduce((a, t) => a + t.sisa, 0);
      return { ...s, total, sisa, kelasNama: (s.kelas as unknown as { nama: string } | null)?.nama ?? "-" };
    })
    .filter((s) => (status === "nunggak" ? s.sisa > 0 : status === "lunas" ? s.total > 0 && s.sisa === 0 : true));

  return (
    <div className="space-y-5">
      <h1 className="judul">Siswa & Tagihan</h1>
      <form className="kartu flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="q">Cari nama / NISN / NIS</label>
          <input id="q" name="q" defaultValue={q} className="isian" />
        </div>
        <div>
          <label className="label" htmlFor="kelas">Kelas</label>
          <select id="kelas" name="kelas" defaultValue={kelas} className="isian">
            <option value="">Semua</option>
            {daftarKelas?.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status} className="isian">
            <option value="">Semua</option>
            <option value="nunggak">Masih ada tunggakan</option>
            <option value="lunas">Lunas</option>
          </select>
        </div>
        <button className="tombol">Tampilkan</button>
      </form>

      <div className="kartu overflow-x-auto">
        <p className="mb-2 text-sm text-gray-500">{baris.length} siswa</p>
        <table className="tabel">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Kelas</th>
              <th>NISN</th>
              <th className="text-right">Tagihan</th>
              <th className="text-right">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/dashboard/siswa/${s.id}`} className="font-medium text-[var(--hijau)] underline">
                    {s.nama}
                  </Link>
                </td>
                <td>{s.kelasNama}</td>
                <td className="font-mono text-xs">{s.nisn ?? "-"}</td>
                <td className="text-right">{rupiah(s.total)}</td>
                <td className={`text-right font-semibold ${s.sisa ? "text-red-700" : "text-green-700"}`}>
                  {s.total === 0 ? "-" : s.sisa ? rupiah(s.sisa) : "Lunas"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
