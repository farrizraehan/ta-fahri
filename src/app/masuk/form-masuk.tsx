"use client";

import { useActionState } from "react";
import { masuk } from "./actions";

export function FormMasuk() {
  const [state, aksi, proses] = useActionState(masuk, null);
  return (
    <form action={aksi} className="kartu space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="isian" autoComplete="username" />
      </div>
      <div>
        <label className="label" htmlFor="sandi">Kata sandi</label>
        <input id="sandi" name="sandi" type="password" required className="isian" autoComplete="current-password" />
      </div>
      {state?.galat && <p className="text-sm text-red-700">{state.galat}</p>}
      <button className="tombol w-full" disabled={proses}>
        {proses ? "Masuk…" : "Masuk"}
      </button>
    </form>
  );
}
