"use client";

import { useState } from "react";

export function FormAkunMassal({ kelas }: { kelas: { id: number; nama: string }[] }) {
  const [mode, setMode] = useState("baru");
  return (
    <form
      method="post"
      action="/dashboard/akun-siswa/buat"
      className="kartu space-y-4"
      onSubmit={(e) => {
        const n = new FormData(e.currentTarget).getAll("kelas").length;
        const target = n ? `${n} kelas terpilih` : "SEMUA kelas";
        const pesan =
          mode === "reset"
            ? `Reset kata sandi semua siswa di ${target}? Kata sandi lama tidak berlaku lagi.`
            : `Buat akun untuk siswa yang belum punya akun di ${target}?`;
        if (!confirm(pesan)) e.preventDefault();
      }}
    >
      <h2 className="font-bold">Buat akun massal</h2>
      <fieldset>
        <legend className="label">Kelas (kosongkan = semua kelas)</legend>
        <div className="flex flex-wrap gap-3">
          {kelas.map((k) => (
            <label key={k.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="kelas" value={k.id} className="accent-green-800" />
              {k.nama}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-1 text-sm">
        <legend className="label">Mode</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="mode" value="baru" checked={mode === "baru"} onChange={() => setMode("baru")} className="accent-green-800" />
          Hanya siswa yang belum punya akun
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="mode" value="reset" checked={mode === "reset"} onChange={() => setMode("reset")} className="accent-green-800" />
          Reset kata sandi semua siswa di kelas terpilih
        </label>
      </fieldset>
      <button className="tombol">Buat akun dan unduh Excel</button>
      <p className="text-xs text-gray-500">
        File Excel berisi daftar akun dan lembar kartu login siap cetak. Simpan file ini dengan aman; kata sandi awal tidak bisa dilihat lagi.
        Proses ±20 detik untuk 400 siswa.
      </p>
    </form>
  );
}
