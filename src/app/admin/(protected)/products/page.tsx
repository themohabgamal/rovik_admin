"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CategoryRow, ProductRow } from "@/lib/types/database";
import { useToast } from "@/components/admin/toast";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import {
  PageHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  inputClass,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/ui";

type ProductWithCategory = ProductRow & {
  categories: Pick<CategoryRow, "label" | "slug"> | null;
};

export default function ProductsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [featured, setFeatured] = useState("");
  const [active, setActive] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductWithCategory | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const [productsRes, catsRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, categories(label, slug)")
        .order("sort_order", { ascending: true }),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    setLoading(false);
    if (productsRes.error) {
      setError(productsRes.error.message);
      return;
    }
    setRows((productsRes.data as ProductWithCategory[]) ?? []);
    setCategories(catsRes.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryId && r.category_id !== categoryId) return false;
      if (featured === "yes" && !r.featured) return false;
      if (featured === "no" && r.featured) return false;
      if (active === "yes" && !r.is_active) return false;
      if (active === "no" && r.is_active) return false;
      if (
        q &&
        !r.name.toLowerCase().includes(q) &&
        !r.slug.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, search, categoryId, featured, active]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("products")
      .delete()
      .eq("id", deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (err) {
      toast(err.message, "error");
      return;
    }
    toast("Product deleted");
    void load();
  }

  async function duplicate(row: ProductWithCategory) {
    const supabase = createClient();
    const slug = `${row.slug}-copy-${Date.now().toString(36)}`;
    const { id: _id, created_at: _c, updated_at: _u, categories: _cat, ...rest } =
      row;
    const { error: err } = await supabase.from("products").insert({
      ...rest,
      slug,
      name: `${row.name} (copy)`,
      is_active: false,
      featured: false,
    });
    if (err) {
      toast(err.message, "error");
      return;
    }
    toast("Product duplicated");
    void load();
  }

  function copyPublicUrl(slug: string) {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      window.location.origin;
    const url = `${origin}/product/${slug}`;
    void navigator.clipboard.writeText(url);
    toast("Public URL copied");
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage monitor light bar listings."
        actions={
          <Link href="/admin/products/new" className={btnPrimary}>
            Add product
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className={inputClass}
          placeholder="Search name or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={inputClass}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          value={featured}
          onChange={(e) => setFeatured(e.target.value)}
        >
          <option value="">Featured: all</option>
          <option value="yes">Featured</option>
          <option value="no">Not featured</option>
        </select>
        <select
          className={inputClass}
          value={active}
          onChange={(e) => setActive(e.target.value)}
        >
          <option value="">Status: all</option>
          <option value="yes">Active</option>
          <option value="no">Inactive</option>
        </select>
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState message="No products match your filters." />
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Featured</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Sort</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-background">
                        {row.image_url ? (
                          <Image
                            src={row.image_url}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <span className="font-medium">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.slug}</td>
                  <td className="px-4 py-3">
                    {row.categories?.label ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {Number(row.price).toLocaleString()} EGP
                  </td>
                  <td className="px-4 py-3">{row.featured ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        row.is_active
                          ? "bg-success/15 text-success"
                          : "bg-muted/20 text-muted"
                      }`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Link
                        href={`/admin/products/${row.id}`}
                        className={btnSecondary + " !px-2 !py-1 text-xs"}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyPublicUrl(row.slug)}
                        className={btnSecondary + " !px-2 !py-1 text-xs"}
                      >
                        Copy URL
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicate(row)}
                        className={btnSecondary + " !px-2 !py-1 text-xs"}
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-md px-2 py-1 text-xs text-danger hover:bg-danger/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete product?"
        message={`Permanently delete “${deleteTarget?.name}”? Prefer deactivating if you may need it later.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
