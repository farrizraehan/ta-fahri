# SiValid — Sistem Validasi Transaksi Pembayaran Administrasi Siswa (SHA-512)

Studi kasus: **MTs Al Riyadhul Janah Maja**. Next.js 16 + Supabase + Midtrans Snap, deploy di Vercel.

## Inti sistem
| Bagian | Penerapan SHA-512 |
|---|---|
| Pembayaran online (Midtrans) | Setiap notifikasi diverifikasi: `SHA512(order_id + status_code + gross_amount + ServerKey)` harus sama dengan `signature_key`. Jika tidak cocok → ditolak (403) dan dicatat di `log_notifikasi`. |
| Kuitansi (online & tunai) | `hash = SHA512(no_kuitansi\|siswa_id\|tagihan_id\|jumlah\|waktu\|petugas\|metode\|KUNCI_SHA512)` disimpan di `transaksi.hash_sha512` dan dicetak sebagai QR. |
| Cek keaslian (publik `/cek`) | Hash dihitung ulang dari database dan dibandingkan dengan hash tersimpan + hash di QR → VALID / TIDAK VALID. |
| Audit integritas | Menghitung ulang hash semua transaksi untuk mendeteksi data yang diubah langsung di database. |

Algoritma SHA-512 diimplementasikan sendiri di [`src/lib/sha512.ts`](src/lib/sha512.ts) (padding, message schedule, 80 putaran) dan diuji terhadap vektor resmi FIPS 180-4 serta `node:crypto`.

## Peran
- **Admin/TU**: impor siswa, jenis biaya, buat tagihan, pengguna
- **Bendahara**: catat pembayaran tunai, cetak/batalkan kuitansi, buat tagihan
- **Kepala Madrasah**: lihat ringkasan, transaksi, laporan, validasi
- **Wali siswa** (`/bayar`): masuk dengan NISN + tanggal lahir, bayar via Midtrans
- **Publik** (`/cek`): cek keaslian kuitansi

## Ketentuan biaya (TA 2026/2027)
DSP/Infaq Rp1.100.000, Kartu OSIS Rp30.000, Map Rapot Rp50.000, Ekskul 3 tahun Rp200.000 → sekali bayar, batas 3 bulan sejak masuk.
LKS Rp135.000 → per semester. Total Rp1.515.000.

## Menyiapkan
1. Supabase → buat proyek → **SQL Editor** → jalankan [`supabase/schema.sql`](supabase/schema.sql).
2. Salin `.env.example` menjadi `.env.local` lalu isi (Supabase, `KUNCI_SHA512`, Midtrans Sandbox).
3. Buat akun admin pertama dari terminal: `npm run buat-admin` (password diketik tersembunyi).
4. `npm install` lalu `npm run dev` → http://localhost:3000
5. Masuk → **Impor Siswa** (file kartu pelajar / EMIS) → **Buat Tagihan**.
6. Deploy: `vercel` lalu isi environment variables yang sama di Vercel; set
   Midtrans Dashboard → Settings → Payment → Notification URL = `https://<domain>/api/midtrans/notifikasi`.

## Pengujian
`npm test` — vektor uji SHA-512, kesamaan dengan node:crypto, avalanche effect, deteksi manipulasi nominal, kuitansi palsu, dan signature Midtrans.
