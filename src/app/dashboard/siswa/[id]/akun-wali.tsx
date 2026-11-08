"use client";

import { useActionState } from "react";
import { resetAkunSiswa } from "../actions";

export function AkunWali({ siswaId, punya }: { siswaId: string; punya: boolean }) {
  const [state, aksi, proses] = useActionState(resetAkunSiswa, null);
  return (
    <form
      action={aksi}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        if (punya && !confirm("Reset kata sandi akun wali ini? Kata sandi lama tidak berlaku lagi.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="siswa_id" value={siswaId} />
      <button className="tombol-garis py-1" disabled={proses}>
        {proses ? "…" : punya ? "Reset kata sandi" : "Buat akun"}
      </button>
      {state?.sandi && (
        <span className="rounded bg-amber-50 px-2 py-1 text-sm text-amber-900">
          Kata sandi baru: <b className="font-mono">{state.sandi}</b> (catat sekarang, tidak ditampilkan lagi)
        </span>
      )}
      {state?.galat && <span className="text-sm text-red-700">{state.galat}</span>}
    </form>
  );
}
