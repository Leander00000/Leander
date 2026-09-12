"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEVICE_COOKIE } from "@/lib/device-token";

export async function signOutAction() {
  (await cookies()).delete(DEVICE_COOKIE);
  redirect("/login");
}
