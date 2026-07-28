import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { hasSupabaseConfig } from "@/lib/config";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

export async function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. The request proxy refreshes them.
          }
        },
      },
    },
  );
}
