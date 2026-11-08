import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { FormAkunMassal } from "./form-akun";

export const dynamic = "force-dynamic";

export default async function AkunSiswa() {
  await wajib("admin");
  const sb = db();
  const [{ data: kelas }, { data: siswa, error }] = await Promise.all([
    sb.from("kelas").select("id, nama").order("nama"),
    sb.from("siswa").select("kelas_id, akun_siswa(wajib_ganti, aktif, kunci_sampai)").eq("status", "aktif"),
  ]);

  if (error) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="judul">Akun Wali Siswa</h1>
        <p className="kartu text-sm text-red-700">
          Tabel akun belum ada. Jalankan <code>supabase/migrasi-02-akun-siswa.sql</code> di Supabase SQL Editor.
        </p>
      </div>
    );
  }

  const sekarang = new Date().toISOString();
  const rekap = (kelas ?? []).map((k) => {
    const s = (siswa ?? []).filter((x) => x.kelas_id === k.id);
    const akun = s.map((x) => x.akun_siswa as unknown as { wajib_ganti: boolean; kunci_sampai: string | null } | null).filter(Boolean) as {
      wajib_ganti: boolean;
      kunci_sampai: string | null;
    }[];
    return {
      ...k,
      siswa: s.length,
      akun: akun.length,
      belumGanti: akun.filter((a) => a.wajib_ganti).length,
      terkunci: akun.filter((a) => a.kunci_sampai && a.kunci_sampai > sekarang).length,
    };
  });
  const total = rekap.reduce((a, r) => ({ siswa: a.siswa + r.siswa, akun: a.akun + r.akun }), { siswa: 0, akun: 0 });

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="judul">Akun Wali Siswa</h1>
      <p className="text-sm text-gray-600">
        Wali masuk di halaman <b>/bayar</b> dengan NISN (atau NIS) dan kata sandi. Kata sandi awal dibuat acak, hanya muncul sekali di file Excel
        yang diunduh, dan wajib diganti saat login pertama. Sistem hanya menyimpan hash kata sandi (scrypt).
      </p>

      <FormAkunMassal kelas={(kelas ?? []).map((k) => ({ id: k.id, nama: k.nama }))} />

      <section className="kartu overflow-x-auto">
        <h2 className="mb-3 font-bold">
          Status akun · {total.akun} dari {total.siswa} siswa aktif sudah punya akun
        </h2>
        <table className="tabel">
          <thead>
            <tr>
              <th>Kelas</th>
              <th className="text-right">Siswa aktif</th>
              <th className="text-right">Sudah punya akun</th>
              <th className="text-right">Belum ganti sandi</th>
              <th className="text-right">Terkunci</th>
            </tr>
          </thead>
          <tbody>
            {rekap.map((r) => (
              <tr key={r.id}>
                <td>{r.nama}</td>
                <td className="text-right">{r.siswa}</td>
                <td className={`text-right ${r.akun < r.siswa ? "text-amber-700" : "text-green-700"}`}>{r.akun}</td>
                <td className="text-right">{r.belumGanti}</td>
                <td className="text-right">{r.terkunci}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
