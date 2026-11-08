import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiValid — Pembayaran MTs Al Riyadhul Janah",
  description: "Sistem validasi transaksi pembayaran administrasi siswa menggunakan SHA-512",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
