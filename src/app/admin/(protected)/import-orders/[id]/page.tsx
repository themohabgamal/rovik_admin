"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ImportOrderRow } from "@/lib/types/database";
import { ImportOrderCalculator } from "@/components/admin/import-order-calculator";
import { ErrorState, LoadingState } from "@/components/admin/ui";

export default function EditImportOrderPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<ImportOrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("import_orders")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (!data) {
      setError("Import order not found");
      return;
    }
    setRow(data as ImportOrderRow);
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error || !row) return <ErrorState message={error || "Not found"} onRetry={load} />;

  return <ImportOrderCalculator mode="edit" initial={row} />;
}
