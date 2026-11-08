import type { SupabaseClient } from "@supabase/supabase-js";
import { tambahBulan } from "./tagihan.ts";

/**
 * Membuat tagihan massal.
 *  - Biaya 'sekali' (DSP, OSIS, Map Rapot, Ekskul): untuk siswa di tingkat terpilih (biasanya kelas 7 / siswa baru),
 *    batas bayar = awal tahun ajaran + 3 bulan.
 *  - Biaya 'semester' (LKS): untuk semester terpilih, batas = awal semester + 3 bulan.
 * Tagihan yang sudah ada dilewati (tidak dobel).
 */
export async function buatTagihan(
  sb: SupabaseClient,
  taId: number,
  biayaIds: number[],
  tingkat: number[],
  semester: "ganjil" | "genap",
): Promise<{ galat?: string; pesan?: string }> {

  const [{ data: ta }, { data: biaya }, { data: kelas }] = await Promise.all([
    sb.from("tahun_ajaran").select("*").eq("id", taId).single(),
    sb.from("jenis_biaya").select("*").in("id", biayaIds),
    sb.from("kelas").select("id").in("tingkat", tingkat),
  ]);
  if (!ta || !biaya?.length) return { galat: "Data tidak ditemukan." };

  const { data: siswa } = await sb
    .from("siswa")
    .select("id")
    .eq("status", "aktif")
    .in("kelas_id", (kelas ?? []).map((k) => k.id));
  if (!siswa?.length) return { galat: "Tidak ada siswa aktif di tingkat tersebut." };

  const { data: ada } = await sb
    .from("tagihan")
    .select("siswa_id, jenis_biaya_id, tahun_ajaran_id, semester")
    .in("jenis_biaya_id", biayaIds)
    .in("siswa_id", siswa.map((s) => s.id));
  const kunci = (sId: string, b: { id: number; periode: string }) => (b.periode === "sekali" ? `${sId}|${b.id}` : `${sId}|${b.id}|${taId}|${semester}`);
  const sudah = new Set(
    (ada ?? []).map((t) => (t.semester ? `${t.siswa_id}|${t.jenis_biaya_id}|${t.tahun_ajaran_id}|${t.semester}` : `${t.siswa_id}|${t.jenis_biaya_id}`)),
  );

  const baru = [];
  for (const s of siswa) {
    for (const b of biaya) {
      if (sudah.has(kunci(s.id, b))) continue;
      const mulai = b.periode === "semester" && semester === "genap" ? ta.mulai_genap : ta.mulai;
      baru.push({
        siswa_id: s.id,
        jenis_biaya_id: b.id,
        tahun_ajaran_id: taId,
        semester: b.periode === "semester" ? semester : null,
        nominal: b.nominal,
        jatuh_tempo: tambahBulan(mulai, b.batas_bulan),
      });
    }
  }
  for (let i = 0; i < baru.length; i += 500) {
    const { error } = await sb.from("tagihan").insert(baru.slice(i, i + 500));
    if (error) return { galat: error.message };
  }
  return { pesan: `${baru.length} tagihan dibuat untuk ${siswa.length} siswa (yang sudah ada dilewati).` };
}
