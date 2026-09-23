"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  cookieOptions,
  createSessionValue,
  passwordMatches,
} from "@/lib/auth/session";

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
) {
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/admin");
  const next = nextRaw.startsWith("/admin") ? nextRaw : "/admin";

  if (!process.env.ADMIN_PASSWORD) {
    return { error: "Admin password is not configured." };
  }
  if (!passwordMatches(password)) {
    return { error: "Wrong password." };
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionValue(), cookieOptions());
  redirect(next);
}

export async function logoutAction() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  redirect("/admin/login");
}
