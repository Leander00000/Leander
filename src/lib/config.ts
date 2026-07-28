export type AppMode = "connected" | "demo" | "unconfigured";

const DASHBOARD_OWNER_EMAIL =
  "leander-dashboard-uztowxvvzuonlbasifnq@example.com";

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getAppMode(): AppMode {
  const explicitDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const hasPrivateOwner = Boolean(process.env.DASHBOARD_PIN_PEPPER?.trim());

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
  return DASHBOARD_OWNER_EMAIL;
}

export function getDashboardPinPepper() {
  return process.env.DASHBOARD_PIN_PEPPER?.trim() ?? "";
}
