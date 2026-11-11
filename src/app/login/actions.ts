"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string; email?: string };

export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Enter your email and password.", email };
  if (mode === "signup" && password.length < 8) {
    return { error: "Use at least 8 characters for your password.", email };
  }

  const supabase = await createClient();

  if (mode === "signin") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === "email_not_confirmed") {
        return { error: "Confirm your email first. Check your inbox for the link we sent.", email };
      }
      return { error: "That email and password don't match. Try again, or create an account.", email };
    }
    redirect("/library");
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/library` },
  });

  if (error) {
    if (error.code === "weak_password") return { error: "Choose a stronger password.", email };
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Too many sign-up emails were sent. Wait a few minutes and try again.", email };
    }
    return { error: error.message, email };
  }

  if (data.session) redirect("/library");
  return {
    message: `We sent a confirmation link to ${email}. Open it in this browser to finish signing up.`,
    email,
  };
}
