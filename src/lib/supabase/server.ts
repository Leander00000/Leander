import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseConfig } from "@/lib/config";
import { hasDeviceAccess } from "@/lib/device-access";

// Privileged credentials never leave the server. Every caller must scope queries
// to the configured owner; a verified device cookie is mandatory even for reads.
export async function createClient() {
  if (
    !hasSupabaseConfig() ||
    !process.env.SUPABASE_SECRET_KEY ||
    !(await hasDeviceAccess())
  ) {
    throw new Error("Private dashboard access is required.");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
