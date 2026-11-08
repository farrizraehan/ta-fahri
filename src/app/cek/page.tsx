import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

async function cari(form: FormData) {
  "use server";
  const no = String(form.get("no") ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const h = String(form.get("h") ?? "").trim().toLowerCase().replace(/[^0-9a-f]/g, "");
  if (!no) return;
  redirect(`/cek/${no}${h ? `?h=${h}` : ""}`);
}

export default function Cek() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Image src="/logo.png" alt="Logo" width={72} height={72} className="mx-auto" />
        <h1 className="judul mt-3">Cek Keaslian Kuitansi</h1>
        <p className="text-sm text-gray-600">Scan QR pada kuitansi, atau isi nomor kuitansi dan kode SHA-512 yang tercetak.</p>
      </div>
      <form action={cari} className="kartu space-y-4">
        <div>
          <label className="label" htmlFor="no">Nomor kuitansi</label>
          <input id="no" name="no" required placeholder="KW-20261108-0001" className="isian font-mono" />
        </div>
        <div>
          <label className="label" htmlFor="h">Kode SHA-512 di kuitansi (min. 16 karakter pertama)</label>
          <textarea id="h" name="h" rows={3} className="isian font-mono text-xs" />
        </div>
        <button className="tombol w-full">Periksa</button>
      </form>
      <Link href="/" className="text-center text-sm text-gray-500 hover:underline">← Beranda</Link>
    </main>
  );
}
