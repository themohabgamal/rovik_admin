"use client";

import { logoutAction } from "@/app/admin/actions";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm hover:bg-background"
      >
        Sign out
      </button>
    </form>
  );
}
