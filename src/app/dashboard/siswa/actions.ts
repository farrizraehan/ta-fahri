"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { catatTransaksi } from "@/lib/transaksi";

/** Bendahara mencatat pembayaran tunai → transaksi ditandatangani SHA-512. */
export async function bayarTunai(_: unknown, form: FormData) {
  const u = await wajib("bendahara", "admin");
  const tagihanId = String(form.get("tagihan_id"));
  const jumlah = Math.round(Number(String(form.get("jumlah") ?? "").replace(/\D/g, "")));
  let id: string;
  try {
    const t = await catatTransaksi({
      tagihanId,
      jumlah,
      metode: "tunai",
      petugasId: u.id,
      petugasNama: u.nama,
      keterangan: String(form.get("keterangan") ?? "") || null,
    });
    id = t.id;
  } catch (e) {
    return { galat: (e as Error).message };
  }
  redirect(`/dashboard/kuitansi/${id}`);
}

export async function aturPotongan(form: FormData) {
  await wajib("admin");
  const id = String(form.get("tagihan_id"));
  const potongan = Math.max(0, Math.round(Number(String(form.get("potongan") ?? "0").replace(/\D/g, ""))));
  await db().from("tagihan").update({ potongan }).eq("id", id);
  revalidatePath("/dashboard/siswa/[id]", "page");
}

export async function hapusTagihan(form: FormData) {
  await wajib("admin");
  const id = String(form.get("tagihan_id"));
  const { count } = await db().from("transaksi").select("id", { count: "exact", head: true }).eq("tagihan_id", id);
  if (!count) await db().from("tagihan").delete().eq("id", id);
  revalidatePath("/dashboard/siswa/[id]", "page");
}

/** Admin membuat/mereset akun satu siswa. Kata sandi baru dikembalikan sekali untuk diberikan ke wali. */
export async function resetAkunSiswa(_: unknown, form: FormData) {
  await wajib("admin");
  const { hashSandi, sandiAcak } = await import("@/lib/sandi");
  const siswaId = String(form.get("siswa_id"));
  const sandi = sandiAcak();
  const { error } = await db()
    .from("akun_siswa")
    .upsert(
      { siswa_id: siswaId, sandi_hash: hashSandi(sandi), wajib_ganti: true, aktif: true, gagal: 0, kunci_sampai: null, diperbarui: new Date().toISOString() },
      { onConflict: "siswa_id" },
    );
  if (error) return { galat: error.message };
  revalidatePath(`/dashboard/siswa/${siswaId}`);
  return { sandi };
}
