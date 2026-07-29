"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WaitlistRow } from "@/lib/types/database";
import { useToast } from "@/components/admin/toast";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import {
  PageHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  inputClass,
  btnSecondary,
} from "@/components/admin/ui";

export default function WaitlistPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WaitlistRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(q));
  }, [rows, search]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("waitlist")
      .delete()
      .eq("id", deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (err) {
      toast(err.message, "error");
      return;
    }
    toast("Entry deleted");
    void load();
  }

  function exportCsv() {
    const header = "email,source,created_at\n";
    const body = filtered
      .map(
        (r) =>
          `"${r.email.replace(/"/g, '""')}","${(r.source ?? "").replace(/"/g, '""')}","${r.created_at}"`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rovik-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV exported");
  }

  return (
    <div>
      <PageHeader
        title="Waitlist"
        description={`${rows.length} total signup${rows.length === 1 ? "" : "s"}`}
        actions={
          <button type="button" onClick={exportCsv} className={btnSecondary}>
            Export CSV
          </button>
        }
      />

      <div className="mb-4 max-w-sm">
        <input
          className={inputClass}
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState message="No waitlist entries found." />
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3 text-muted">{row.source ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(row)}
                      className="text-xs text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete waitlist entry?"
        message={`Remove ${deleteTarget?.email}?`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
