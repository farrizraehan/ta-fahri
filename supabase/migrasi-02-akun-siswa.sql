-- =====================================================================
-- Migrasi 02: akun login wali/siswa (NISN/NIS + kata sandi)
-- Jalankan sekali di Supabase: SQL Editor → New query → Run
-- =====================================================================

create table if not exists akun_siswa (
  siswa_id uuid primary key references siswa(id) on delete cascade,
  sandi_hash text not null,                  -- scrypt$<salt>$<hash>, bukan kata sandi asli
  wajib_ganti boolean not null default true, -- true = harus ganti kata sandi saat login pertama
  aktif boolean not null default true,
  gagal smallint not null default 0,         -- percobaan login gagal berturut-turut
  kunci_sampai timestamptz,                  -- terkunci sementara setelah 5x gagal
  login_terakhir timestamptz,
  dibuat timestamptz not null default now(),
  diperbarui timestamptz not null default now()
);

alter table akun_siswa enable row level security;

-- muat ulang cache skema API supaya tabel baru langsung terbaca
notify pgrst, 'reload schema';
