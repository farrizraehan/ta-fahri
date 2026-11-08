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
        <label className="label" htmlFor="sandi">Kata sandi</label>
        <input id="sandi" name="sandi" type="password" required className="isian" autoComplete="current-password" />
      </div>
      {state?.galat && <p className="text-sm text-red-700">{state.galat}</p>}
      <p className="text-xs text-gray-500">Kata sandi awal tercantum di kartu akun dari madrasah. Lupa kata sandi? Hubungi TU.</p>
      <button className="tombol w-full" disabled={proses}>
        {proses ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
