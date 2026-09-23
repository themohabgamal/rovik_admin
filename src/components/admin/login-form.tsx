"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/admin/actions";

function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, null);

  return (
    <form
      action={action}
      className="space-y-4"
      onPointerDown={() => {
        void import("@/lib/order-alerts").then((m) => m.unlockAlertSound());
      }}
    >
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1.5">
        <span className="text-xs font-medium">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
        className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <SignInButton />
    </form>
  );
}
