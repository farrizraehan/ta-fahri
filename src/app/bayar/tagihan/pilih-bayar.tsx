"use client";

import { useState, useTransition } from "react";
import { buatPesanan } from "../actions";

type Baris = { id: string; nama: string; total: number; sisa: number; status: string; jatuhTempo: string | null };

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export function PilihBayar({ tagihan }: { tagihan: Baris[] }) {
  const belum = tagihan.filter((t) => t.sisa > 0);
  const [pilih, setPilih] = useState<string[]>(belum.map((t) => t.id));
  const [pesan, setPesan] = useState<string | null>(null);
  const [proses, mulai] = useTransition();
  const total = belum.filter((t) => pilih.includes(t.id)).reduce((a, t) => a + t.sisa, 0);

  const bayar = () =>
    mulai(async () => {
      setPesan(null);
      const r = await buatPesanan(pilih);
      if (!r.url) return setPesan(r.galat ?? "Gagal membuat pembayaran");
      // halaman pembayaran Midtrans Snap; setelah selesai wali dikembalikan ke /bayar/tagihan
      window.location.href = r.url;
    });

  return (
    <section className="kartu">
      <h2 className="mb-3 font-bold">Daftar tagihan</h2>
      {!tagihan.length && <p className="text-sm text-gray-500">Belum ada tagihan.</p>}
      <ul className="divide-y">
        {tagihan.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-green-800"
              disabled={t.sisa === 0}
              checked={t.sisa > 0 && pilih.includes(t.id)}
              onChange={(e) => setPilih((p) => (e.target.checked ? [...p, t.id] : p.filter((x) => x !== t.id)))}
              aria-label={`Pilih ${t.nama}`}
            />
            <div className="flex-1">
              <p className="font-medium">{t.nama}</p>
              <p className="text-xs text-gray-500">
                {t.status}
                {t.jatuhTempo && t.sisa > 0 && ` · batas ${t.jatuhTempo}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{rp(t.sisa)}</p>
              {t.sisa !== t.total && <p className="text-xs text-gray-400">dari {rp(t.total)}</p>}
            </div>
          </li>
        ))}
      </ul>
      {belum.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm">
            Total dipilih: <b className="text-lg">{rp(total)}</b>
          </p>
          <button className="tombol" onClick={bayar} disabled={proses || total === 0}>
            {proses ? "Mengalihkan ke Midtrans…" : "Bayar sekarang"}
          </button>
        </div>
      )}
      {pesan && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-900">{pesan}</p>}
    </section>
  );
}
