export type AppMode = "connected" | "demo" | "unconfigured";

function getValidatedOrigin(value: string) {
  try {
    const url = new URL(value);
    const isLocal =
      process.env.NODE_ENV !== "production" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.protocol === "http:";
    const isSecure = url.protocol === "https:";

    return (isLocal || isSecure) &&
      url.pathname === "/" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getAppMode(): AppMode {
  const explicitDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const hasPrivateOwner = Boolean(process.env.OWNER_EMAIL?.trim());

  if (explicitDemo) {
    return "demo";
  }

  if (hasSupabaseConfig() && hasPrivateOwner) {
    return "connected";
  }

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL_ENV === "preview"
  ) {
    return "demo";
  }

  return "unconfigured";
}

export function getOwnerEmail() {
  return process.env.OWNER_EMAIL?.trim().toLowerCase() ?? "";
}

export function getAppOrigin() {
  const value = process.env.APP_ORIGIN?.trim();
  return value ? getValidatedOrigin(value) : null;
}
