import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { cekStatus, serverKeyMidtrans, sudahDibayar, verifikasiNotifikasi, type NotifikasiMidtrans } from "@/lib/midtrans";
import { catatTransaksi } from "@/lib/transaksi";
import { hitungTagihan } from "@/lib/tagihan";

/**
 * Endpoint HTTP Notification Midtrans.
 * Atur di Midtrans Dashboard → Settings → Payment → Notification URL:
 *   https://<domain-vercel>/api/midtrans/notifikasi
 *
 * Alur validasi:
 *  1. Hitung SHA512(order_id + status_code + gross_amount + ServerKey) dan bandingkan dengan signature_key.
 *     Tidak cocok → notifikasi palsu, ditolak (403) dan dicatat.
 *  2. Cocokkan gross_amount dengan jumlah pesanan di database.
 *  3. Konfirmasi ulang status ke API Midtrans.
 *  4. Bila lunas → catat transaksi + kuitansi bertanda tangan SHA-512.
 */
export async function POST(req: Request) {
  const sb = db();
  let n: NotifikasiMidtrans;
  try {
    n = await req.json();
  } catch {
    return NextResponse.json({ pesan: "JSON tidak valid" }, { status: 400 });
  }

  const v = verifikasiNotifikasi(n, serverKeyMidtrans());
  const log = (signature_valid: boolean, catatan: string) =>
    sb.from("log_notifikasi").insert({
      order_id: n.order_id ?? null,
      status_code: n.status_code ?? null,
      gross_amount: n.gross_amount ?? null,
      transaction_status: n.transaction_status ?? null,
      signature_diterima: v.diterima || null,
      signature_dihitung: v.dihitung,
      signature_valid,
      catatan,
      payload: n,
    });

  if (!v.valid) {
    await log(false, "Signature SHA-512 tidak cocok — notifikasi ditolak");
    return NextResponse.json({ pesan: "Signature tidak valid" }, { status: 403 });
  }

  const { data: pesanan } = await sb.from("pesanan").select("*").eq("order_id", n.order_id!).maybeSingle();
  if (!pesanan) {
    await log(true, "Order tidak dikenal");
    return NextResponse.json({ pesan: "Order tidak dikenal" }, { status: 404 });
  }
  if (Math.round(Number(n.gross_amount)) !== Math.round(Number(pesanan.jumlah))) {
    await log(true, `Nominal tidak cocok: notifikasi ${n.gross_amount}, pesanan ${pesanan.jumlah}`);
    return NextResponse.json({ pesan: "Nominal tidak cocok" }, { status: 400 });
  }

  // Lapisan kedua: tanya langsung ke Midtrans
  const s = await cekStatus(pesanan.order_id);
  const status = s.transaction_status ?? n.transaction_status ?? "unknown";

  if (!sudahDibayar(s)) {
    await sb
      .from("pesanan")
      .update({ status, payment_type: s.payment_type ?? n.payment_type ?? null, diperbarui: new Date().toISOString() })
      .eq("order_id", pesanan.order_id)
      .neq("status", "settlement");
    await log(true, `Status ${status}, belum dibayar`);
    return NextResponse.json({ pesan: "ok" });
  }

  // Idempoten: hanya notifikasi pertama yang mengubah status menjadi lunas yang mencatat transaksi
  const { data: dikunci } = await sb
    .from("pesanan")
    .update({ status: "settlement", payment_type: s.payment_type ?? null, diperbarui: new Date().toISOString() })
    .eq("order_id", pesanan.order_id)
    .not("status", "in", "(settlement,capture)")
    .select("order_id");
  if (!dikunci?.length) {
    await log(true, "Notifikasi ulang, transaksi sudah tercatat");
    return NextResponse.json({ pesan: "ok" });
  }

  const { data: tagihan } = await sb
    .from("tagihan")
    .select("id, nominal, potongan, transaksi(jumlah, dibatalkan)")
    .in("id", pesanan.tagihan_ids);
  const catatan: string[] = [];
  for (const t of tagihan ?? []) {
    const { sisa } = hitungTagihan(t);
    if (sisa <= 0) {
      catatan.push(`tagihan ${t.id} sudah lunas`);
      continue;
    }
    const k = await catatTransaksi({
      tagihanId: t.id,
      jumlah: sisa,
      metode: "midtrans",
      petugasNama: `Midtrans (${s.payment_type ?? "online"})`,
      orderId: pesanan.order_id,
    });
    catatan.push(k.no_kuitansi);
  }
  await log(true, `Lunas. Kuitansi: ${catatan.join(", ")}`);
  return NextResponse.json({ pesan: "ok" });
}
