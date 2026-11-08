"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/supabase";
import { hapusSesiWali, sesiWali, setSesiWali } from "@/lib/sesi-wali";
import { buatSnap } from "@/lib/midtrans";
import { hitungTagihan } from "@/lib/tagihan";
import { cekSandiBaru, cocokSandi, hashSandi } from "@/lib/sandi";

const MAKS_GAGAL = 5;
const KUNCI_MENIT = 15;

/** Login wali: NISN/NIS + kata sandi. Terkunci 15 menit setelah 5 kali salah. */
export async function masukWali(_: unknown, form: FormData) {
  const nisn = String(form.get("nisn") ?? "").replace(/\D/g, "");
  const sandi = String(form.get("sandi") ?? "");
  if (!nisn || !sandi) return { galat: "NISN/NIS dan kata sandi wajib diisi." };
  const salah = { galat: "NISN/NIS atau kata sandi salah." };

  const sb = db();
  const { data: s } = await sb
    .from("siswa")
    .select("id, akun_siswa(sandi_hash, aktif, wajib_ganti, gagal, kunci_sampai)")
    .or(`nisn.eq.${nisn},nis.eq.${nisn}`)
    .eq("status", "aktif")
    .maybeSingle();
  const akun = s?.akun_siswa as unknown as { sandi_hash: string; aktif: boolean; wajib_ganti: boolean; gagal: number; kunci_sampai: string | null } | null;
  if (!s) return salah;
  if (!akun || !akun.aktif) return { galat: "Akun wali untuk siswa ini belum dibuat. Hubungi TU madrasah." };
  if (akun.kunci_sampai && new Date(akun.kunci_sampai) > new Date()) {
    return { galat: `Terlalu banyak percobaan salah. Coba lagi setelah ${new Date(akun.kunci_sampai).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })} WIB.` };
  }

  if (!cocokSandi(sandi, akun.sandi_hash)) {
    const gagal = akun.gagal + 1;
    await sb
      .from("akun_siswa")
      .update(gagal >= MAKS_GAGAL ? { gagal: 0, kunci_sampai: new Date(Date.now() + KUNCI_MENIT * 60_000).toISOString() } : { gagal })
      .eq("siswa_id", s.id);
    return gagal >= MAKS_GAGAL ? { galat: `Akun dikunci ${KUNCI_MENIT} menit karena ${MAKS_GAGAL} kali salah.` } : salah;
  }

  await sb.from("akun_siswa").update({ gagal: 0, kunci_sampai: null, login_terakhir: new Date().toISOString() }).eq("siswa_id", s.id);
  await setSesiWali(s.id);
  redirect(akun.wajib_ganti ? "/bayar/ganti-sandi" : "/bayar/tagihan");
}

/** Wali mengganti kata sandi (wajib saat login pertama). */
export async function gantiSandiWali(_: unknown, form: FormData) {
  const siswaId = await sesiWali();
  if (!siswaId) redirect("/bayar");
  const lama = String(form.get("lama") ?? "");
  const baru = String(form.get("baru") ?? "");
  if (baru !== String(form.get("ulang") ?? "")) return { galat: "Kata sandi baru dan ulangannya tidak sama." };
  const aturan = cekSandiBaru(baru);
  if (aturan) return { galat: aturan };
  if (baru === lama) return { galat: "Kata sandi baru harus berbeda dari yang lama." };

  const sb = db();
  const { data: akun } = await sb.from("akun_siswa").select("sandi_hash").eq("siswa_id", siswaId).single();
  if (!akun || !cocokSandi(lama, akun.sandi_hash)) return { galat: "Kata sandi lama salah." };
  await sb
    .from("akun_siswa")
    .update({ sandi_hash: hashSandi(baru), wajib_ganti: false, diperbarui: new Date().toISOString() })
    .eq("siswa_id", siswaId);
  redirect("/bayar/tagihan?sandi=diganti");
}

export async function keluarWali() {
  await hapusSesiWali();
  redirect("/bayar");
}

/** Membuat pesanan Midtrans Snap untuk tagihan yang dipilih wali. */
export async function buatPesanan(tagihanIds: string[]): Promise<{ url?: string; galat?: string }> {
  const siswaId = await sesiWali();
  if (!siswaId) return { galat: "Sesi habis, silakan masuk lagi." };
  if (!tagihanIds.length) return { galat: "Pilih minimal satu tagihan." };

  const sb = db();
  const { data: siswa } = await sb.from("siswa").select("id, nama, hp_wali").eq("id", siswaId).single();
  const { data: tagihan } = await sb
    .from("tagihan")
    .select("id, nominal, potongan, semester, jenis_biaya(kode, nama), transaksi(jumlah, dibatalkan)")
    .eq("siswa_id", siswaId)
    .in("id", tagihanIds);
  if (!siswa || !tagihan?.length) return { galat: "Tagihan tidak ditemukan." };

  const items = tagihan
    .map((t) => {
      const jb = t.jenis_biaya as unknown as { kode: string; nama: string };
      return { id: t.id.slice(0, 8), name: `${jb.nama}${t.semester ? ` (${t.semester})` : ""}`, price: hitungTagihan(t).sisa, quantity: 1 };
    })
    .filter((i) => i.price > 0);
  if (!items.length) return { galat: "Tagihan yang dipilih sudah lunas." };
  const jumlah = items.reduce((a, i) => a + i.price, 0);
  const orderId = `MTS-${randomBytes(4).toString("hex").toUpperCase()}-${Date.now()}`;

  const h = await headers();
  const asal = process.env.NEXT_PUBLIC_APP_URL ?? `https://${h.get("host")}`;
  try {
    const snap = await buatSnap({
      orderId,
      jumlah,
      items,
      pelanggan: { first_name: siswa.nama, phone: siswa.hp_wali ?? undefined },
      finishUrl: `${asal}/bayar/tagihan`,
      notifikasiUrl: asal.startsWith("https://") ? `${asal}/api/midtrans/notifikasi` : undefined,
    });
    await sb.from("pesanan").insert({
      order_id: orderId,
      siswa_id: siswaId,
      tagihan_ids: tagihan.map((t) => t.id),
      jumlah,
      snap_token: snap.token,
    });
    return { url: snap.redirect_url };
  } catch (e) {
    return { galat: (e as Error).message };
  }
}
