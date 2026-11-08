import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function simpan(form: FormData) {
  "use server";
  await wajib("admin");
  const id = Number(form.get("id"));
  await db()
    .from("jenis_biaya")
    .update({
      nama: String(form.get("nama")).trim(),
      nominal: Math.round(Number(String(form.get("nominal")).replace(/\D/g, ""))),
      batas_bulan: Number(form.get("batas_bulan")) || 3,
      aktif: form.get("aktif") === "on",
    })
    .eq("id", id);
  revalidatePath("/dashboard/biaya");
}

export default async function JenisBiaya() {
  await wajib("admin");
  const { data } = await db().from("jenis_biaya").select("*").order("urutan");
  const total = (data ?? []).filter((b) => b.aktif).reduce((a, b) => a + Number(b.nominal), 0);
  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="judul">Jenis Biaya</h1>
      <p className="text-sm text-gray-600">
        Perubahan nominal hanya berlaku untuk tagihan yang dibuat setelahnya. Total biaya aktif: <b>Rp {total.toLocaleString("id-ID")}</b>
      </p>
      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Periode</th>
              <th>Nominal</th>
              <th>Batas (bulan)</th>
              <th>Aktif</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((b) => (
              <tr key={b.id}>
                <td className="font-mono text-xs">{b.kode}</td>
                <td colSpan={6} className="p-0">
                  <form action={simpan} className="grid grid-cols-[1fr_6rem_8rem_6rem_4rem_auto] items-center gap-2 px-3 py-2">
                    <input type="hidden" name="id" value={b.id} />
                    <input name="nama" defaultValue={b.nama} className="isian" aria-label="Nama" />
                    <span>{b.periode === "sekali" ? "Sekali" : "Semester"}</span>
                    <input name="nominal" defaultValue={b.nominal} className="isian" aria-label="Nominal" />
                    <input name="batas_bulan" type="number" min={1} max={12} defaultValue={b.batas_bulan} className="isian" aria-label="Batas bulan" />
                    <input name="aktif" type="checkbox" defaultChecked={b.aktif} className="accent-green-800" aria-label="Aktif" />
                    <button className="tombol-garis px-3 py-1">Simpan</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
