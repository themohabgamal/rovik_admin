"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  calculateImportOrder,
  formatEgp,
  parseExpensesJson,
  parseProductsJson,
} from "@/lib/import-calculator";
import type { ImportOrderRow } from "@/lib/types/database";
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

export default function ImportOrdersPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ImportOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ImportOrderRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("import_orders")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setRows((data ?? []) as ImportOrderRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("import_orders")
      .delete()
      .eq("id", deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (err) {
      toast(err.message, "error");
      return;
    }
    toast("Import order deleted");
    void load();
  }

  return (
    <div>
      <PageHeader
        title="Import cost calculator"
        description="Track landed cost for China import orders before adding profit."
        actions={
          <Link href="/admin/import-orders/new" className={btnPrimary}>
            New import order
          </Link>
        }
      />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState message="No import orders yet. Create your first shipment calculator." />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Grand total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const calc = calculateImportOrder({
                  exchangeRate: row.exchange_rate,
                  internationalShippingUsd: row.international_shipping_usd,
                  products: parseProductsJson(row.products),
                  expenses: parseExpensesJson(row.expenses),
                });
                return (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted">{row.supplier_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.order_date
                        ? new Date(row.order_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.exchange_rate}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatEgp(calc.grandTotalLandedEgp)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          row.status === "completed"
                            ? "bg-primary text-white"
                            : "border border-border"
                        }`}
                      >
                        {row.status === "completed" ? "Completed" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/import-orders/${row.id}`}
                          className={btnSecondary}
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          className="text-xs text-danger hover:underline"
                          onClick={() => setDeleteTarget(row)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete import order?"
        message={`Remove "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
