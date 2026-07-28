import "server-only";

import { getOwnerEmail } from "@/lib/config";

type AuthenticationMethod = {
  method?: unknown;
};

type OwnerClaims = {
  amr?: unknown;
  email?: unknown;
  sub?: unknown;
};

function hasOAuthAuthenticationMethod(amr: unknown) {
  if (!Array.isArray(amr)) return false;

  return amr.some((entry) => {
    if (entry === "oauth") return true;
    if (!entry || typeof entry !== "object") return false;

    return (entry as AuthenticationMethod).method === "oauth";
  });
}

export function isOwnerOAuthSession(claims: unknown) {
  if (!claims || typeof claims !== "object") return false;

  const value = claims as OwnerClaims;
  const email =
    typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const userId = typeof value.sub === "string" ? value.sub : "";

  return Boolean(
    userId &&
      email === getOwnerEmail() &&
      hasOAuthAuthenticationMethod(value.amr),
  );
}
