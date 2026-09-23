"use client";

import { useActionState } from "react";
import {
  saveOrderFinance,
  updateOrderStatus,
} from "@/app/admin/finance-actions";
import {
  computeOrderMoney,
  formatSignedEgp,
  ORDER_STATUSES,
  SETTLEMENT_LABELS,
  STATUS_LABELS,
} from "@/lib/finance";
import { formatDate, formatEgp, type Order } from "@/lib/orders";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card, Field, inputClass } from "@/components/admin/ui";

function moneyInput(value: number | null | undefined) {
  return value == null || Number.isNaN(Number(value)) ? "" : String(value);
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div>
        <p>{label}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      <p className="shrink-0 font-medium tabular-nums">{value}</p>
    </div>
  );
}

export function OrderFinancePanel({
  order,
  transactions = [],
  suggestedProductCost = null,
}: {
  order: Order;
  transactions?: {
    id: string;
    type: string;
    direction: string;
    amount: number;
    note: string | null;
    occurred_at: string;
  }[];
  suggestedProductCost?: number | null;
}) {
  const [financeState, financeAction] = useActionState(saveOrderFinance, null);
  const [statusState, statusAction] = useActionState(updateOrderStatus, null);
  const snap = computeOrderMoney(order);
  const f = order.finance;
  const error = financeState?.error || statusState?.error;
  const ok = financeState?.ok || statusState?.ok;
  const productCostDefault =
    f.productCost != null
      ? moneyInput(f.productCost)
      : suggestedProductCost != null
        ? moneyInput(suggestedProductCost)
        : "";

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Order status</h3>
          <span className="rounded-full border border-border px-3 py-1 text-xs">
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <form action={statusAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={order.id} />
          <Field label="Lifecycle status">
            <select
              name="status"
              defaultValue={order.status}
              className={inputClass}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>
          <SubmitButton>Update status</SubmitButton>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Financial summary</h3>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Customer payment
            </p>
            <Row label="Product subtotal" value={formatEgp(snap.productSubtotal)} />
            <Row
              label="Shipping charged to customer"
              value={formatEgp(snap.shippingFeeCharged)}
            />
            <Row
              label="Expected customer total"
              value={formatEgp(snap.customerTotal)}
            />

            <p className="pt-3 text-xs font-medium uppercase tracking-wide text-muted">
              Settlement
            </p>
            <Row
              label="Expected collection"
              value={formatEgp(snap.expectedCollection)}
            />
            <Row
              label="Amount collected"
              value={
                snap.amountCollected == null
                  ? "Not set"
                  : formatEgp(snap.amountCollected)
              }
            />
            <Row
              label="Amount received by me"
              value={
                snap.amountReceived == null
                  ? "Not set"
                  : formatEgp(snap.amountReceived)
              }
            />
            <Row
              label="Outstanding"
              value={
                snap.outstandingSettlement == null
                  ? "—"
                  : formatEgp(snap.outstandingSettlement)
              }
            />
            <Row
              label="Settlement status"
              value={SETTLEMENT_LABELS[f.settlementStatus]}
            />

            <p className="pt-3 text-xs font-medium uppercase tracking-wide text-muted">
              Costs
            </p>
            <Row
              label="Product cost"
              value={f.productCost == null ? "Not set" : formatEgp(f.productCost)}
            />
            <Row
              label="Actual shipping company cost"
              value={
                f.shippingCompanyCost == null
                  ? "Not set"
                  : formatEgp(f.shippingCompanyCost)
              }
            />
            <Row label="Packaging" value={formatEgp(f.packagingCost)} />
            <Row label="Advertising" value={formatEgp(f.advertisingCost)} />
            <Row
              label="Other expenses"
              value={formatEgp(f.otherExpenses)}
              hint={f.otherExpensesNote || undefined}
            />
            <Row
              label="Total business expenses"
              value={formatEgp(snap.totalBusinessExpenses)}
            />

            <p className="pt-3 text-xs font-medium uppercase tracking-wide text-muted">
              Profit
            </p>
            <Row
              label={
                snap.labels.revenueKind === "realized"
                  ? "Realized revenue"
                  : snap.labels.revenueKind === "expected"
                    ? "Expected revenue"
                    : "Revenue"
              }
              value={
                snap.labels.revenueKind === "realized" && snap.realizedRevenue != null
                  ? formatEgp(snap.realizedRevenue)
                  : snap.labels.revenueKind === "expected"
                    ? formatEgp(snap.expectedCollection)
                    : "—"
              }
            />
            <Row
              label={
                snap.labels.profitKind === "realized"
                  ? "Net profit (realized)"
                  : snap.labels.profitKind === "expected"
                    ? "Expected profit"
                    : snap.labels.profitKind === "loss"
                      ? "Net loss"
                      : "Profit"
              }
              value={
                snap.isRealized && snap.netProfit != null
                  ? formatSignedEgp(snap.netProfit)
                  : snap.labels.profitKind === "expected" && snap.expectedProfit != null
                    ? formatSignedEgp(snap.expectedProfit)
                    : "—"
              }
            />
            <Row
              label="Profit margin"
              value={
                snap.profitMargin == null
                  ? "—"
                  : `${snap.profitMargin.toFixed(1)}%`
              }
            />
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Edit financials</h3>
          <form action={financeAction} className="space-y-3">
            <input type="hidden" name="id" value={order.id} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Product subtotal (EGP)">
                <input
                  className={inputClass}
                  name="product_subtotal"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.productSubtotal)}
                />
              </Field>
              <Field label="Shipping charged to customer (EGP)">
                <input
                  className={inputClass}
                  name="shipping_fee_charged"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.shippingFeeCharged)}
                />
              </Field>
              <Field
                label="Product cost / COGS (EGP)"
                hint={
                  suggestedProductCost != null && f.productCost == null
                    ? `Suggested from true unit cost: ${formatEgp(suggestedProductCost)}`
                    : suggestedProductCost != null
                      ? `True unit cost estimate: ${formatEgp(suggestedProductCost)}`
                      : "Uses product true unit cost when available"
                }
              >
                <input
                  className={inputClass}
                  name="product_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={productCostDefault}
                />
              </Field>
              <Field label="Actual shipping company cost (EGP)">
                <input
                  className={inputClass}
                  name="shipping_company_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.shippingCompanyCost)}
                />
              </Field>
              <Field label="Packaging cost (EGP)">
                <input
                  className={inputClass}
                  name="packaging_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.packagingCost)}
                />
              </Field>
              <Field label="Advertising cost (EGP)">
                <input
                  className={inputClass}
                  name="advertising_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.advertisingCost)}
                />
              </Field>
              <Field label="Other expenses (EGP)">
                <input
                  className={inputClass}
                  name="other_expenses"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.otherExpenses)}
                />
              </Field>
              <Field label="Other expenses note">
                <input
                  className={inputClass}
                  name="other_expenses_note"
                  defaultValue={f.otherExpensesNote ?? ""}
                />
              </Field>
            </div>

            <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted">
              Shipping & settlement
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Shipping company">
                <input
                  className={inputClass}
                  name="shipping_company"
                  defaultValue={f.shippingCompany ?? ""}
                />
              </Field>
              <Field label="Courier tracking number">
                <input
                  className={inputClass}
                  name="shipping_tracking_number"
                  defaultValue={f.shippingTrackingNumber ?? ""}
                />
              </Field>
              <Field label="Shipping payment status">
                <select
                  className={inputClass}
                  name="shipping_payment_status"
                  defaultValue={f.shippingPaymentStatus}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="waived">Waived</option>
                </select>
              </Field>
              <Field label="Shipping paid date">
                <input
                  className={inputClass}
                  name="shipping_paid_at"
                  type="datetime-local"
                  defaultValue={
                    f.shippingPaidAt
                      ? f.shippingPaidAt.slice(0, 16)
                      : ""
                  }
                />
              </Field>
              <Field label="Amount collected by courier (EGP)">
                <input
                  className={inputClass}
                  name="amount_collected"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.amountCollected)}
                />
              </Field>
              <Field label="Amount received by me (EGP)">
                <input
                  className={inputClass}
                  name="amount_received"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.amountReceived)}
                />
              </Field>
              <Field label="Settlement status">
                <select
                  className={inputClass}
                  name="settlement_status"
                  defaultValue={f.settlementStatus}
                >
                  <option value="pending">Pending</option>
                  <option value="partially_received">Partially received</option>
                  <option value="received">Received</option>
                  <option value="disputed">Disputed</option>
                </select>
              </Field>
              <Field label="Settlement date">
                <input
                  className={inputClass}
                  name="settlement_date"
                  type="datetime-local"
                  defaultValue={
                    f.settlementDate ? f.settlementDate.slice(0, 16) : ""
                  }
                />
              </Field>
              <Field label="Settlement reference">
                <input
                  className={inputClass}
                  name="settlement_reference"
                  defaultValue={f.settlementReference ?? ""}
                />
              </Field>
              <Field label="Settlement notes">
                <input
                  className={inputClass}
                  name="settlement_notes"
                  defaultValue={f.settlementNotes ?? ""}
                />
              </Field>
            </div>

            <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted">
              Returns
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Return reason">
                <input
                  className={inputClass}
                  name="return_reason"
                  defaultValue={f.returnReason ?? ""}
                />
              </Field>
              <Field label="Return shipping cost (EGP)">
                <input
                  className={inputClass}
                  name="return_shipping_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.returnShippingCost)}
                />
              </Field>
              <Field label="Product recoverable value (EGP)">
                <input
                  className={inputClass}
                  name="product_recoverable_value"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.productRecoverableValue)}
                />
              </Field>
              <Field label="Product lost / damaged cost (EGP)">
                <input
                  className={inputClass}
                  name="product_lost_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.productLostCost)}
                />
              </Field>
              <Field label="Additional return expenses (EGP)">
                <input
                  className={inputClass}
                  name="return_additional_expenses"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.returnAdditionalExpenses)}
                />
              </Field>
              <Field label="Customer refund (EGP)">
                <input
                  className={inputClass}
                  name="customer_refund"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={moneyInput(f.customerRefund)}
                />
              </Field>
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {ok ? (
              <p className="text-sm text-primary">Financials saved.</p>
            ) : null}
            <SubmitButton>Save financials</SubmitButton>
          </form>
        </Card>
      </div>

      {transactions.length > 0 ? (
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Money movements</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Direction</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2">{formatDate(row.occurred_at)}</td>
                    <td className="py-2">{row.type.replaceAll("_", " ")}</td>
                    <td className="py-2 capitalize">{row.direction}</td>
                    <td className="py-2 tabular-nums">{formatEgp(row.amount)}</td>
                    <td className="py-2 text-muted">{row.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
