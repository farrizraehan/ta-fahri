import ExcelJS from "exceljs";
import { penggunaSaatIni } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { rekapTunggakan } from "@/lib/laporan";
import { hariIni } from "@/lib/format";

export async function GET(req: Request) {
  if (!(await penggunaSaatIni())) return new Response("Tidak diizinkan", { status: 401 });
  const u = new URL(req.url);
  const sampai = u.searchParams.get("sampai") || hariIni();
  const dari = u.searchParams.get("dari") || sampai.slice(0, 8) + "01";
  const kelas = u.searchParams.get("kelas");

  const wb = new ExcelJS.Workbook();
  wb.creator = "SiValid MTs Al Riyadhul Janah";

  // Sheet 1: transaksi
  const { data: trx } = await db()
    .from("transaksi")
    .select("no_kuitansi, waktu, jumlah, metode, petugas_nama, dibatalkan, hash_sha512, siswa(nama, nisn, kelas(nama)), tagihan(semester, jenis_biaya(nama))")
    .gte("waktu", new Date(`${dari}T00:00:00+07:00`).toISOString())
    .lte("waktu", new Date(`${sampai}T23:59:59+07:00`).toISOString())
    .order("waktu");
  const s1 = wb.addWorksheet("Transaksi");
  s1.addRow([`LAPORAN PENERIMAAN ${dari} s.d. ${sampai} — MTs AL RIYADHUL JANAH MAJA`]).font = { bold: true };
  s1.addRow([]);
  s1.addRow(["No. Kuitansi", "Waktu (WIB)", "Nama", "NISN", "Kelas", "Pembayaran", "Metode", "Petugas", "Jumlah", "Status", "SHA-512"]).font = { bold: true };
  for (const t of trx ?? []) {
    const s = t.siswa as unknown as { nama: string; nisn: string | null; kelas: { nama: string } | null };
    const tg = t.tagihan as unknown as { semester: string | null; jenis_biaya: { nama: string } };
    s1.addRow([
      t.no_kuitansi,
      new Date(t.waktu).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
      s.nama,
      s.nisn ?? "",
      s.kelas?.nama ?? "",
      `${tg.jenis_biaya.nama}${tg.semester ? ` (${tg.semester})` : ""}`,
      t.metode === "midtrans" ? "Midtrans" : "Tunai",
      t.petugas_nama,
      Number(t.jumlah),
      t.dibatalkan ? "Dibatalkan" : "Sah",
      t.hash_sha512,
    ]);
  }
  s1.getColumn(9).numFmt = "#,##0";
  [18, 20, 30, 13, 7, 30, 10, 18, 13, 11, 40].forEach((w, i) => (s1.getColumn(i + 1).width = w));

  // Sheet 2: tunggakan
  const rekap = await rekapTunggakan(kelas ? Number(kelas) : undefined);
  const s2 = wb.addWorksheet("Tunggakan");
  s2.addRow(["Kelas", "Nama", "NISN", ...rekap.biaya.map((b) => `Sisa ${b.kode}`), "Total tagihan", "Dibayar", "Sisa"]).font = { bold: true };
  for (const b of rekap.baris.filter((x) => x.total > 0)) {
    s2.addRow([b.kelas, b.nama, b.nisn, ...rekap.biaya.map((j) => b.per[j.kode]?.sisa ?? null), b.total, b.dibayar, b.sisa]);
  }
  s2.columns.forEach((c, i) => {
    c.width = i === 1 ? 32 : 14;
    if (i >= 3) c.numFmt = "#,##0";
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-pembayaran-${dari}-${sampai}.xlsx"`,
    },
  });
}
