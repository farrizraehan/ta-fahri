"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";

export async function tambahPengguna(_: unknown, form: FormData) {
  await wajib("admin");
  const nama = String(form.get("nama") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const sandi = String(form.get("sandi") ?? "");
  const peran = String(form.get("peran"));
  if (!nama || !email || sandi.length < 8) return { galat: "Nama, email, dan kata sandi (min. 8 karakter) wajib diisi." };
  if (!["admin", "bendahara", "kepala"].includes(peran)) return { galat: "Peran tidak valid." };

  const sb = db();
  const { data, error } = await sb.auth.admin.createUser({ email, password: sandi, email_confirm: true });
  if (error || !data.user) return { galat: error?.message ?? "Gagal membuat akun." };
  const { error: e2 } = await sb.from("profil").insert({ id: data.user.id, nama, peran });
  if (e2) {
    await sb.auth.admin.deleteUser(data.user.id);
    return { galat: e2.message };
  }
  revalidatePath("/dashboard/pengguna");
  return { pesan: `Akun ${email} dibuat.` };
}

export async function ubahAktif(form: FormData) {
  const u = await wajib("admin");
  const id = String(form.get("id"));
  if (id === u.id) return;
  await db().from("profil").update({ aktif: form.get("aktif") === "1" }).eq("id", id);
  revalidatePath("/dashboard/pengguna");
}
