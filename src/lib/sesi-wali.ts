import "server-only";
import { cookies } from "next/headers";
import { sha512 } from "./sha512.ts";
import { samaPersis } from "./validasi.ts";
import { kunciSha512 } from "./supabase";

const NAMA = "sesi_wali";
const UMUR = 60 * 60 * 2; // 2 jam

/** Cookie berisi siswa_id + kedaluwarsa, ditandatangani SHA-512 dengan kunci server. */
const tanda = (isi: string) => sha512(`wali|${isi}|${kunciSha512()}`);

export async function setSesiWali(siswaId: string) {
  const isi = `${siswaId}.${Math.floor(Date.now() / 1000) + UMUR}`;
  (await cookies()).set(NAMA, `${isi}.${tanda(isi)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: UMUR,
    path: "/bayar",
  });
}

export async function sesiWali(): Promise<string | null> {
  const v = (await cookies()).get(NAMA)?.value;
  if (!v) return null;
  const [id, exp, sig] = v.split(".");
  if (!id || !exp || !sig) return null;
  if (!samaPersis(tanda(`${id}.${exp}`), sig)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return id;
}

export async function hapusSesiWali() {
  (await cookies()).set(NAMA, "", { maxAge: 0, path: "/bayar" });
}
