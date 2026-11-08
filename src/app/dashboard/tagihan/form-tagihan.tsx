"use client";

import { useActionState } from "react";
import { buatTagihanMassal } from "./actions";

type TA = { id: number; nama: string; aktif: boolean };
type Biaya = { id: number; label: string; periode: string };

export function FormTagihan({ tahunAjaran, biaya }: { tahunAjaran: TA[]; biaya: Biaya[] }) {
  const [state, aksi, proses] = useActionState(buatTagihanMassal, null);
  return (
    <form action={aksi} className="kartu space-y-4">
      <div>
        <label className="label" htmlFor="ta">Tahun ajaran</label>
        <select id="ta" name="tahun_ajaran_id" className="isian" defaultValue={tahunAjaran.find((t) => t.aktif)?.id}>
          {tahunAjaran.map((t) => (
            <option key={t.id} value={t.id}>{t.nama}{t.aktif ? " (aktif)" : ""}</option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="label">Jenis biaya</legend>
        {biaya.map((b) => (
          <label key={b.id} className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" name="biaya" value={b.id} className="accent-green-800" />
            {b.label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="label">Tingkat kelas</legend>
        <div className="flex gap-4">
          {[7, 8, 9].map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="tingkat" value={t} defaultChecked={t === 7} className="accent-green-800" />
              Kelas {t}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="semester">Semester (untuk biaya per semester)</label>
        <select id="semester" name="semester" className="isian">
          <option value="ganjil">Ganjil</option>
          <option value="genap">Genap</option>
        </select>
      </div>
      {state?.galat && <p className="text-sm text-red-700">{state.galat}</p>}
      {state?.pesan && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{state.pesan}</p>}
      <button className="tombol" disabled={proses}>{proses ? "Membuat…" : "Buat tagihan"}</button>
    </form>
  );
}
