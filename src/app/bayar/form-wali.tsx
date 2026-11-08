"use client";

import { useActionState } from "react";
import { masukWali } from "./actions";

export function FormWali() {
  const [state, aksi, proses] = useActionState(masukWali, null);
  return (
    <form action={aksi} className="kartu space-y-4">
      <div>
        <label className="label" htmlFor="nisn">NISN atau NIS siswa</label>
        <input id="nisn" name="nisn" inputMode="numeric" required className="isian" autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="lahir">Tanggal lahir siswa</label>
        <input id="lahir" name="lahir" type="date" required className="isian" />
      </div>
      {state?.galat && <p className="text-sm text-red-700">{state.galat}</p>}
      <button className="tombol w-full" disabled={proses}>
        {proses ? "Memeriksa…" : "Lihat tagihan"}
      </button>
    </form>
  );
}
