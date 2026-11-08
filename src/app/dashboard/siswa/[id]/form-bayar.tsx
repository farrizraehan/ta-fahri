"use client";

import { useActionState } from "react";
import { bayarTunai } from "../actions";

export function FormBayar({ tagihanId, sisa }: { tagihanId: string; sisa: number }) {
  const [state, aksi, proses] = useActionState(bayarTunai, null);
  return (
    <form
      action={aksi}
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        const j = new FormData(e.currentTarget).get("jumlah");
        if (!confirm(`Catat pembayaran tunai Rp ${Number(j).toLocaleString("id-ID")}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="tagihan_id" value={tagihanId} />
      <div className="flex gap-1">
        <input name="jumlah" type="number" min={1} max={sisa} defaultValue={sisa} className="isian w-32 py-1" aria-label="Jumlah dibayar" />
        <button className="tombol px-3 py-1" disabled={proses}>
          {proses ? "…" : "Bayar"}
        </button>
      </div>
      {state?.galat && <p className="text-xs text-red-700">{state.galat}</p>}
    </form>
  );
}
