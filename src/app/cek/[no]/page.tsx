import Image from "next/image";
import Link from "next/link";
import { cekKuitansi } from "@/lib/cek";
import { rupiah, samarkanNama, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HasilCek({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<{ h?: string }> }) {
  const { no } = await params;
  const { h } = await searchParams;
  const r = await cekKuitansi(decodeURIComponent(no), h ?? null, "publik");

  const gaya = {
    valid: { warna: "border-green-600 bg-green-50 text-green-900", ikon: "✔", judul: "KUITANSI VALID" },
    dibatalkan: { warna: "border-amber-500 bg-amber-50 text-amber-900", ikon: "!", judul: "TRANSAKSI DIBATALKAN" },
    tidak_valid: { warna: "border-red-600 bg-red-50 text-red-900", ikon: "✖", judul: "KUITANSI TIDAK VALID" },
    tidak_ditemukan: { warna: "border-red-600 bg-red-50 text-red-900", ikon: "?", judul: "TIDAK DITEMUKAN" },
  }[r.hasil];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div className="flex items-center justify-center gap-2">
        <Image src="/logo.png" alt="" width={36} height={36} />
        <p className="text-sm font-semibold">MTs Al Riyadhul Janah Maja</p>
      </div>
      <div className={`rounded-xl border-2 p-6 text-center ${gaya.warna}`}>
        <p className="text-5xl">{gaya.ikon}</p>
        <h1 className="mt-2 text-xl font-black tracking-wide">{gaya.judul}</h1>
        <p className="mt-1 text-sm">{r.alasan}</p>
      </div>
      {r.t && r.hasil !== "tidak_valid" && (
        <dl className="kartu grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
          <dt className="text-gray-500">No. kuitansi</dt>
          <dd className="font-mono">{r.t.no_kuitansi}</dd>
          <dt className="text-gray-500">Siswa</dt>
          <dd>{samarkanNama(r.t.siswa.nama)} ({r.t.siswa.kelas?.nama ?? "-"})</dd>
          <dt className="text-gray-500">Pembayaran</dt>
          <dd>{r.t.tagihan.jenis_biaya.nama}{r.t.tagihan.semester ? ` (${r.t.tagihan.semester})` : ""}</dd>
          <dt className="text-gray-500">Jumlah</dt>
          <dd className="font-bold">{rupiah(r.t.jumlah)}</dd>
          <dt className="text-gray-500">Waktu</dt>
          <dd>{tanggalJam(r.t.waktu)} WIB</dd>
          <dt className="text-gray-500">Metode</dt>
          <dd>{r.t.metode === "midtrans" ? "Online (Midtrans)" : "Tunai"}</dd>
          <dt className="col-span-2 mt-2 text-gray-500">SHA-512 tersimpan</dt>
          <dd className="col-span-2 font-mono text-[10px] break-all">{r.t.hash_sha512}</dd>
        </dl>
      )}
      <p className="text-center text-xs text-gray-500">
        Pastikan jumlah dan nama di kuitansi kertas sama dengan data di atas. Bila berbeda, kuitansi tersebut telah diubah.
      </p>
      <Link href="/cek" className="tombol-garis">Cek kuitansi lain</Link>
    </main>
  );
}
