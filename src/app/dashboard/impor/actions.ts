"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { bacaExcelSiswa } from "@/lib/impor-siswa";

export async function imporSiswa(_: unknown, form: FormData) {
  await wajib("admin");
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { galat: "Pilih file Excel (.xlsx)." };
  if (file.size > 5_000_000) return { galat: "File terlalu besar (maks 5 MB)." };

  let baris;
  try {
    baris = await bacaExcelSiswa(await file.arrayBuffer());
  } catch {
    return { galat: "File tidak bisa dibaca. Pastikan format .xlsx." };
  }
  if (!baris.length) return { galat: "Tidak ada data siswa. Pastikan ada kolom 'Nama Lengkap' dan NIS/NISN." };

  const sb = db();
  const { data: kelas } = await sb.from("kelas").select("id, nama");
  const idKelas = new Map((kelas ?? []).map((k) => [k.nama, k.id]));

  // gabungkan dengan data yang sudah ada (cocokkan NISN lalu NIS) supaya impor ulang tidak membuat data dobel
  const { data: ada } = await sb.from("siswa").select("id, nis, nisn");
  const byNisn = new Map((ada ?? []).filter((s) => s.nisn).map((s) => [s.nisn, s]));
  const byNis = new Map((ada ?? []).filter((s) => s.nis).map((s) => [s.nis, s]));

  let baru = 0,
    perbarui = 0;
  const gagal: string[] = [];
  const sisipkan: Record<string, unknown>[] = [];
  for (const b of baris) {
    const lama = (b.nisn && byNisn.get(b.nisn)) || (b.nis && byNis.get(b.nis)) || null;
    const { kelas: namaKelas, ...isi } = b;
    const data = {
      ...Object.fromEntries(Object.entries(isi).filter(([, v]) => v !== null)),
      kelas_id: namaKelas ? (idKelas.get(namaKelas) ?? null) : null,
    };
    if (!lama) {
      sisipkan.push(data);
      continue;
    }
    const { error } = await sb.from("siswa").update(data).eq("id", lama.id);
    if (error) gagal.push(`${b.nama}: ${error.message}`);
    else perbarui++;
  }
  // siswa baru disisipkan sekaligus (NISN/NIS ganda di dalam file yang sama diambil yang pertama)
  const dilihat = new Set<string>();
  const nisTerpakai = new Set<string>();
  const unik = sisipkan.filter((d) => {
    const k = String(d.nisn ?? d.nis);
    if (dilihat.has(k)) return false;
    dilihat.add(k);
    // NIS ganda di data sekolah: simpan tanpa NIS, identitas tetap pakai NISN
    const nis = d.nis as string | undefined;
    if (nis && d.nisn && (nisTerpakai.has(nis) || byNis.has(nis))) {
      gagal.push(`${d.nama}: NIS ${nis} sudah dipakai siswa lain — disimpan tanpa NIS`);
      delete d.nis;
    } else if (nis) nisTerpakai.add(nis);
    return true;
  });
  for (let i = 0; i < unik.length; i += 200) {
    const { error, count } = await sb.from("siswa").insert(unik.slice(i, i + 200), { count: "exact" });
    if (error) gagal.push(`Baris ${i + 1}–${i + 200}: ${error.message}`);
    else baru += count ?? 0;
  }
  revalidatePath("/dashboard/siswa");
  return { pesan: `${baru} siswa baru, ${perbarui} diperbarui.`, gagal: gagal.slice(0, 20) };
}
