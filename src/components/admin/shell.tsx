"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-border bg-sidebar transition-transform lg:static lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center border-b border-border px-5">
            <span className="text-sm font-semibold tracking-wide">Rovik</span>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-primary text-white"
                      : "text-foreground/80 hover:bg-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {open && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-sm lg:hidden"
                onClick={() => setOpen(true)}
              >
                Menu
              </button>
              <h1 className="text-sm font-semibold">Rovik Admin</h1>
            </div>
            <div className="flex items-center gap-3">
              {email && (
                <span className="hidden text-xs text-muted sm:inline">
                  {email}
                </span>
              )}
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-background disabled:opacity-50"
              >
                {loggingOut ? "…" : "Logout"}
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
