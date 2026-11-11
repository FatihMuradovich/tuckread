import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a Supabase client and the signed-in user, or sends the visitor to /login.
 * Call it in every Server Component and Server Action that touches user data.
 */
export async function requireUser() {
  // Supabase checks token expiry against the current time, so user data is always rendered per request.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return { supabase, user };
}
