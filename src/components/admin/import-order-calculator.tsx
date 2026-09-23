"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  calculateImportOrder,
  defaultImportDraft,
  expensesToJson,
  formatEgp,
  formatUsd,
  newExpenseLine,
  newProductLine,
  parseExpensesJson,
  parseProductsJson,
  productsToJson,
  type ImportExpenseLine,
  type ImportProductLine,
} from "@/lib/import-calculator";
import type { ImportOrderRow } from "@/lib/types/database";
import { useToast } from "@/components/admin/toast";
import {
  Card,
  Field,
  PageHeader,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "@/components/admin/ui";

type Props = {
  mode: "new" | "edit";
  initial?: ImportOrderRow | null;
};

export function ImportOrderCalculator({ mode, initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const draft = defaultImportDraft();

  const [name, setName] = useState(initial?.name ?? draft.name);
  const [supplierName, setSupplierName] = useState(initial?.supplier_name ?? draft.supplierName);
  const [orderDate, setOrderDate] = useState(
    initial?.order_date ?? draft.orderDate
  );
  const [status, setStatus] = useState<"draft" | "completed">(
    initial?.status ?? "draft"
  );
  const [exchangeRate, setExchangeRate] = useState(
    String(initial?.exchange_rate ?? draft.exchangeRate)
  );
  const [internationalShippingUsd, setInternationalShippingUsd] = useState(
    String(initial?.international_shipping_usd ?? draft.internationalShippingUsd)
  );
  const [products, setProducts] = useState<ImportProductLine[]>(
    initial ? parseProductsJson(initial.products) : draft.products
  );
  const [expenses, setExpenses] = useState<ImportExpenseLine[]>(
    initial ? parseExpensesJson(initial.expenses) : draft.expenses
  );
  const [busy, setBusy] = useState(false);

  const calc = useMemo(
    () =>
      calculateImportOrder({
        exchangeRate: Number(exchangeRate) || 0,
        internationalShippingUsd: Number(internationalShippingUsd) || 0,
        products,
        expenses,
      }),
    [exchangeRate, internationalShippingUsd, products, expenses]
  );

  function updateProduct(id: string, patch: Partial<ImportProductLine>) {
    setProducts((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function updateExpense(id: string, patch: Partial<ImportExpenseLine>) {
    setExpenses((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  async function save(nextStatus?: "draft" | "completed") {
    if (!name.trim()) {
      toast("Order name is required", "error");
      return;
    }
    if (products.length === 0) {
      toast("Add at least one product line", "error");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      supplier_name: supplierName.trim() || null,
      order_date: orderDate || null,
      status: nextStatus ?? status,
      exchange_rate: Number(exchangeRate) || 0,
      international_shipping_usd: Number(internationalShippingUsd) || 0,
      products: productsToJson(products),
      expenses: expensesToJson(expenses),
      updated_at: new Date().toISOString(),
    };

    if (mode === "new") {
      const { data, error } = await supabase
        .from("import_orders")
        .insert(payload)
        .select("id")
        .single();
      setBusy(false);
      if (error) {
        toast(error.message, "error");
        return;
      }
      toast(nextStatus === "completed" ? "Import order completed" : "Draft saved");
      router.push(`/admin/import-orders/${data.id}`);
      router.refresh();
      return;
    }

    if (!initial?.id) {
      setBusy(false);
      toast("Missing order id", "error");
      return;
    }

    const { error } = await supabase
      .from("import_orders")
      .update(payload)
      .eq("id", initial.id);
    setBusy(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    if (nextStatus) setStatus(nextStatus);
    toast(nextStatus === "completed" ? "Marked completed" : "Changes saved");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={mode === "new" ? "New import order" : name || "Import order"}
        description="Calculate real landed cost per product. No profit or selling price."
        actions={
          <>
            <Link href="/admin/import-orders" className={btnSecondary}>
              Back
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save("draft")}
              className={btnSecondary}
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save("completed")}
              className={btnPrimary}
            >
              {status === "completed" ? "Save" : "Mark completed"}
            </button>
          </>
        }
      />

      <div className="space-y-4">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">1. Order information</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Order name / reference">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Supplier">
              <input
                className={inputClass}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </Field>
            <Field label="Order date">
              <input
                type="date"
                className={inputClass}
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "draft" | "completed")
                }
              >
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
          </div>
          {mode === "edit" && initial ? (
            <p className="mt-3 text-xs text-muted">
              Exchange rate locked for this order: 1 USD = {initial.exchange_rate}{" "}
              EGP (edit below only if you intentionally want to update it)
            </p>
          ) : null}
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">2. Products</h3>
            <button
              type="button"
              className={btnSecondary}
              onClick={() =>
                setProducts((rows) => [
                  ...rows,
                  newProductLine({ sortOrder: rows.length }),
                ])
              }
            >
              Add product
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-2 py-2 font-medium">Size / label</th>
                  <th className="px-2 py-2 font-medium">Quantity</th>
                  <th className="px-2 py-2 font-medium">Unit price (USD)</th>
                  <th className="px-2 py-2 font-medium">Line total (USD)</th>
                  <th className="px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-border/60">
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        value={product.label}
                        placeholder="30cm"
                        onChange={(e) =>
                          updateProduct(product.id, { label: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={product.quantity}
                        onChange={(e) =>
                          updateProduct(product.id, {
                            quantity: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={product.unitPriceUsd}
                        onChange={(e) =>
                          updateProduct(product.id, {
                            unitPriceUsd: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatUsd(product.quantity * product.unitPriceUsd)}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="text-xs text-danger hover:underline"
                        onClick={() =>
                          setProducts((rows) =>
                            rows.filter((row) => row.id !== product.id)
                          )
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">
            3. International shipping & currency
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="International shipping (USD)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={internationalShippingUsd}
                onChange={(e) => setInternationalShippingUsd(e.target.value)}
              />
            </Field>
            <Field label="Exchange rate (1 USD = X EGP)">
              <input
                type="number"
                min="0"
                step="0.0001"
                className={inputClass}
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
              />
            </Field>
            <div className="rounded-xl border border-border bg-background p-3 text-sm">
              <p className="text-xs text-muted">USD costs converted</p>
              <p className="mt-1 font-medium tabular-nums">
                {formatUsd(calc.totalUsdCosts)} → {formatEgp(calc.totalUsdCostsEgp)}
              </p>
              <p className="mt-2 text-xs text-muted">Shipping in EGP</p>
              <p className="font-medium tabular-nums">
                {formatEgp(calc.internationalShippingEgp)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">4. Additional expenses</h3>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setExpenses((rows) => [...rows, newExpenseLine()])}
            >
              Add expense
            </button>
          </div>
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1.5fr_1fr_0.7fr_1.5fr_auto]"
              >
                <input
                  className={inputClass}
                  placeholder="Expense name"
                  value={expense.name}
                  onChange={(e) =>
                    updateExpense(expense.id, { name: e.target.value })
                  }
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={expense.amount}
                  onChange={(e) =>
                    updateExpense(expense.id, {
                      amount: Number(e.target.value) || 0,
                    })
                  }
                />
                <select
                  className={inputClass}
                  value={expense.currency}
                  onChange={(e) =>
                    updateExpense(expense.id, {
                      currency: e.target.value as "USD" | "EGP",
                    })
                  }
                >
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                </select>
                <input
                  className={inputClass}
                  placeholder="Notes (optional)"
                  value={expense.notes ?? ""}
                  onChange={(e) =>
                    updateExpense(expense.id, { notes: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="text-xs text-danger hover:underline"
                  onClick={() =>
                    setExpenses((rows) => rows.filter((row) => row.id !== expense.id))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">5. Cost breakdown</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total products (units)" value={String(calc.totalUnits)} />
            <SummaryCard
              label="Product cost"
              value={formatEgp(calc.totalProductCostEgp)}
              hint={`${formatUsd(calc.totalProductCostUsd)} at ${calc.exchangeRate} EGP/USD`}
            />
            <SummaryCard
              label="International shipping"
              value={formatEgp(calc.internationalShippingEgp)}
              hint={formatUsd(calc.internationalShippingUsd)}
            />
            <SummaryCard
              label="Additional expenses"
              value={formatEgp(calc.totalAdditionalExpensesEgp)}
            />
            <SummaryCard label="Customs (matched)" value={formatEgp(calc.customsTotalEgp)} />
            <SummaryCard label="Ads (matched)" value={formatEgp(calc.adsTotalEgp)} />
            <SummaryCard
              label="Grand total spent"
              value={formatEgp(calc.grandTotalLandedEgp)}
            />
            <SummaryCard
              label="Average cost / unit"
              value={formatEgp(calc.averageCostPerUnitEgp)}
            />
          </div>
          <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm">
            <p className="font-medium">Landed cost formula</p>
            <p className="mt-2 text-muted">
              Grand total = product cost ({formatEgp(calc.totalProductCostEgp)}) + shipping (
              {formatEgp(calc.internationalShippingEgp)}) + additional expenses (
              {formatEgp(calc.totalAdditionalExpensesEgp)})
            </p>
            <p className="mt-2 text-muted">
              Shared costs are allocated to each size by its share of total supplier product
              value — not split equally by unit count.
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">6. Final product costs</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-2 py-2 font-medium">Product size</th>
                  <th className="px-2 py-2 font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Unit product cost</th>
                  <th className="px-2 py-2 font-medium">Allocated shipping</th>
                  <th className="px-2 py-2 font-medium">Allocated add. expenses</th>
                  <th className="px-2 py-2 font-medium">Total group cost</th>
                  <th className="px-2 py-2 font-medium">Final cost / unit</th>
                  <th className="px-2 py-2 font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {calc.products.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="px-2 py-2 font-medium">{row.label || "—"}</td>
                    <td className="px-2 py-2 tabular-nums">{row.quantity}</td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatEgp(row.unitProductCostEgp)}
                      <span className="block text-xs text-muted">
                        {formatUsd(row.unitPriceUsd)}
                      </span>
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatEgp(row.allocatedShippingEgp)}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatEgp(row.allocatedExpensesEgp)}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatEgp(row.totalGroupCostEgp)}
                    </td>
                    <td className="px-2 py-2 font-semibold tabular-nums text-primary">
                      {formatEgp(row.finalCostPerUnitEgp)}
                    </td>
                    <td className="px-2 py-2 tabular-nums">{row.sharePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
