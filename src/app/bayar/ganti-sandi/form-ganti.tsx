"use client";

import Link from "next/link";
import { useActionState } from "react";
import { gantiSandiWali } from "../actions";

export function FormGantiSandi({ wajib }: { wajib: boolean }) {
  const [state, aksi, proses] = useActionState(gantiSandiWali, null);
  return (
    <form action={aksi} className="kartu space-y-4">
      <div>
        <label className="label" htmlFor="lama">{wajib ? "Kata sandi awal (dari kartu)" : "Kata sandi lama"}</label>
        <input id="lama" name="lama" type="password" required className="isian" autoComplete="current-password" />
      </div>
      <div>
        <label className="label" htmlFor="baru">Kata sandi baru</label>
        <input id="baru" name="baru" type="password" required minLength={8} className="isian" autoComplete="new-password" />
        <p className="mt-1 text-xs text-gray-500">Minimal 8 karakter, berisi huruf dan angka.</p>
      </div>
      <div>
        <label className="label" htmlFor="ulang">Ulangi kata sandi baru</label>
        <input id="ulang" name="ulang" type="password" required minLength={8} className="isian" autoComplete="new-password" />
      </div>
      {state?.galat && <p className="text-sm text-red-700">{state.galat}</p>}
      <button className="tombol w-full" disabled={proses}>{proses ? "Menyimpan…" : "Simpan kata sandi"}</button>
      {!wajib && (
        <Link href="/bayar/tagihan" className="block text-center text-sm text-gray-500 hover:underline">
          Batal
        </Link>
      )}
    </form>
  );
}
