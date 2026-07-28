import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const AAD_PREFIX = "leander:google-calendar-token:v1";

export type GoogleTokenEnvelope = {
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
  scope?: string;
  tokenType?: string;
};

function getEncryptionKey() {
  const encoded = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ?? "";
  if (!encoded) return null;

  try {
    const key = Buffer.from(encoded, "base64");
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

function getAdditionalAuthenticatedData(userId: string) {
  const normalized = userId.trim();
  if (!normalized || normalized.length > 128) {
    throw new Error("Google token owner is invalid.");
  }

  return Buffer.from(`${AAD_PREFIX}:${normalized}`, "utf8");
}

export function hasGoogleTokenEncryptionKey() {
  return getEncryptionKey() !== null;
}

function isTokenEnvelope(value: unknown): value is GoogleTokenEnvelope {
  if (!value || typeof value !== "object") return false;

  const token = value as Record<string, unknown>;
  return (
    typeof token.refreshToken === "string" &&
    token.refreshToken.length >= 20 &&
    (token.accessToken === undefined || typeof token.accessToken === "string") &&
    (token.expiryDate === undefined ||
      (typeof token.expiryDate === "number" &&
        Number.isFinite(token.expiryDate))) &&
    (token.scope === undefined || typeof token.scope === "string") &&
    (token.tokenType === undefined || typeof token.tokenType === "string")
  );
}

export function encryptGoogleTokenEnvelope(
  token: GoogleTokenEnvelope,
  userId: string,
) {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("Google token encryption is not configured.");
  }

  if (!isTokenEnvelope(token)) {
    throw new Error("Google returned an invalid token.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(getAdditionalAuthenticatedData(userId));

  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(token), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptGoogleTokenEnvelope(value: string, userId: string) {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("Google token encryption is not configured.");
  }

  const [version, encodedIv, encodedTag, encodedCiphertext, extra] =
    value.split(".");
  if (
    version !== VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedCiphertext ||
    extra
  ) {
    throw new Error("Stored Google credentials are invalid.");
  }

  const iv = Buffer.from(encodedIv, "base64url");
  const tag = Buffer.from(encodedTag, "base64url");
  const ciphertext = Buffer.from(encodedCiphertext, "base64url");

  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Stored Google credentials are invalid.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(getAdditionalAuthenticatedData(userId));
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
  const parsed: unknown = JSON.parse(plaintext);

  if (!isTokenEnvelope(parsed)) {
    throw new Error("Stored Google credentials are invalid.");
  }

  return parsed;
}

export function tokenEnvelopeEquals(
  first: GoogleTokenEnvelope,
  second: GoogleTokenEnvelope,
) {
  const a = Buffer.from(JSON.stringify(first));
  const b = Buffer.from(JSON.stringify(second));
  return a.length === b.length && timingSafeEqual(a, b);
}
