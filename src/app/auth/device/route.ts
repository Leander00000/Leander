import { NextResponse } from "next/server";
import { getAppOrigin, getAppMode } from "@/lib/config";
import { getDeviceAccessConfig } from "@/lib/device-access";
import {
  DEVICE_COOKIE,
  DEVICE_MAX_AGE,
  equalSecret,
  issueDeviceToken,
} from "@/lib/device-token";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  const config = getDeviceAccessConfig();
  if (
    getAppMode() !== "connected" ||
    !config ||
    request.headers.get("origin") !== getAppOrigin()
  ) {
    return NextResponse.json(
      { error: "Device access is unavailable." },
      { status: 403, headers },
    );
  }
  if (Number(request.headers.get("content-length") ?? 0) > 1024) {
    return NextResponse.json(
      { error: "Invalid link." },
      { status: 400, headers },
    );
  }
  let key: unknown;
  try {
    key = (await request.json()).key;
  } catch {
    /* Invalid input is denied below. */
  }
  if (
    typeof key !== "string" ||
    key.length > 128 ||
    !equalSecret(key, config.secret)
  ) {
    return NextResponse.json(
      { error: "This private link is invalid or has been replaced." },
      { status: 403, headers },
    );
  }
  const response = NextResponse.json({ ok: true }, { headers });
  response.cookies.set(
    DEVICE_COOKIE,
    issueDeviceToken(config.secret, config.owner),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DEVICE_MAX_AGE,
    },
  );
  return response;
}
