import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const PROTECTED_PREFIXES = ["/library", "/read", "/highlights", "/settings"];

/**
 * Runs before every page: refreshes the user's auth session, writes updated cookies back,
 * and sends signed-out visitors away from private pages.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  let url: string, key: string;
  try {
    ({ url, key } = supabaseEnv());
  } catch {
    // Supabase keys not filled in yet: let public pages load instead of crashing the whole site.
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Do not put code between createServerClient and getClaims(): it can cause random logouts.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (!signedIn && isProtected) return redirectKeepingCookies(request, "/login", response);
  if (signedIn && path === "/login") return redirectKeepingCookies(request, "/library", response);

  return response;
}

function redirectKeepingCookies(request: NextRequest, pathname: string, from: NextResponse) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";
  const redirect = NextResponse.redirect(target);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
