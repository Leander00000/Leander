export type AppMode = "connected" | "demo" | "unconfigured";

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

  if (process.env.NODE_ENV !== "production") {
    return "demo";
  }

  return "unconfigured";
}

export function getOwnerEmail() {
  return process.env.OWNER_EMAIL?.trim().toLowerCase() ?? "";
}
