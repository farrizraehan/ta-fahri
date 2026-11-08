import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { rupiah } from "@/lib/format";
import { FormTagihan } from "./form-tagihan";

export const dynamic = "force-dynamic";

export default async function BuatTagihan() {
  await wajib("admin", "bendahara");
  const sb = db();
  const [{ data: ta }, { data: biaya }] = await Promise.all([
    sb.from("tahun_ajaran").select("id, nama, aktif").order("nama", { ascending: false }),
    sb.from("jenis_biaya").select("id, nama, nominal, periode").eq("aktif", true).order("urutan"),
  ]);
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="judul">Buat Tagihan</h1>
      <p className="text-sm text-gray-600">
        Biaya <b>sekali bayar</b> (DSP, Kartu OSIS, Map Rapot, Ekskul) diberikan ke siswa baru (kelas 7) dengan batas 3 bulan dari awal tahun ajaran.
        Biaya <b>LKS</b> ditagihkan setiap semester ke semua tingkat.
      </p>
      <FormTagihan
        tahunAjaran={ta ?? []}
        biaya={(biaya ?? []).map((b) => ({ ...b, label: `${b.nama} — ${rupiah(b.nominal)} (${b.periode === "sekali" ? "sekali" : "per semester"})` }))}
      />
    </div>
  );
}
