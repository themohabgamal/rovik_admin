"use client";

import { useMemo, useState } from "react";
import {
  rangeBounds,
  type DashboardRange,
} from "@/lib/finance";
import { formatEgp, formatSignedEgp } from "@/lib/money";
import type { Order } from "@/lib/orders";
import { Card, inputClass } from "@/components/admin/ui";

const RANGES: { id: DashboardRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
  { id: "custom", label: "Custom" },
];

export type ProfitSnapshot = {
  totalSales: number;
  totalOrders: number;
  costOfProductsSold: number;
  additionalExpenses: number;
  netProfit: number;
};

/** Simple P&L from delivered/settled orders + product true costs when available. */
export function computeSimpleProfit(
  orders: Order[],
  trueCostBySlug?: Map<string, number>
): ProfitSnapshot {
  let totalSales = 0;
  let totalOrders = 0;
  let costOfProductsSold = 0;
  let additionalExpenses = 0;

  for (const order of orders) {
    // Count revenue from money actually received, else expected customer total for delivered
    const received = order.finance.amountReceived;
    const isSold =
      order.status === "delivered" ||
      (received != null && received > 0);

    if (!isSold) continue;
    if (order.status === "cancelled" || order.status === "returned") continue;

    totalOrders += 1;
    const sales =
      received != null && received > 0
        ? received
        : order.total ||
          order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    totalSales += sales;

    // Prefer order.finance.productCost if set; else estimate from true unit costs
    if (order.finance.productCost != null) {
      costOfProductsSold += order.finance.productCost;
    } else if (trueCostBySlug && trueCostBySlug.size > 0) {
      for (const item of order.items) {
        const unit = trueCostBySlug.get(item.slug);
        if (unit != null) costOfProductsSold += unit * item.quantity;
      }
    }

    additionalExpenses +=
      (order.finance.shippingCompanyCost ?? 0) +
      (order.finance.packagingCost ?? 0) +
      (order.finance.advertisingCost ?? 0) +
      (order.finance.otherExpenses ?? 0);
  }

  const netProfit = totalSales - costOfProductsSold - additionalExpenses;
  return {
    totalSales: Math.round(totalSales * 100) / 100,
    totalOrders,
    costOfProductsSold: Math.round(costOfProductsSold * 100) / 100,
    additionalExpenses: Math.round(additionalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
  };
}

export function ProfitOverview({
  orders,
  trueCostBySlug,
}: {
  orders: Order[];
  trueCostBySlug?: Record<string, number> | Map<string, number>;
}) {
  const [range, setRange] = useState<DashboardRange>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const costMap = useMemo(() => {
    if (!trueCostBySlug) return undefined;
    if (trueCostBySlug instanceof Map) return trueCostBySlug;
    return new Map(Object.entries(trueCostBySlug));
  }, [trueCostBySlug]);

  const filtered = useMemo(() => {
    const bounds = rangeBounds(range, from, to);
    return orders.filter((order) => {
      const created = new Date(order.createdAt).getTime();
      return created >= bounds.from.getTime() && created <= bounds.to.getTime();
    });
  }, [orders, range, from, to]);

  const profit = useMemo(
    () => computeSimpleProfit(filtered, costMap),
    [filtered, costMap]
  );

  const isLoss = profit.netProfit < 0;

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Profitability</h3>
          <p className="mt-1 text-xs text-muted">
            Net profit = sales − product cost − additional expenses
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={`rounded-xl px-3 py-1.5 text-xs ${
                range === item.id
                  ? "bg-primary text-white"
                  : "border border-border hover:bg-background"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {range === "custom" ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="date"
            className={inputClass}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            type="date"
            className={inputClass}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      ) : null}

      <Card
        className={`mb-4 border-2 p-6 ${
          isLoss ? "border-black" : "border-primary"
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {isLoss ? "Net loss" : "Net profit"}
        </p>
        <p
          className={`mt-2 text-4xl font-semibold tabular-nums ${
            isLoss ? "text-black" : "text-primary"
          }`}
        >
          {formatSignedEgp(profit.netProfit)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {formatEgp(profit.totalSales)} sales −{" "}
          {formatEgp(profit.costOfProductsSold)} product cost −{" "}
          {formatEgp(profit.additionalExpenses)} expenses
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total sales" value={formatEgp(profit.totalSales)} />
        <Metric label="Total orders" value={String(profit.totalOrders)} />
        <Metric
          label="Cost of products sold"
          value={formatEgp(profit.costOfProductsSold)}
        />
        <Metric
          label="Additional expenses"
          value={formatEgp(profit.additionalExpenses)}
          hint="Shipping paid, packaging, ads, other"
        />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
