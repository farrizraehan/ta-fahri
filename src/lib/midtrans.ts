import { sha512 } from "./sha512.ts";
import { samaPersis } from "./validasi.ts";

/**
 * Signature key Midtrans (dokumentasi HTTP Notification):
 *   signature_key = SHA512(order_id + status_code + gross_amount + ServerKey)
 * Dihitung dengan implementasi SHA-512 milik sendiri (src/lib/sha512.ts).
 */
export function hitungSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
  return sha512(orderId + statusCode + grossAmount + serverKey);
}

export type NotifikasiMidtrans = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  [k: string]: unknown;
};

export function verifikasiNotifikasi(n: NotifikasiMidtrans, serverKey: string) {
  const dihitung = hitungSignature(n.order_id ?? "", n.status_code ?? "", n.gross_amount ?? "", serverKey);
  const diterima = String(n.signature_key ?? "").toLowerCase();
  return { valid: diterima.length === 128 && samaPersis(dihitung, diterima), dihitung, diterima };
}

/** Status Midtrans yang berarti uang sudah diterima. */
export function sudahDibayar(n: { transaction_status?: string; fraud_status?: string }) {
  if (n.transaction_status === "settlement") return true;
  if (n.transaction_status === "capture") return (n.fraud_status ?? "accept") === "accept";
  return false;
}

const produksi = () => process.env.MIDTRANS_IS_PRODUCTION === "true";
const snapBase = () => (produksi() ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com");
const apiBase = () => (produksi() ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com");
export const snapJsUrl = () => `${snapBase()}/snap/snap.js`;

function serverKey() {
  const k = process.env.MIDTRANS_SERVER_KEY;
  if (!k) throw new Error("MIDTRANS_SERVER_KEY belum diatur");
  return k;
}
/**
 * Kunci untuk memanggil API Midtrans. Di dashboard Midtrans versi baru, "API Key" (Settings → API Keys)
 * terpisah dari "Server Key" (Access Keys). Server Key tetap dipakai Midtrans untuk menandatangani notifikasi.
 */
const apiKey = () => process.env.MIDTRANS_API_KEY || serverKey();
const otorisasi = () => "Basic " + Buffer.from(apiKey() + ":").toString("base64");

export type ItemSnap = { id: string; price: number; quantity: number; name: string };

/** Membuat transaksi Snap. Mengembalikan token untuk membuka popup pembayaran. */
export async function buatSnap(p: {
  orderId: string;
  jumlah: number;
  items: ItemSnap[];
  pelanggan: { first_name: string; phone?: string };
  finishUrl: string;
  notifikasiUrl?: string;
}): Promise<{ token: string; redirect_url: string }> {
  const res = await fetch(`${snapBase()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: otorisasi(),
      // alamat webhook dikirim per transaksi, jadi Notification URL di dashboard Midtrans tidak wajib diatur
      ...(p.notifikasiUrl ? { "X-Override-Notification": p.notifikasiUrl } : {}),
    },
    body: JSON.stringify({
      transaction_details: { order_id: p.orderId, gross_amount: p.jumlah },
      item_details: p.items.map((i) => ({ ...i, name: i.name.slice(0, 50) })),
      customer_details: p.pelanggan,
      callbacks: { finish: p.finishUrl },
      expiry: { unit: "hours", duration: 24 },
    }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Midtrans: ${(data.error_messages ?? [res.statusText]).join(", ")}`);
  return data;
}

/** Cek ulang status langsung ke API Midtrans (lapisan verifikasi kedua). */
export async function cekStatus(orderId: string): Promise<NotifikasiMidtrans> {
  const res = await fetch(`${apiBase()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: "application/json", Authorization: otorisasi() },
    cache: "no-store",
  });
  return res.json();
}

export const serverKeyMidtrans = serverKey;
