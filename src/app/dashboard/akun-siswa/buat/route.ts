import { headers } from "next/headers";
import { penggunaSaatIni } from "@/lib/auth";
import { buatAkunMassal, excelAkun } from "@/lib/akun-siswa";
import { hariIni } from "@/lib/format";

export const maxDuration = 60;

/** Buat akun wali massal lalu langsung unduh Excel berisi kata sandi awal (hanya sekali ini terlihat). */
export async function POST(req: Request) {
  const u = await penggunaSaatIni();
  if (!u || u.peran !== "admin") return new Response("Hanya admin", { status: 403 });
  const form = await req.formData();
  const kelas = form.getAll("kelas").map(Number).filter(Boolean);
  const mode = form.get("mode") === "reset" ? "reset" : "baru";

  let akun;
  try {
    akun = await buatAkunMassal(kelas, mode);
  } catch (e) {
    return new Response(`Gagal: ${(e as Error).message}`, { status: 500 });
  }
  const h = await headers();
  const asal = process.env.NEXT_PUBLIC_APP_URL ?? `https://${h.get("host")}`;
  const buf = await excelAkun(akun, `${asal}/bayar`);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="akun-wali-${mode}-${hariIni()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
