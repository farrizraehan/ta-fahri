import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db, envSiap, supabaseAuth } from "./supabase";

export type Peran = "admin" | "bendahara" | "kepala";
export type Pengguna = { id: string; nama: string; peran: Peran; email: string };

export const labelPeran: Record<Peran, string> = {
  admin: "Admin / TU",
  bendahara: "Bendahara",
  kepala: "Kepala Madrasah",
};

export const penggunaSaatIni = cache(async (): Promise<Pengguna | null> => {
  if (!envSiap()) return null;
  const sb = await supabaseAuth();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await db().from("profil").select("nama, peran, aktif").eq("id", data.user.id).maybeSingle();
  if (!p || !p.aktif) return null;
  return { id: data.user.id, nama: p.nama, peran: p.peran as Peran, email: data.user.email ?? "" };
});

/** Wajib login dan (opsional) memiliki salah satu peran. */
export async function wajib(...peran: Peran[]): Promise<Pengguna> {
  const u = await penggunaSaatIni();
  if (!u) redirect("/masuk");
  if (peran.length && !peran.includes(u.peran)) redirect("/dashboard?galat=akses");
  return u;
}
