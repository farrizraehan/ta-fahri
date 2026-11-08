export type StatusTagihan = "belum" | "sebagian" | "lunas";

export const labelStatus: Record<StatusTagihan, string> = {
  belum: "Belum bayar",
  sebagian: "Dicicil",
  lunas: "Lunas",
};

type Bayar = { jumlah: number | string; dibatalkan: boolean };

export function hitungTagihan(t: { nominal: number | string; potongan: number | string; transaksi?: Bayar[] | null }) {
  const total = Math.max(0, Number(t.nominal) - Number(t.potongan));
  const dibayar = (t.transaksi ?? []).filter((p) => !p.dibatalkan).reduce((a, p) => a + Number(p.jumlah), 0);
  const sisa = Math.max(0, total - dibayar);
  const status: StatusTagihan = sisa === 0 ? "lunas" : dibayar > 0 ? "sebagian" : "belum";
  return { total, dibayar, sisa, status };
}

/** Tambah n bulan ke tanggal YYYY-MM-DD. */
export function tambahBulan(tgl: string, n: number) {
  const d = new Date(`${tgl}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}
