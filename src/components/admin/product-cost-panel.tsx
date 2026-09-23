"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeProductCost,
  mapProductExpense,
  type ExpenseCurrency,
  type ProductExpense,
} from "@/lib/product-cost";
import { formatEgp, formatSignedEgp, formatUsd } from "@/lib/money";
import { useToast } from "@/components/admin/toast";
import { ConfirmModal } from "@/components/admin/confirm-modal";
import {
  Card,
  Field,
  inputClass,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/ui";

type Props = {
  productId: string;
  sellingPrice: number;
  baseCost: number | null;
  costCurrency: ExpenseCurrency;
  onBaseCostChange?: (cost: number | null, currency: ExpenseCurrency) => void;
};

export function ProductCostPanel({
  productId,
  sellingPrice,
  baseCost,
  costCurrency,
  onBaseCostChange,
}: Props) {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<ProductExpense[]>([]);
  const [usdEgpRate, setUsdEgpRate] = useState(50.25);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductExpense | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductExpense | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<ExpenseCurrency>("USD");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [expRes, settingsRes] = await Promise.all([
      supabase
        .from("product_expenses")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false }),
      supabase
        .from("site_settings")
        .select("usd_egp_rate")
        .eq("id", "main")
        .maybeSingle(),
    ]);
    setLoading(false);
    if (expRes.error) {
      toast(expRes.error.message, "error");
      return;
    }
    setExpenses(
      (expRes.data ?? [])
        .map(mapProductExpense)
        .filter((row): row is ProductExpense => !!row)
    );
    if (settingsRes.data?.usd_egp_rate != null) {
      setUsdEgpRate(Number(settingsRes.data.usd_egp_rate) || 50.25);
    }
  }, [productId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const breakdown = useMemo(
    () =>
      computeProductCost({
        price: sellingPrice,
        baseCost,
        costCurrency,
        expenses,
        usdEgpRate,
      }),
    [sellingPrice, baseCost, costCurrency, expenses, usdEgpRate]
  );

  function resetForm() {
    setEditing(null);
    setShowForm(false);
    setName("");
    setAmount("");
    setCurrency("USD");
    setQuantity("1");
    setNote("");
    setOccurredAt("");
  }

  function startEdit(expense: ProductExpense) {
    setEditing(expense);
    setShowForm(true);
    setName(expense.name);
    setAmount(String(expense.amount));
    setCurrency(expense.currency);
    setQuantity(String(expense.quantity));
    setNote(expense.note ?? "");
    setOccurredAt(expense.occurredAt ?? "");
  }

  async function onSaveExpense(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Expense name is required", "error");
      return;
    }
    const amountN = Number(amount);
    const qtyN = Number(quantity);
    if (Number.isNaN(amountN) || amountN < 0) {
      toast("Enter a valid amount", "error");
      return;
    }
    if (Number.isNaN(qtyN) || qtyN <= 0) {
      toast("Quantity must be greater than 0", "error");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const payload = {
      product_id: productId,
      name: name.trim(),
      amount: amountN,
      currency,
      quantity: qtyN,
      note: note.trim() || null,
      occurred_at: occurredAt || null,
      updated_at: new Date().toISOString(),
    };

    const result = editing
      ? await supabase
          .from("product_expenses")
          .update(payload)
          .eq("id", editing.id)
      : await supabase.from("product_expenses").insert(payload);

    setBusy(false);
    if (result.error) {
      toast(result.error.message, "error");
      return;
    }
    toast(editing ? "Expense updated" : "Expense added");
    resetForm();
    void load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("product_expenses")
      .delete()
      .eq("id", deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (error) {
      toast(error.message, "error");
      return;
    }
    toast("Expense deleted");
    void load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Cost breakdown</h3>
            <p className="mt-1 text-xs text-muted">
              True unit cost = base cost + allocated expenses per unit · Rate 1
              USD = {usdEgpRate} EGP
            </p>
          </div>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            Add expense
          </button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Selling price" value={formatEgp(breakdown.sellingPriceEgp)} />
          <Stat
            label="Base cost"
            value={formatEgp(breakdown.baseCostEgp)}
            hint={
              baseCost == null
                ? "Not set"
                : costCurrency === "USD"
                  ? formatUsd(baseCost)
                  : undefined
            }
          />
          <Stat
            label="Expenses / unit"
            value={formatEgp(breakdown.expensesPerUnitEgp)}
          />
          <Stat
            label="True unit cost"
            value={formatEgp(breakdown.trueUnitCostEgp)}
            emphasize
          />
          <Stat
            label="Profit / unit"
            value={formatSignedEgp(breakdown.profitPerUnitEgp)}
            hint={
              breakdown.marginPercent == null
                ? undefined
                : `Margin ${breakdown.marginPercent}%`
            }
          />
        </div>

        {onBaseCostChange ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Field label="Base product cost">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={baseCost ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  onBaseCostChange(
                    v === "" ? null : Number(v),
                    costCurrency
                  );
                }}
              />
            </Field>
            <Field label="Base cost currency">
              <select
                className={inputClass}
                value={costCurrency}
                onChange={(e) =>
                  onBaseCostChange(
                    baseCost,
                    e.target.value as ExpenseCurrency
                  )
                }
              >
                <option value="USD">USD</option>
                <option value="EGP">EGP</option>
              </select>
            </Field>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted">Loading expenses…</p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-muted">
            No additional expenses yet. Add customs, shipping, packaging, etc.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-2 py-2 font-medium">Expense</th>
                  <th className="px-2 py-2 font-medium">Total</th>
                  <th className="px-2 py-2 font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Per unit</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border/60">
                    <td className="px-2 py-2">
                      <p className="font-medium">{line.name}</p>
                      {line.note ? (
                        <p className="text-xs text-muted">{line.note}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {line.currency === "USD"
                        ? formatUsd(line.amount)
                        : formatEgp(line.amount)}
                      <span className="block text-xs text-muted">
                        {formatEgp(line.amountEgp)}
                      </span>
                    </td>
                    <td className="px-2 py-2 tabular-nums">{line.quantity}</td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatEgp(line.perUnitEgp)}
                    </td>
                    <td className="px-2 py-2 text-muted">
                      {line.occurredAt ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs hover:underline"
                          onClick={() =>
                            startEdit(
                              expenses.find((x) => x.id === line.id)!
                            )
                          }
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs text-danger hover:underline"
                          onClick={() =>
                            setDeleteTarget(
                              expenses.find((x) => x.id === line.id) ?? null
                            )
                          }
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
      </Card>

      {showForm ? (
        <Card>
          <h3 className="mb-3 text-sm font-semibold">
            {editing ? "Edit expense" : "Add expense"}
          </h3>
          <form onSubmit={onSaveExpense} className="grid gap-3 sm:grid-cols-2">
            <Field label="Expense name">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customs"
                required
              />
            </Field>
            <Field label="Amount">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
            <Field label="Currency">
              <select
                className={inputClass}
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as ExpenseCurrency)
                }
              >
                <option value="USD">USD</option>
                <option value="EGP">EGP</option>
              </select>
            </Field>
            <Field
              label="Quantity (units covered)"
              hint="e.g. 100 if this $100 expense is for 100 units → $1/unit"
            >
              <input
                type="number"
                min="0.0001"
                step="1"
                className={inputClass}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </Field>
            <Field label="Date (optional)">
              <input
                type="date"
                className={inputClass}
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </Field>
            <Field label="Note (optional)">
              <input
                className={inputClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? "Saving…" : editing ? "Save expense" : "Add expense"}
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete expense?"
        message={`Remove "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        emphasize ? "border-primary bg-background" : "border-border"
      }`}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
