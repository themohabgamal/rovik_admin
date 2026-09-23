"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary"
      ? "bg-primary text-white hover:bg-primary-hover"
      : "border border-border bg-card text-foreground hover:bg-background";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 ${cls}`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
