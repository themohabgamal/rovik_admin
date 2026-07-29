"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CategoryRow } from "@/lib/types/database";
import { useToast } from "@/components/admin/toast";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import {
  PageHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/ui";

export default function CategoriesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(row: CategoryRow) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("categories")
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (err) {
      toast(err.message, "error");
      return;
    }
    toast(row.is_active ? "Category deactivated" : "Category activated");
    void load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const supabase = createClient();
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("category_id", deleteTarget.id);

    if ((count ?? 0) > 0) {
      setBusy(false);
      setDeleteTarget(null);
      toast(
        `Cannot delete — ${count} product(s) use this category. Deactivate instead.`,
        "error"
      );
      return;
    }

    const { error: err } = await supabase
      .from("categories")
      .delete()
      .eq("id", deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (err) {
      toast(err.message, "error");
      return;
    }
    toast("Category deleted");
    void load();
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize products and navigation."
        actions={
          <Link href="/admin/categories/new" className={btnPrimary}>
            Add category
          </Link>
        }
      />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState message="No categories yet. Create your first one." />
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Sort</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">In nav</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-muted">{row.slug}</td>
                  <td className="px-4 py-3">{row.sort_order}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        row.is_active
                          ? "bg-success/15 text-success"
                          : "bg-muted/20 text-muted"
                      }`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">{row.show_in_nav ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/categories/${row.id}`}
                        className={btnSecondary + " !px-2 !py-1 text-xs"}
                      >
                        Edit
                      </Link>
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
        title="Delete category?"
        message={`Delete “${deleteTarget?.label}”? This is blocked if products still reference it.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
