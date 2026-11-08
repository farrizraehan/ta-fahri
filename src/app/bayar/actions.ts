"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/supabase";
import { hapusSesiWali, sesiWali, setSesiWali } from "@/lib/sesi-wali";
import { buatSnap } from "@/lib/midtrans";
import { hitungTagihan } from "@/lib/tagihan";

export async function masukWali(_: unknown, form: FormData) {
  const nisn = String(form.get("nisn") ?? "").replace(/\D/g, "");
  const lahir = String(form.get("lahir") ?? "");
  if (!nisn || !lahir) return { galat: "NISN dan tanggal lahir wajib diisi." };
  const { data } = await db()
    .from("siswa")
    .select("id, tanggal_lahir")
    .or(`nisn.eq.${nisn},nis.eq.${nisn}`)
    .eq("status", "aktif")
    .maybeSingle();
  if (!data || data.tanggal_lahir !== lahir) return { galat: "Data tidak cocok. Periksa NISN/NIS dan tanggal lahir." };
  await setSesiWali(data.id);
  redirect("/bayar/tagihan");
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
