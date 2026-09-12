import "server-only";

import { cookies } from "next/headers";
import { DEVICE_COOKIE, verifyDeviceToken } from "@/lib/device-token";

export function getDeviceAccessConfig() {
  const secret = process.env.DASHBOARD_ACCESS_KEY?.trim() ?? "";
  const owner = process.env.OWNER_USER_ID?.trim() ?? "";
  if (
    !/^[A-Za-z0-9_-]{43,128}$/.test(secret) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      owner,
    )
  )
    return null;
  return { secret, owner };
}

export async function hasDeviceAccess() {
  const config = getDeviceAccessConfig();
  if (!config) return false;
  return verifyDeviceToken(
    (await cookies()).get(DEVICE_COOKIE)?.value,
    config.secret,
    config.owner,
  );
}
