import { db } from "@/lib/supabase";
import { wajib } from "@/lib/auth";
import { rupiah, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LogMidtrans() {
  await wajib();
  const sb = db();
  const [{ data: log }, { data: pesanan }] = await Promise.all([
    sb.from("log_notifikasi").select("id, waktu, order_id, transaction_status, gross_amount, signature_valid, signature_diterima, signature_dihitung, catatan").order("waktu", { ascending: false }).limit(50),
    sb.from("pesanan").select("order_id, jumlah, status, payment_type, dibuat, siswa(nama)").order("dibuat", { ascending: false }).limit(50),
  ]);
  return (
    <div className="space-y-5">
      <h1 className="judul">Log Midtrans</h1>
      <p className="text-sm text-gray-600">
        Setiap notifikasi diverifikasi dengan <code className="rounded bg-gray-100 px-1">SHA512(order_id + status_code + gross_amount + ServerKey)</code>. Notifikasi dengan
        signature tidak cocok ditolak.
      </p>
      <section className="kartu overflow-x-auto">
        <h2 className="mb-3 font-bold">Notifikasi masuk</h2>
        <table className="tabel">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Order</th>
              <th>Status</th>
              <th>Nominal</th>
              <th>Signature</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {(log ?? []).map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{tanggalJam(l.waktu)}</td>
                <td className="font-mono text-xs">{l.order_id}</td>
                <td>{l.transaction_status}</td>
                <td>{l.gross_amount}</td>
                <td>
                  <span className={`lencana ${l.signature_valid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {l.signature_valid ? "VALID" : "DITOLAK"}
                  </span>
                  <details className="text-[10px]">
                    <summary className="cursor-pointer text-gray-500">detail</summary>
                    <p className="font-mono break-all">diterima: {l.signature_diterima ?? "-"}</p>
                    <p className="font-mono break-all">dihitung: {l.signature_dihitung}</p>
                  </details>
                </td>
                <td className="text-xs">{l.catatan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="kartu overflow-x-auto">
        <h2 className="mb-3 font-bold">Pesanan pembayaran online</h2>
        <table className="tabel">
          <thead>
            <tr>
              <th>Dibuat</th>
              <th>Order</th>
              <th>Siswa</th>
              <th>Metode</th>
              <th>Status</th>
              <th className="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(pesanan ?? []).map((p) => (
              <tr key={p.order_id}>
                <td className="whitespace-nowrap">{tanggalJam(p.dibuat)}</td>
                <td className="font-mono text-xs">{p.order_id}</td>
                <td>{(p.siswa as unknown as { nama: string })?.nama}</td>
                <td>{p.payment_type ?? "-"}</td>
                <td>{p.status}</td>
                <td className="text-right">{rupiah(p.jumlah)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
