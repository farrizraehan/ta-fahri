import Image from "next/image";
import { tanggal } from "@/lib/format";
import { TombolCetak } from "./tombol-cetak";

/** Kop surat madrasah untuk dokumen cetak. */
export function KopSurat({ judul, sub }: { judul: string; sub?: string }) {
  return (
    <header className="mb-4">
      <div className="flex items-center gap-4 border-b-4 border-double border-black pb-2">
        <Image src="/logo.png" alt="" width={70} height={70} />
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold">YAYASAN PENDIDIKAN AL RIYADHUL JANAH</p>
          <p className="text-xl font-bold">MTs AL RIYADHUL JANAH MAJA</p>
          <p className="text-xs">Kp. Maja, Kec. Maja, Kab. Lebak, Banten</p>
        </div>
        <div className="w-[70px]" />
      </div>
      <div className="mt-3 text-center">
        <h1 className="text-base font-bold uppercase underline">{judul}</h1>
        {sub && <p className="text-sm">{sub}</p>}
      </div>
    </header>
  );
}

/** Kolom tanda tangan Bendahara dan Kepala Madrasah. */
export function TandaTangan({ bendahara, kepala }: { bendahara?: string; kepala?: string }) {
  return (
    <div className="mt-8 grid grid-cols-2 text-center text-sm break-inside-avoid">
      <div>
        <p>Mengetahui,</p>
        <p>Kepala Madrasah</p>
        <p className="mt-16 font-semibold underline">{kepala ?? "................................"}</p>
      </div>
      <div>
        <p>Maja, {tanggal(new Date())}</p>
        <p>Bendahara</p>
        <p className="mt-16 font-semibold underline">{bendahara ?? "................................"}</p>
      </div>
    </div>
  );
}

/** Bilah atas halaman cetak (tidak ikut tercetak). */
export function BilahCetak({ kembali, children }: { kembali: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="tanpa-cetak mb-4 flex flex-wrap items-center justify-between gap-2">
      {kembali}
      <div className="flex gap-2">
        {children}
        <TombolCetak />
      </div>
    </div>
  );
}
