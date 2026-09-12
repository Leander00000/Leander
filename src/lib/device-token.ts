import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const DEVICE_COOKIE = "leander_device";
export const DEVICE_MAX_AGE = 180 * 24 * 60 * 60;

export function equalSecret(first: string, second: string) {
  const a = Buffer.from(first);
  const b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueDeviceToken(
  secret: string,
  owner: string,
  now = Date.now(),
) {
  const payload = `${owner}.${Math.floor(now / 1000) + DEVICE_MAX_AGE}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function verifyDeviceToken(
  token: string | undefined,
  secret: string,
  owner: string,
  now = Date.now(),
) {
  if (!token || !secret || !owner || token.length > 300) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== owner || !/^\d+$/.test(parts[1]))
    return false;
  const expires = Number(parts[1]);
  const current = Math.floor(now / 1000);
  if (expires <= current || expires > current + DEVICE_MAX_AGE) return false;
  const payload = parts.slice(0, 3).join(".");
  return equalSecret(
    parts[3],
    createHmac("sha256", secret).update(payload).digest("hex"),
  );
}
