import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getAppMode } from "@/lib/config";
import { isOwnerOAuthSession } from "@/lib/owner-session";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

const PUBLIC_PATHS = ["/auth", "/login", "/setup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function redirectWithSessionCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const mode = getAppMode();
  const pathname = request.nextUrl.pathname;

  if (mode === "demo") {
    return NextResponse.next({ request });
  }

  if (mode === "unconfigured") {
    if (pathname === "/setup") {
      return NextResponse.next({ request });
    }

    const setupUrl = request.nextUrl.clone();
    setupUrl.pathname = "/setup";
    return NextResponse.redirect(setupUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headersToSet).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const isOwner = isOwnerOAuthSession(claims);

  if (!isOwner && !isPublicPath(pathname)) {
    return redirectWithSessionCookies(request, response, "/login");
  }

  if (isOwner && pathname === "/login") {
    return redirectWithSessionCookies(request, response, "/");
  }

  return response;
}
