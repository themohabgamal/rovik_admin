"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  calculateImportOrder,
  defaultImportDraft,
  defaultLocalDraft,
  expensesToJson,
  formatEgp,
  formatUsd,
  newExpenseLine,
  newProductLine,
  parseExpensesJson,
  parseProductsJson,
  parseStockType,
  productsToJson,
  type ImportExpenseLine,
  type ImportProductLine,
  type StockType,
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

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  cost: number | null;
};

type Props = {
  mode: "new" | "edit";
  initial?: ImportOrderRow | null;
};

export function ImportOrderCalculator({ mode, initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const importDraft = defaultImportDraft();
  const localDraft = defaultLocalDraft();
  const initialType = initial
    ? parseStockType(initial.stock_type)
    : "import";

  const [stockType, setStockType] = useState<StockType>(initialType);
  const [name, setName] = useState(initial?.name ?? importDraft.name);
  const [supplierName, setSupplierName] = useState(
    initial?.supplier_name ?? importDraft.supplierName
  );
  const [orderDate, setOrderDate] = useState(
    initial?.order_date ?? importDraft.orderDate
  );
  const [status, setStatus] = useState<"draft" | "completed">(
    initial?.status ?? "draft"
  );
  const [exchangeRate, setExchangeRate] = useState(
    String(initial?.exchange_rate ?? importDraft.exchangeRate)
  );
  const [internationalShippingUsd, setInternationalShippingUsd] = useState(
    String(
      initial?.international_shipping_usd ?? importDraft.internationalShippingUsd
    )
  );
  const [products, setProducts] = useState<ImportProductLine[]>(
    initial ? parseProductsJson(initial.products) : importDraft.products
  );
  const [expenses, setExpenses] = useState<ImportExpenseLine[]>(
    initial ? parseExpensesJson(initial.expenses) : importDraft.expenses
  );
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, cost")
        .eq("is_active", true)
        .order("name");
      setCatalog((data as CatalogProduct[]) ?? []);
    })();
  }, []);

  const calc = useMemo(
    () =>
      calculateImportOrder({
        stockType,
        exchangeRate: Number(exchangeRate) || 0,
        internationalShippingUsd: Number(internationalShippingUsd) || 0,
        products,
        expenses,
      }),
    [stockType, exchangeRate, internationalShippingUsd, products, expenses]
  );

  const isLocal = stockType === "local";

  function switchStockType(next: StockType) {
    if (next === stockType) return;
    if (mode === "edit") {
      setStockType(next);
      return;
    }
    const draft = next === "local" ? localDraft : importDraft;
    setStockType(next);
    setName(draft.name);
    setSupplierName(draft.supplierName);
    setInternationalShippingUsd(String(draft.internationalShippingUsd));
    setProducts(draft.products);
    setExpenses(draft.expenses);
  }

  function updateProduct(id: string, patch: Partial<ImportProductLine>) {
    setProducts((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function applyCatalogProduct(lineId: string, productId: string) {
    const product = catalog.find((row) => row.id === productId);
    if (!product) {
      updateProduct(lineId, { productId: null });
      return;
    }
    updateProduct(lineId, {
      productId: product.id,
      label: product.name,
      unitCostEgp: product.cost ?? 0,
    });
  }

  function updateExpense(id: string, patch: Partial<ImportExpenseLine>) {
    setExpenses((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  async function save(nextStatus?: "draft" | "completed") {
    if (!name.trim()) {
      toast("Name is required", "error");
      return;
    }
    if (products.length === 0) {
      toast("Add at least one item", "error");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      supplier_name: supplierName.trim() || null,
      order_date: orderDate || null,
      status: nextStatus ?? status,
      stock_type: stockType,
      exchange_rate: Number(exchangeRate) || 0,
      international_shipping_usd: isLocal
        ? 0
        : Number(internationalShippingUsd) || 0,
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
      toast(nextStatus === "completed" ? "Stock saved" : "Draft saved");
      router.push(`/admin/import-orders/${data.id}`);
      router.refresh();
      return;
    }

    if (!initial?.id) {
      setBusy(false);
      toast("Missing stock id", "error");
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
        title={
          mode === "new"
            ? isLocal
              ? "New local stock"
              : "New import stock"
            : name || "Stock"
        }
        description={
          isLocal
            ? "Product cost + packaging, ads, and other expenses → true cost per unit."
            : "Landed cost for imported stock. No profit or selling price."
        }
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
          <h3 className="mb-3 text-sm font-semibold">1. Stock type</h3>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm ${
                !isLocal
                  ? "bg-primary text-white"
                  : "border border-border hover:bg-background"
              }`}
              onClick={() => switchStockType("import")}
            >
              Imported
            </button>
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm ${
                isLocal
                  ? "bg-primary text-white"
                  : "border border-border hover:bg-background"
              }`}
              onClick={() => switchStockType("local")}
            >
              Local (not imported)
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name / reference">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label={isLocal ? "Supplier / source (optional)" : "Supplier"}>
              <input
                className={inputClass}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </Field>
            <Field label="Date">
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
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">2. Items</h3>
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
              Add item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  {isLocal ? (
                    <th className="px-2 py-2 font-medium">Catalog product</th>
                  ) : null}
                  <th className="px-2 py-2 font-medium">
                    {isLocal ? "Item name" : "Size / label"}
                  </th>
                  <th className="px-2 py-2 font-medium">Quantity</th>
                  <th className="px-2 py-2 font-medium">
                    {isLocal ? "Base cost / unit (EGP)" : "Unit price (USD)"}
                  </th>
                  <th className="px-2 py-2 font-medium">Line total</th>
                  <th className="px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-border/60">
                    {isLocal ? (
                      <td className="px-2 py-2">
                        <select
                          className={inputClass}
                          value={product.productId ?? ""}
                          onChange={(e) =>
                            applyCatalogProduct(product.id, e.target.value)
                          }
                        >
                          <option value="">Manual / custom</option>
                          {catalog.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name}
                              {row.cost != null ? ` · ${row.cost} EGP` : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : null}
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        value={product.label}
                        placeholder={isLocal ? "Light Bar" : "30cm"}
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
                      {isLocal ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClass}
                          value={product.unitCostEgp}
                          onChange={(e) =>
                            updateProduct(product.id, {
                              unitCostEgp: Number(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
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
                      )}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {isLocal
                        ? formatEgp(product.quantity * product.unitCostEgp)
                        : formatUsd(product.quantity * product.unitPriceUsd)}
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
          {isLocal ? (
            <p className="mt-3 text-xs text-muted">
              Base cost is what you paid for the product itself. Pick a catalog
              product to fill it, or enter manually.
            </p>
          ) : null}
        </Card>

        {!isLocal ? (
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
                  {formatUsd(calc.totalUsdCosts)} →{" "}
                  {formatEgp(calc.totalUsdCostsEgp)}
                </p>
                <p className="mt-2 text-xs text-muted">Shipping in EGP</p>
                <p className="font-medium tabular-nums">
                  {formatEgp(calc.internationalShippingEgp)}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <h3 className="mb-3 text-sm font-semibold">3. Currency (optional)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Exchange rate (1 USD = X EGP)"
                hint="Only used if an expense is entered in USD"
              >
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className={inputClass}
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
              </Field>
            </div>
          </Card>
        )}

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              4. {isLocal ? "Extra costs (packaging, ads, …)" : "Additional expenses"}
            </h3>
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
                  placeholder={
                    isLocal ? "Packaging / Ads / Shipping…" : "Expense name"
                  }
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
                    setExpenses((rows) =>
                      rows.filter((row) => row.id !== expense.id)
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">5. Cost summary</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total units" value={String(calc.totalUnits)} />
            <SummaryCard
              label="Product cost"
              value={formatEgp(calc.totalProductCostEgp)}
              hint={
                isLocal
                  ? "Base cost of items"
                  : `${formatUsd(calc.totalProductCostUsd)} at ${calc.exchangeRate} EGP/USD`
              }
            />
            {!isLocal ? (
              <SummaryCard
                label="International shipping"
                value={formatEgp(calc.internationalShippingEgp)}
                hint={formatUsd(calc.internationalShippingUsd)}
              />
            ) : null}
            <SummaryCard
              label={isLocal ? "Packaging / ads / other" : "Additional expenses"}
              value={formatEgp(calc.totalAdditionalExpensesEgp)}
            />
            {isLocal ? (
              <>
                <SummaryCard
                  label="Packaging (matched)"
                  value={formatEgp(calc.packagingTotalEgp)}
                />
                <SummaryCard
                  label="Ads (matched)"
                  value={formatEgp(calc.adsTotalEgp)}
                />
              </>
            ) : (
              <>
                <SummaryCard
                  label="Customs (matched)"
                  value={formatEgp(calc.customsTotalEgp)}
                />
                <SummaryCard
                  label="Ads (matched)"
                  value={formatEgp(calc.adsTotalEgp)}
                />
              </>
            )}
            <SummaryCard
              label="Total cost to you"
              value={formatEgp(calc.grandTotalLandedEgp)}
            />
            <SummaryCard
              label="Average cost / unit"
              value={formatEgp(calc.averageCostPerUnitEgp)}
            />
          </div>
          <div className="mt-4 rounded-xl border border-primary/40 bg-background p-4 text-sm">
            <p className="font-medium">
              {isLocal
                ? "Cost per unit = base product cost + share of packaging, ads, and other expenses"
                : "Landed cost = product + shipping + additional expenses"}
            </p>
            <p className="mt-2 text-muted">
              Total = {formatEgp(calc.totalProductCostEgp)}
              {!isLocal
                ? ` + shipping ${formatEgp(calc.internationalShippingEgp)}`
                : ""}{" "}
              + expenses {formatEgp(calc.totalAdditionalExpensesEgp)}
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">
            6. Cost per unit (what one item costs you)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-2 py-2 font-medium">Item</th>
                  <th className="px-2 py-2 font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Base cost / unit</th>
                  {!isLocal ? (
                    <th className="px-2 py-2 font-medium">Allocated shipping</th>
                  ) : null}
                  <th className="px-2 py-2 font-medium">Allocated expenses</th>
                  <th className="px-2 py-2 font-medium">Total group cost</th>
                  <th className="px-2 py-2 font-medium">Cost / unit on you</th>
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
                      {!isLocal ? (
                        <span className="block text-xs text-muted">
                          {formatUsd(row.unitPriceUsd)}
                        </span>
                      ) : null}
                    </td>
                    {!isLocal ? (
                      <td className="px-2 py-2 tabular-nums">
                        {formatEgp(row.allocatedShippingEgp)}
                      </td>
                    ) : null}
                    <td className="px-2 py-2 tabular-nums">
                      {formatEgp(row.allocatedExpensesEgp)}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatEgp(row.totalGroupCostEgp)}
                    </td>
                    <td className="px-2 py-2 text-lg font-semibold tabular-nums text-primary">
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
