import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sesiWali } from "@/lib/sesi-wali";
import { envSiap } from "@/lib/supabase";
import { FormWali } from "./form-wali";

export const dynamic = "force-dynamic";

export default async function HalamanBayar() {
  if (envSiap() && (await sesiWali())) redirect("/bayar/tagihan");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Image src="/logo.png" alt="Logo" width={72} height={72} className="mx-auto" />
        <h1 className="judul mt-3">Pembayaran Online</h1>
        <p className="text-sm text-gray-600">Untuk wali siswa MTs Al Riyadhul Janah. Masuk dengan akun dari madrasah, lalu bayar lewat transfer bank, QRIS, atau e-wallet.</p>
      </div>
      <FormWali />
      <Link href="/" className="text-center text-sm text-gray-500 hover:underline">
        ← Beranda
      </Link>
    </main>
  );
}
