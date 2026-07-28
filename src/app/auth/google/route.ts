import { NextRequest, NextResponse } from "next/server";

import { getAppMode, getAppOrigin } from "@/lib/config";
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

  const appOrigin = getAppOrigin();
  if (!appOrigin) {
    return redirectToLogin(request, "not-configured");
  }

  if (request.nextUrl.origin !== appOrigin) {
    return NextResponse.redirect(new URL("/auth/google", appOrigin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/auth/callback", appOrigin).toString(),
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return redirectToLogin(request, "provider-failed");
  }

  return NextResponse.redirect(data.url);
}
