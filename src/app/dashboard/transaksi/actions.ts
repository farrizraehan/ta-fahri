"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";

/** Pembatalan tidak mengubah field yang di-hash, sehingga hash transaksi tetap valid dan jejaknya tetap ada. */
export async function batalkan(form: FormData) {
  const u = await wajib("bendahara", "admin");
  const id = String(form.get("id"));
  const alasan = String(form.get("alasan") ?? "").trim();
  if (!alasan) return;
  await db()
    .from("transaksi")
    .update({ dibatalkan: true, alasan_batal: `${alasan} (oleh ${u.nama})` })
    .eq("id", id)
    .eq("metode", "tunai");
  revalidatePath(`/dashboard/kuitansi/${id}`);
}
