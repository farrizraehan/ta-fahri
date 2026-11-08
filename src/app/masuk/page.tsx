import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { envSiap } from "@/lib/supabase";
import { penggunaSaatIni } from "@/lib/auth";
import { FormMasuk } from "./form-masuk";

export const dynamic = "force-dynamic";

export default async function Masuk() {
  if (envSiap() && (await penggunaSaatIni())) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Image src="/logo.png" alt="Logo" width={72} height={72} className="mx-auto" />
        <h1 className="judul mt-3">Masuk Petugas</h1>
        <p className="text-sm text-gray-600">Admin TU, Bendahara, dan Kepala Madrasah</p>
      </div>
      {envSiap() ? (
        <FormMasuk />
      ) : (
        <p className="kartu text-sm text-red-700">
          Konfigurasi belum lengkap. Isi <code>.env.local</code> sesuai <code>.env.example</code>.
        </p>
      )}
      <Link href="/" className="text-center text-sm text-gray-500 hover:underline">
        ← Beranda
      </Link>
    </main>
  );
}
