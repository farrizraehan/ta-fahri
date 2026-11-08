// Impor siswa dari file Excel lewat terminal (logika baca sama dengan menu Impor Siswa).
// Jalankan: npm run impor-siswa -- "path/file1.xlsx" "path/file2.xlsx"
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { bacaExcelSiswa, type BarisSiswa } from "../src/lib/impor-siswa.ts";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Sebutkan file Excel yang akan diimpor.");
  process.exit(1);
}

const { data: kelas } = await sb.from("kelas").select("id, nama");
const idKelas = new Map((kelas ?? []).map((k) => [k.nama, k.id]));

for (const f of files) {
  const buf = await readFile(f);
  const baris: BarisSiswa[] = await bacaExcelSiswa(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const { data: ada } = await sb.from("siswa").select("id, nis, nisn");
  const byNisn = new Map((ada ?? []).filter((s) => s.nisn).map((s) => [s.nisn, s.id]));
  const byNis = new Map((ada ?? []).filter((s) => s.nis).map((s) => [s.nis, s.id]));

  let baru = 0,
    ubah = 0;
  const gagal: string[] = [];
  const sisip: Record<string, unknown>[] = [];
  const dilihat = new Set<string>();
  const nisTerpakai = new Set<string>();
  for (const b of baris) {
    const { kelas: k, ...isi } = b;
    const data = { ...Object.fromEntries(Object.entries(isi).filter(([, v]) => v !== null)), kelas_id: k ? (idKelas.get(k) ?? null) : null };
    const id = (b.nisn && byNisn.get(b.nisn)) || (b.nis && byNis.get(b.nis));
    if (id) {
      const { error } = await sb.from("siswa").update(data).eq("id", id);
      if (error) gagal.push(`${b.nama}: ${error.message}`);
      else ubah++;
    } else {
      const kunci = String(b.nisn ?? b.nis);
      if (dilihat.has(kunci)) {
        gagal.push(`${b.nama}: NISN/NIS ganda di file`);
        continue;
      }
      dilihat.add(kunci);
      // NIS yang sama dipakai siswa lain (salah ketik di data sekolah): simpan tanpa NIS, identitas pakai NISN
      if (b.nis && b.nisn && (nisTerpakai.has(b.nis) || byNis.has(b.nis))) {
        gagal.push(`${b.nama} (NISN ${b.nisn}): NIS ${b.nis} sudah dipakai siswa lain — disimpan tanpa NIS`);
        delete (data as Record<string, unknown>).nis;
      } else if (b.nis) nisTerpakai.add(b.nis);
      sisip.push(data);
    }
  }
  for (let i = 0; i < sisip.length; i += 200) {
    const { error, count } = await sb.from("siswa").insert(sisip.slice(i, i + 200), { count: "exact" });
    if (error) gagal.push(`batch ${i}: ${error.message}`);
    else baru += count ?? 0;
  }
  console.log(`${f}: dibaca ${baris.length}, baru ${baru}, diperbarui ${ubah}${gagal.length ? `, gagal ${gagal.length}` : ""}`);
  gagal.slice(0, 10).forEach((g) => console.log("   ✖", g));
}
