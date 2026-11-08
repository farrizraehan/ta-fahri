"use client";

import { useMemo, useState } from "react";
import { bitBerbeda, sha512 } from "@/lib/sha512";

function ukur(teks: string) {
  const t0 = performance.now();
  const ha = sha512(teks);
  return { ha, ms: performance.now() - t0 };
}

/** Alat peraga untuk pengujian: hash dua teks dan hitung avalanche effect. */
export function UjiSha512() {
  const [a, setA] = useState("KW-20261108-0001|1100000");
  const [b, setB] = useState("KW-20261108-0001|1100001");
  const hasil = useMemo(() => {
    const { ha, ms } = ukur(a);
    const hb = sha512(b);
    const beda = bitBerbeda(ha, hb);
    return { ha, hb, beda, ms };
  }, [a, b]);

  return (
    <section className="kartu space-y-3">
      <h2 className="font-bold">Uji algoritma SHA-512 (avalanche effect)</h2>
      <p className="text-sm text-gray-600">Ubah satu karakter saja, maka sekitar 50% dari 512 bit hasil hash akan berubah.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          { v: a, set: setA, h: hasil.ha, label: "Teks A" },
          { v: b, set: setB, h: hasil.hb, label: "Teks B" },
        ].map((x) => (
          <div key={x.label}>
            <label className="label">{x.label}</label>
            <input value={x.v} onChange={(e) => x.set(e.target.value)} className="isian font-mono" aria-label={x.label} />
            <p className="mt-1 font-mono text-[10px] break-all text-gray-600">{x.h}</p>
          </div>
        ))}
      </div>
      <p className="text-sm">
        Bit berbeda: <b>{hasil.beda}</b> dari 512 (<b>{((hasil.beda / 512) * 100).toFixed(1)}%</b>) · waktu hash: {hasil.ms.toFixed(2)} ms
      </p>
    </section>
  );
}
