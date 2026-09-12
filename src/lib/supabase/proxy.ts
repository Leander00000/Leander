import { NextResponse, type NextRequest } from "next/server";
import { getAppMode } from "@/lib/config";
import { getDeviceAccessConfig } from "@/lib/device-access";
import { DEVICE_COOKIE, verifyDeviceToken } from "@/lib/device-token";

export async function updateSession(request: NextRequest) {
  const mode = getAppMode();
  const path = request.nextUrl.pathname;
  let target: string | null = null;
  if (mode === "unconfigured" && path !== "/setup") target = "/setup";
  if (mode === "connected") {
    const access = getDeviceAccessConfig()!;
    const allowed = verifyDeviceToken(
      request.cookies.get(DEVICE_COOKIE)?.value,
      access.secret,
      access.owner,
    );
    const publicPath = ["/login", "/auth/device", "/setup"].includes(path);
    if (!allowed && !publicPath) target = "/login";
    if (allowed && path === "/login") target = "/";
  }
  const url = request.nextUrl.clone();
  if (target) {
    url.pathname = target;
    url.search = "";
  }
  const response = target
    ? NextResponse.redirect(url)
    : NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
