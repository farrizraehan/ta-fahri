import Image from "next/image";
import Link from "next/link";
import { labelPeran, wajib, type Peran } from "@/lib/auth";
import { keluar } from "../masuk/actions";

const MENU: { href: string; label: string; peran: Peran[] }[] = [
  { href: "/dashboard", label: "Ringkasan", peran: ["admin", "bendahara", "kepala"] },
  { href: "/dashboard/siswa", label: "Siswa & Tagihan", peran: ["admin", "bendahara", "kepala"] },
  { href: "/dashboard/transaksi", label: "Transaksi", peran: ["admin", "bendahara", "kepala"] },
  { href: "/dashboard/validasi", label: "Validasi SHA-512", peran: ["admin", "bendahara", "kepala"] },
  { href: "/dashboard/midtrans", label: "Log Midtrans", peran: ["admin", "bendahara", "kepala"] },
  { href: "/dashboard/laporan", label: "Laporan", peran: ["admin", "bendahara", "kepala"] },
  { href: "/dashboard/tagihan", label: "Buat Tagihan", peran: ["admin", "bendahara"] },
  { href: "/dashboard/biaya", label: "Jenis Biaya", peran: ["admin"] },
  { href: "/dashboard/impor", label: "Impor Siswa", peran: ["admin"] },
  { href: "/dashboard/akun-siswa", label: "Akun Wali", peran: ["admin"] },
  { href: "/dashboard/pengguna", label: "Pengguna", peran: ["admin"] },
];

export default async function LayoutDashboard({ children }: { children: React.ReactNode }) {
  const u = await wajib();
  return (
    <div className="min-h-screen md:flex">
      <aside className="tanpa-cetak border-b bg-[var(--hijau)] text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-0">
        <div className="flex items-center gap-3 p-4">
          <Image src="/logo.png" alt="" width={40} height={40} className="rounded-full bg-white p-0.5" />
          <div className="leading-tight">
            <p className="text-sm font-bold">SiValid</p>
            <p className="text-xs text-green-100">MTs Al Riyadhul Janah</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {MENU.filter((m) => m.peran.includes(u.peran)).map((m) => (
            <Link key={m.href} href={m.href} className="shrink-0 rounded-md px-3 py-2 text-sm text-green-50 hover:bg-white/10">
              {m.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-white/15 p-4 text-xs md:absolute md:bottom-0 md:block md:w-60">
          <p className="font-semibold">{u.nama}</p>
          <p className="text-green-100">{labelPeran[u.peran]}</p>
          <form action={keluar} className="mt-2">
            <button className="underline">Keluar</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="tanpa-cetak mb-4 flex justify-end text-xs md:hidden">
          <form action={keluar}>
            <button className="underline">
              Keluar ({u.nama})
            </button>
          </form>
        </div>
        {children}
      </main>
    </div>
  );
}
