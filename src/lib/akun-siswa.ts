import "server-only";
import ExcelJS from "exceljs";
import { db } from "./supabase";
import { hashSandi, sandiAcak } from "./sandi.ts";

export type AkunBaru = { kelas: string; nama: string; nisn: string | null; nis: string | null; sandi: string };

/**
 * Membuat (atau mereset) akun wali untuk siswa aktif di kelas terpilih.
 * mode 'baru'  → hanya siswa yang belum punya akun
 * mode 'reset' → semua siswa di kelas itu diberi kata sandi baru
 * Kata sandi asli hanya dikembalikan sekali (untuk dicetak), yang disimpan hanya hash-nya.
 */
export async function buatAkunMassal(kelasIds: number[], mode: "baru" | "reset"): Promise<AkunBaru[]> {
  const sb = db();
  let q = sb.from("siswa").select("id, nama, nisn, nis, kelas(nama), akun_siswa(siswa_id)").eq("status", "aktif").order("nama");
  if (kelasIds.length) q = q.in("kelas_id", kelasIds);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const target = (data ?? []).filter((s) => mode === "reset" || !s.akun_siswa);
  const hasil: AkunBaru[] = [];
  const baris = [];
  for (const s of target) {
    const sandi = sandiAcak();
    hasil.push({ kelas: (s.kelas as unknown as { nama: string } | null)?.nama ?? "-", nama: s.nama, nisn: s.nisn, nis: s.nis, sandi });
    baris.push({ siswa_id: s.id, sandi_hash: hashSandi(sandi), wajib_ganti: true, aktif: true, gagal: 0, kunci_sampai: null, diperbarui: new Date().toISOString() });
  }
  for (let i = 0; i < baris.length; i += 200) {
    const { error: e } = await sb.from("akun_siswa").upsert(baris.slice(i, i + 200), { onConflict: "siswa_id" });
    if (e) throw new Error(e.message);
  }
  return hasil.sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama));
}

/** Excel: sheet daftar akun + sheet kartu login siap cetak (2 kartu per baris). */
export async function excelAkun(akun: AkunBaru[], urlLogin: string) {
  const wb = new ExcelJS.Workbook();
  const s1 = wb.addWorksheet("Daftar Akun");
  s1.addRow(["AKUN WALI SISWA — SiValid MTs Al Riyadhul Janah Maja"]).font = { bold: true };
  s1.addRow([`Login di ${urlLogin} dengan NISN (atau NIS) dan kata sandi awal. Kata sandi wajib diganti saat login pertama.`]);
  s1.addRow([]);
  s1.addRow(["No", "Kelas", "Nama Siswa", "NISN", "NIS", "Kata Sandi Awal"]).font = { bold: true };
  akun.forEach((a, i) => s1.addRow([i + 1, a.kelas, a.nama, a.nisn ?? "", a.nis ?? "", a.sandi]));
  [5, 7, 34, 14, 22, 16].forEach((w, i) => (s1.getColumn(i + 1).width = w));
  s1.getColumn(4).numFmt = "@";
  s1.getColumn(5).numFmt = "@";

  const s2 = wb.addWorksheet("Kartu Login");
  s2.columns = [{ width: 16 }, { width: 30 }, { width: 3 }, { width: 16 }, { width: 30 }];
  const garis = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } } as const;
  akun.forEach((a, i) => {
    const r0 = Math.floor(i / 2) * 7 + 1;
    const c0 = i % 2 === 0 ? 1 : 4;
    const isi: [string, string][] = [
      ["AKUN WALI", "SiValid MTs Al Riyadhul Janah"],
      ["Nama", a.nama],
      ["Kelas", a.kelas],
      ["NISN / NIS", a.nisn ?? a.nis ?? ""],
      ["Kata sandi", a.sandi],
      ["Login", urlLogin],
    ];
    isi.forEach(([k, v], j) => {
      const ck = s2.getCell(r0 + j, c0), cv = s2.getCell(r0 + j, c0 + 1);
      ck.value = k;
      cv.value = v;
      ck.border = garis;
      cv.border = garis;
      if (j === 0 || j === 4) {
        ck.font = { bold: true };
        cv.font = { bold: true };
      }
    });
  });
  s2.pageSetup = { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return wb.xlsx.writeBuffer();
}
