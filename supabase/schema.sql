-- =====================================================================
-- Skema database: Sistem Validasi Transaksi Pembayaran Administrasi Siswa
-- MTs Al Riyadhul Janah Maja — validasi menggunakan SHA-512
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → New query → Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Pengguna aplikasi (terhubung ke auth.users) ----------
create table if not exists profil (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  peran text not null check (peran in ('admin', 'bendahara', 'kepala')),
  aktif boolean not null default true,
  dibuat timestamptz not null default now()
);

-- ---------- Tahun ajaran ----------
create table if not exists tahun_ajaran (
  id serial primary key,
  nama text not null unique,                 -- contoh: 2026/2027
  mulai date not null,                       -- tanggal awal tahun ajaran (awal semester ganjil)
  mulai_genap date not null,                 -- tanggal awal semester genap
  aktif boolean not null default false
);

-- ---------- Kelas ----------
create table if not exists kelas (
  id serial primary key,
  nama text not null unique,                 -- 7A, 8B, 9C, ...
  tingkat smallint not null check (tingkat between 7 and 9)
);

-- ---------- Siswa ----------
create table if not exists siswa (
  id uuid primary key default gen_random_uuid(),
  nis text unique,
  nisn text unique,
  nama text not null,
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  tempat_lahir text,
  tanggal_lahir date,
  kelas_id int references kelas(id) on delete set null,
  tahun_masuk int,                           -- 2026 untuk angkatan 2026/2027
  nama_wali text,
  hp_wali text,
  alamat text,
  status text not null default 'aktif' check (status in ('aktif', 'lulus', 'keluar', 'tidak_aktif')),
  dibuat timestamptz not null default now(),
  constraint siswa_identitas check (nis is not null or nisn is not null)
);
create index if not exists siswa_kelas_idx on siswa(kelas_id);
create index if not exists siswa_nama_idx on siswa(lower(nama));

-- ---------- Jenis biaya ----------
-- periode 'sekali'   : dibayar sekali selama sekolah, batas = mulai TA + batas_bulan
-- periode 'semester' : ditagih setiap semester
create table if not exists jenis_biaya (
  id serial primary key,
  kode text not null unique,
  nama text not null,
  kelompok text not null default 'Kebutuhan Pribadi',
  nominal numeric(12,0) not null check (nominal >= 0),
  periode text not null check (periode in ('sekali', 'semester')),
  batas_bulan smallint not null default 3,
  urutan smallint not null default 0,
  aktif boolean not null default true
);

-- ---------- Tagihan per siswa ----------
create table if not exists tagihan (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references siswa(id) on delete cascade,
  jenis_biaya_id int not null references jenis_biaya(id),
  tahun_ajaran_id int not null references tahun_ajaran(id),
  semester text check (semester in ('ganjil', 'genap')),   -- null untuk biaya 'sekali'
  nominal numeric(12,0) not null check (nominal >= 0),
  potongan numeric(12,0) not null default 0 check (potongan >= 0),
  jatuh_tempo date,
  dibuat timestamptz not null default now()
);
-- satu siswa hanya punya satu tagihan per biaya sekali, dan satu per semester untuk biaya semester
create unique index if not exists tagihan_unik
  on tagihan (siswa_id, jenis_biaya_id, coalesce(tahun_ajaran_id::text || semester, 'sekali'));
create index if not exists tagihan_siswa_idx on tagihan(siswa_id);

-- ---------- Transaksi pembayaran (inti sistem) ----------
create table if not exists transaksi (
  id uuid primary key default gen_random_uuid(),
  no_kuitansi text not null unique,          -- KW-20261108-0001
  tagihan_id uuid not null references tagihan(id),
  siswa_id uuid not null references siswa(id),
  jumlah numeric(12,0) not null check (jumlah > 0),
  metode text not null default 'tunai' check (metode in ('tunai', 'midtrans')),
  order_id text,                             -- terisi bila dibayar lewat Midtrans (1 pesanan bisa melunasi beberapa tagihan)
  waktu timestamptz not null default now(),
  petugas_id uuid references profil(id),
  petugas_nama text not null,
  keterangan text,
  hash_sha512 char(128) not null,            -- SHA-512 (hex, 128 karakter) dari data + kunci rahasia
  dibatalkan boolean not null default false,
  alasan_batal text,
  dibuat timestamptz not null default now()
);
create index if not exists transaksi_siswa_idx on transaksi(siswa_id);
create index if not exists transaksi_waktu_idx on transaksi(waktu);

