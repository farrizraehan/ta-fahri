// Membuat akun admin/bendahara/kepala langsung dari terminal.
// Jalankan:  npm run buat-admin
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✖ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum ada di .env.local");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
const tanya = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

/** Input password tanpa ditampilkan di layar: output readline dibisukan selama mengetik. */
let bisu = false;
const tulisAsli = rl._writeToOutput?.bind(rl);
if (tulisAsli) rl._writeToOutput = (t) => (bisu ? undefined : tulisAsli(t));
async function tanyaRahasia(q) {
  process.stdout.write(q);
  bisu = true;
  const jawab = await tanya("");
  bisu = false;
  process.stdout.write("\n");
  return jawab;
}

async function main() {
  // pastikan schema.sql sudah dijalankan sebelum membuat akun
  const { error: eTabel } = await sb.from("profil").select("id").limit(1);
  if (eTabel) {
    console.error("✖ Tabel 'profil' belum ada. Jalankan supabase/schema.sql di Supabase SQL Editor terlebih dahulu.");
    process.exit(1);
  }

  console.log("=== Buat akun petugas SiValid ===");
  const nama = await tanya("Nama lengkap        : ");
  const email = (await tanya("Email               : ")).toLowerCase();
  let peran = (await tanya("Peran (admin/bendahara/kepala) [admin]: ")).toLowerCase() || "admin";
  if (!["admin", "bendahara", "kepala"].includes(peran)) peran = "admin";
  const sandi = await tanyaRahasia("Kata sandi (min. 8) : ");
  const ulang = await tanyaRahasia("Ulangi kata sandi   : ");
  rl.close();

  if (!nama || !email.includes("@")) return gagal("Nama dan email wajib diisi dengan benar.");
  if (sandi.length < 8) return gagal("Kata sandi minimal 8 karakter.");
  if (sandi !== ulang) return gagal("Kata sandi tidak sama.");

  const { data, error } = await sb.auth.admin.createUser({ email, password: sandi, email_confirm: true });
  if (error || !data.user) return gagal(error?.message ?? "Gagal membuat akun.");
  const { error: e2 } = await sb.from("profil").insert({ id: data.user.id, nama, peran });
  if (e2) {
    await sb.auth.admin.deleteUser(data.user.id);
    return gagal(e2.message);
  }
  console.log(`✔ Akun ${email} (${peran}) berhasil dibuat. Silakan masuk di /masuk`);
}

function gagal(pesan) {
  console.error(`✖ ${pesan}`);
  process.exit(1);
}

main().catch((e) => gagal(e.message));
