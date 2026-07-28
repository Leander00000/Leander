"use server";

import { redirect } from "next/navigation";

import {
  getAppMode,
  getDashboardPinPepper,
  getOwnerEmail,
} from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (getAppMode() !== "connected") {
    return {
      error: "The dashboard connection is not ready yet.",
    };
  }

  const password = formData.get("password");

  if (typeof password !== "string" || !/^\d{4}$/.test(password)) {
    return {
      error: "That PIN is not correct.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: getOwnerEmail(),
    password: `${password}:${getDashboardPinPepper()}`,
  });

  if (error) {
    return {
      error: "That PIN is not correct.",
    };
  }

  redirect("/");
}

export async function signOutAction() {
  if (getAppMode() === "connected") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
