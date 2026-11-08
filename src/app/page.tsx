import Image from "next/image";
import Link from "next/link";

export default function Beranda() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <Image src="/logo.png" alt="Logo MTs Al Riyadhul Janah" width={110} height={110} priority />
      <div>
        <p className="text-sm font-semibold tracking-widest text-[var(--emas)] uppercase">MTs Al Riyadhul Janah Maja</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--hijau)] sm:text-4xl">Sistem Validasi Pembayaran Siswa</h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">
          Setiap kuitansi pembayaran ditandatangani dengan algoritma kriptografi <b>SHA-512</b>. Scan QR pada kuitansi
          atau masukkan nomornya untuk memastikan kuitansi asli.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/cek" className="tombol">
          Cek keaslian kuitansi
        </Link>
        <Link href="/masuk" className="tombol-garis">
          Masuk petugas
        </Link>
      </div>
    </main>
  );
}
