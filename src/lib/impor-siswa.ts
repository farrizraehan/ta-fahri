import "server-only";
import ExcelJS from "exceljs";

export type BarisSiswa = {
  nama: string;
  nis: string | null;
  nisn: string | null;
  jenis_kelamin: "L" | "P" | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  kelas: string | null; // 7A
  tahun_masuk: number | null;
  nama_wali: string | null;
  hp_wali: string | null;
  alamat: string | null;
  status: "aktif" | "tidak_aktif";
};

function teks(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((r) => r.text).join("").trim();
    if ("result" in o) return String(o.result ?? "").trim();
    if ("text" in o) return String(o.text ?? "").trim();
    return "";
  }
  return String(v).trim().replace(/^'/, "");
}

function tgl(v: ExcelJS.CellValue): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = teks(v);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(t);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

const kosong = (s: string) => (!s || /^(tidak ada|-|0)$/i.test(s) ? null : s);

function hp(s: string) {
  const d = s.replace(/\D/g, "");
  return d.length >= 9 ? d : null;
}

/** NIS 121236020129260006 → digit ke-13–14 = tahun masuk (26 → 2026). */
function tahunDariNis(nis: string | null) {
  if (!nis || nis.length < 14) return null;
  const yy = Number(nis.slice(12, 14));
  return Number.isFinite(yy) && yy > 0 ? 2000 + yy : null;
}

/** Kelas dari nama sheet atau kolom: "7a", "Kelas 9 - Kelas 9A", "8B" → "7A"/"9A"/"8B". */
function normalKelas(s: string): string | null {
  const m = /([789])\s*([A-Da-d])\b/.exec(s.replace(/Kelas\s*\d\s*-\s*Kelas\s*/i, ""));
  return m ? `${m[1]}${m[2].toUpperCase()}` : null;
}

/**
 * Membaca file Excel siswa. Mendukung dua format dari sekolah:
 *  1. "Data kartu pelajar" — satu sheet per kelas (7a, 8B, …), kolom: Nama Lengkap, Tempat Lahir, Tanggal Lahir, NIS, NISN, Alamat
 *  2. "Daftar Siswa" EMIS — kolom: Nama Lengkap, NISN, Tingkat - Rombel, Status, Jenis Kelamin, No Telepon, Nama Ayah Kandung, …
 */
export async function bacaExcelSiswa(buf: ArrayBuffer): Promise<BarisSiswa[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const hasil: BarisSiswa[] = [];

  wb.eachSheet((ws) => {
    // cari baris header (yang memuat "Nama Lengkap")
    let headerRow = 0;
    const kolom: Record<string, number> = {};
    for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
      const row = ws.getRow(r);
      const nilai = (row.values as ExcelJS.CellValue[]).map(teks);
      if (nilai.some((v) => /^nama lengkap$/i.test(v))) {
        headerRow = r;
        nilai.forEach((v, i) => {
          if (v && !(v.toLowerCase() in kolom)) kolom[v.toLowerCase()] = i;
        });
        break;
      }
    }
    if (!headerRow) return;
    const ambil = (row: ExcelJS.Row, ...nama: string[]) => {
      for (const n of nama) if (kolom[n] !== undefined) return row.getCell(kolom[n]).value;
      return null;
    };
    const kelasSheet = normalKelas(ws.name);
    const sheetTidakAktif = /tidak aktif/i.test(ws.name);

    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const nama = teks(ambil(row, "nama lengkap")).replace(/\s+/g, " ").toUpperCase();
      if (!nama) continue;
      const nis = kosong(teks(ambil(row, "nis")).replace(/\D/g, ""));
      const nisn = kosong(teks(ambil(row, "nisn")).replace(/\D/g, ""));
      if (!nis && !nisn) continue;
      const jk = teks(ambil(row, "jenis kelamin"));
      const statusTeks = teks(ambil(row, "status"));
      hasil.push({
        nama,
        nis,
        nisn,
        jenis_kelamin: /^l/i.test(jk) ? "L" : /^p/i.test(jk) ? "P" : null,
        tempat_lahir: kosong(teks(ambil(row, "tempat lahir")).toUpperCase()),
        tanggal_lahir: tgl(ambil(row, "tanggal lahir")),
        kelas: normalKelas(teks(ambil(row, "tingkat - rombel"))) ?? kelasSheet,
        tahun_masuk: tahunDariNis(nis),
        nama_wali: kosong(teks(ambil(row, "nama wali", "nama ayah kandung"))),
        hp_wali: hp(teks(ambil(row, "no telepon", "nomor handphone", "no hp"))),
        alamat: kosong(teks(ambil(row, "alamat"))),
        status: sheetTidakAktif || /tidak aktif/i.test(statusTeks) ? "tidak_aktif" : "aktif",
      });
    }
  });
  return hasil;
}
