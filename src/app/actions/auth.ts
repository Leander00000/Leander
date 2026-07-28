"use server";

import { redirect } from "next/navigation";

import { getAppMode } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  if (getAppMode() === "connected") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

