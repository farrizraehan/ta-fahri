import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function envSiap() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.KUNCI_SHA512 &&
      process.env.MIDTRANS_SERVER_KEY,
  );
}

/** Klien untuk sesi login pengguna (membaca cookie). */
export async function supabaseAuth() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // dipanggil dari Server Component: cookie diperbarui oleh proxy
        }
      },
    },
  });
}

/** Klien server dengan service role. Hanya dipakai di server setelah peran pengguna diperiksa. */
export function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function kunciSha512() {
  const k = process.env.KUNCI_SHA512;
  if (!k || k.length < 32) throw new Error("KUNCI_SHA512 belum diatur atau kurang dari 32 karakter");
  return k;
}
