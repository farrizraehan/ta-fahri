"use client";

import { useActionState } from "react";
import { tambahPengguna } from "./actions";

export function FormPengguna() {
  const [state, aksi, proses] = useActionState(tambahPengguna, null);
  return (
    <form action={aksi} className="kartu grid gap-3 sm:grid-cols-2">
      <h2 className="font-bold sm:col-span-2">Tambah pengguna</h2>
      <div>
        <label className="label" htmlFor="nama">Nama</label>
        <input id="nama" name="nama" required className="isian" />
      </div>
      <div>
        <label className="label" htmlFor="peran">Peran</label>
        <select id="peran" name="peran" className="isian">
          <option value="bendahara">Bendahara</option>
          <option value="kepala">Kepala Madrasah</option>
          <option value="admin">Admin / TU</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="isian" autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="sandi">Kata sandi awal</label>
        <input id="sandi" name="sandi" type="password" minLength={8} required className="isian" autoComplete="new-password" />
      </div>
      {state?.galat && <p className="text-sm text-red-700 sm:col-span-2">{state.galat}</p>}
      {state?.pesan && <p className="text-sm text-green-800 sm:col-span-2">{state.pesan}</p>}
      <div className="sm:col-span-2">
        <button className="tombol" disabled={proses}>{proses ? "Menyimpan…" : "Tambah"}</button>
      </div>
    </form>
  );
}