-- Nomor urut kuitansi harian
create table if not exists nomor_kuitansi (
  tanggal date primary key,
  terakhir int not null default 0
);

create or replace function ambil_nomor_kuitansi(p_tanggal date)
returns text language plpgsql as $$
declare n int;
begin
  insert into nomor_kuitansi(tanggal, terakhir) values (p_tanggal, 1)
  on conflict (tanggal) do update set terakhir = nomor_kuitansi.terakhir + 1
  returning terakhir into n;
  return 'KW-' || to_char(p_tanggal, 'YYYYMMDD') || '-' || lpad(n::text, 4, '0');
end $$;

-- ---------- Log setiap validasi kuitansi ----------
create table if not exists log_validasi (
  id bigserial primary key,
  transaksi_id uuid references transaksi(id) on delete set null,
  no_kuitansi text,
  hash_diperiksa text,
  hasil text not null check (hasil in ('valid', 'tidak_valid', 'tidak_ditemukan', 'dibatalkan')),
  alasan text,
  sumber text not null default 'publik',     -- publik (scan QR) | petugas | audit
  waktu timestamptz not null default now()
);
create index if not exists log_validasi_waktu_idx on log_validasi(waktu);

-- ---------- Pesanan pembayaran online (Midtrans Snap) ----------
create table if not exists pesanan (
  order_id text primary key,                 -- MTS-<8 karakter acak>-<epoch>
  siswa_id uuid not null references siswa(id),
  tagihan_ids uuid[] not null,               -- tagihan yang dilunasi oleh pesanan ini
  jumlah numeric(12,0) not null check (jumlah > 0),
  status text not null default 'pending',    -- pending | settlement | capture | expire | cancel | deny | failure
  snap_token text,
  payment_type text,
  dibuat timestamptz not null default now(),
  diperbarui timestamptz not null default now()
);
create index if not exists pesanan_siswa_idx on pesanan(siswa_id);

-- ---------- Log notifikasi Midtrans + hasil verifikasi signature SHA-512 ----------
create table if not exists log_notifikasi (
  id bigserial primary key,
  order_id text,
  status_code text,
  gross_amount text,
  transaction_status text,
  signature_diterima text,
  signature_dihitung text,
  signature_valid boolean not null,
  catatan text,
  payload jsonb,
  waktu timestamptz not null default now()
);
create index if not exists log_notifikasi_waktu_idx on log_notifikasi(waktu);

-- ---------- Keamanan ----------
alter table pesanan         enable row level security;
alter table log_notifikasi  enable row level security;
-- Semua akses data lewat server (service role). Role anon/authenticated tidak diberi akses langsung.
alter table profil          enable row level security;
alter table tahun_ajaran    enable row level security;
alter table kelas           enable row level security;
alter table siswa           enable row level security;
alter table jenis_biaya     enable row level security;
alter table tagihan         enable row level security;
alter table transaksi       enable row level security;
alter table nomor_kuitansi  enable row level security;
alter table log_validasi    enable row level security;
revoke execute on function ambil_nomor_kuitansi(date) from public, anon, authenticated;

-- ---------- Data awal ----------
insert into jenis_biaya (kode, nama, kelompok, nominal, periode, batas_bulan, urutan) values
  ('DSP',   'DSP / Infaq',                          'DSP/Infaq',         1100000, 'sekali',   3, 1),
  ('OSIS',  'Kartu OSIS',                           'Kebutuhan Pribadi',   30000, 'sekali',   3, 2),
  ('RAPOT', 'Map Rapot',                            'Kebutuhan Pribadi',   50000, 'sekali',   3, 3),
  ('EKSKUL','Ekstrakurikuler selama 3 tahun',       'Kebutuhan Pribadi',  200000, 'sekali',   3, 4),
  ('LKS',   'LKS satu semester',                    'Kebutuhan Pribadi',  135000, 'semester', 3, 5)
on conflict (kode) do nothing;

insert into tahun_ajaran (nama, mulai, mulai_genap, aktif) values
  ('2025/2026', '2025-07-14', '2026-01-05', false),
  ('2026/2027', '2026-07-13', '2027-01-04', true)
on conflict (nama) do nothing;

insert into kelas (nama, tingkat) values
  ('7A',7),('7B',7),('7C',7),('7D',7),
  ('8A',8),('8B',8),('8C',8),('8D',8),
  ('9A',9),('9B',9),('9C',9),('9D',9)
on conflict (nama) do nothing;
