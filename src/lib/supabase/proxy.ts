import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getAppMode, getOwnerEmail } from "@/lib/config";

const PUBLIC_PATHS = ["/login", "/setup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
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
  const ownerEmail = getOwnerEmail();
  const signedInEmail =
    typeof claims?.email === "string" ? claims.email.toLowerCase() : "";
  const isOwner = Boolean(claims && signedInEmail === ownerEmail);

  if (!isOwner && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (isOwner && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
