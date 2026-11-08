"use server";

import { redirect } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase";

export async function masuk(_: unknown, form: FormData) {
  const sb = await supabaseAuth();
  const { error } = await sb.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("sandi") ?? ""),
  });
  if (error) return { galat: "Email atau kata sandi salah." };
  redirect("/dashboard");
}

export async function keluar() {
  const sb = await supabaseAuth();
  await sb.auth.signOut();
  redirect("/masuk");
}
