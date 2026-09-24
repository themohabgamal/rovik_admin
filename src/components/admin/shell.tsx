"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/admin/actions";
import { OrderWatcher } from "@/components/admin/order-watcher";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/order-making", label: "Order making" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/import-orders", label: "Stock" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-60 bg-black text-white transition-transform lg:static lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-14 items-center gap-2 border-b border-white/10 px-5">
            <img src="/rovik-logo.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-wide">
              Rovik <span className="text-primary">Admin</span>
            </span>
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
                  className={`rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? "bg-primary text-white"
                      : "text-white/80 hover:bg-white/10"
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
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col bg-white">
          <header className="flex h-14 items-center justify-between border-b border-border bg-white px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-black px-2 py-1 text-sm lg:hidden"
                onClick={() => setOpen(true)}
              >
                Menu
              </button>
              <h1 className="flex items-center gap-2 text-sm font-semibold">
                <img
                  src="/rovik-logo.png"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 lg:hidden"
                />
                Rovik Admin
              </h1>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-xl border border-black px-3 py-1.5 text-xs hover:bg-black hover:text-white"
              >
                Sign out
              </button>
            </form>
          </header>
          <main className="flex-1 p-4 lg:p-6">
            <OrderWatcher />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
