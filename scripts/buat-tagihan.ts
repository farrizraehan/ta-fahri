// Buat tagihan massal dari terminal.
// npm run buat-tagihan -- <tahun_ajaran> <ganjil|genap> <tingkat,...> <KODE,...>
// contoh: npm run buat-tagihan -- 2026/2027 ganjil 7 DSP,OSIS,RAPOT,EKSKUL
import { createClient } from "@supabase/supabase-js";
import { buatTagihan } from "../src/lib/buat-tagihan.ts";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const [ta, semester, tingkat, kode] = process.argv.slice(2);
const { data: t } = await sb.from("tahun_ajaran").select("id").eq("nama", ta).single();
const { data: b } = await sb.from("jenis_biaya").select("id").in("kode", kode.split(","));
const h = await buatTagihan(sb, t!.id, (b ?? []).map((x) => x.id), tingkat.split(",").map(Number), semester as "ganjil" | "genap");
console.log(h.pesan ?? `✖ ${h.galat}`);
