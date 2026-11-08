"use client";

import { useActionState } from "react";
import { imporSiswa } from "./actions";

export function FormImpor() {
  const [state, aksi, proses] = useActionState(imporSiswa, null);
  return (
    <form action={aksi} className="kartu space-y-4">
      <input type="file" name="file" accept=".xlsx" required className="isian" aria-label="File Excel siswa" />
      {state?.galat && <p className="text-sm text-red-700">{state.galat}</p>}
      {state?.pesan && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{state.pesan}</p>}
      {!!state?.gagal?.length && (
        <ul className="list-disc pl-5 text-xs text-red-700">
          {state.gagal.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      )}
      <button className="tombol" disabled={proses}>{proses ? "Mengimpor…" : "Impor"}</button>
    </form>
  );
}
