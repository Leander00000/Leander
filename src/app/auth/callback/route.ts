import { NextRequest, NextResponse } from "next/server";

import { getAppMode, getAppOrigin } from "@/lib/config";
import { isOwnerOAuthSession } from "@/lib/owner-session";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function redirectToLogin(request: NextRequest, status: string) {
  return NextResponse.redirect(
    new URL(`/login?auth=${encodeURIComponent(status)}`, request.url),
  );
}

export async function GET(request: NextRequest) {
  if (getAppMode() !== "connected") {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  if (!code || oauthError) {
    return redirectToLogin(request, "access-denied");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectToLogin(request, "callback-failed");
  }

  const { data } = await supabase.auth.getClaims();
  if (!isOwnerOAuthSession(data?.claims)) {
    await supabase.auth.signOut();
    return redirectToLogin(request, "not-owner");
  }

  return NextResponse.redirect(
    new URL("/", getAppOrigin() ?? request.nextUrl.origin),
  );
}
