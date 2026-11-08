"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { buatTagihan } from "@/lib/buat-tagihan";

export async function buatTagihanMassal(_: unknown, form: FormData) {
  await wajib("admin", "bendahara");
  const taId = Number(form.get("tahun_ajaran_id"));
  const biayaIds = form.getAll("biaya").map(Number);
  const tingkat = form.getAll("tingkat").map(Number);
  const semester = String(form.get("semester") ?? "ganjil") as "ganjil" | "genap";
  if (!taId || !biayaIds.length || !tingkat.length) return { galat: "Pilih tahun ajaran, jenis biaya, dan tingkat kelas." };
  const hasil = await buatTagihan(db(), taId, biayaIds, tingkat, semester);
  if (hasil.pesan) revalidatePath("/dashboard/siswa");
  return hasil;
}
