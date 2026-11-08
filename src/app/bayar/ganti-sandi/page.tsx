import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { sesiWali } from "@/lib/sesi-wali";
import { FormGantiSandi } from "./form-ganti";

export const dynamic = "force-dynamic";

export default async function GantiSandi() {
  const siswaId = await sesiWali();
  if (!siswaId) redirect("/bayar");
  const { data } = await db().from("akun_siswa").select("wajib_ganti, siswa(nama)").eq("siswa_id", siswaId).single();
  const nama = (data?.siswa as unknown as { nama: string } | null)?.nama;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div>
        <p className="text-xs font-semibold tracking-widest text-[var(--emas)] uppercase">Akun wali · {nama}</p>
        <h1 className="judul">Ganti kata sandi</h1>
        {data?.wajib_ganti && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Ini login pertama. Ganti kata sandi awal dari madrasah dengan kata sandi milik Anda sendiri.
          </p>
        )}
      </div>
      <FormGantiSandi wajib={!!data?.wajib_ganti} />
    </main>
  );
}
