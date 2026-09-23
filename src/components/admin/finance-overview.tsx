"use client";

import { useMemo, useState } from "react";
import {
  aggregateFinance,
  formatSignedEgp,
  rangeBounds,
  type DashboardRange,
} from "@/lib/finance";
import { formatEgp, type Order } from "@/lib/orders";
import { Card, inputClass } from "@/components/admin/ui";

const RANGES: { id: DashboardRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "custom", label: "Custom" },
];

function Stat({
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

export function FinanceOverview({ orders }: { orders: Order[] }) {
  const [range, setRange] = useState<DashboardRange>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const bounds = rangeBounds(range, from, to);
    return orders.filter((order) => {
      const created = new Date(order.createdAt).getTime();
      return created >= bounds.from.getTime() && created <= bounds.to.getTime();
    });
  }, [orders, range, from, to]);

  const totals = useMemo(() => aggregateFinance(filtered), [filtered]);

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Financial overview</h3>
          <p className="mt-1 text-xs text-muted">
            Expected vs realized. Shipping charged to customers is not treated as
            product profit.
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total orders" value={String(totals.totalOrders)} />
        <Stat label="Delivered" value={String(totals.deliveredOrders)} />
        <Stat label="Returned" value={String(totals.returnedOrders)} />
        <Stat label="Cancelled" value={String(totals.cancelledOrders)} />
        <Stat label="Pending pipeline" value={String(totals.pendingOrders)} />
        <Stat
          label="Expected revenue"
          value={formatEgp(totals.expectedRevenue)}
          hint="Not yet settled"
        />
        <Stat
          label="Realized revenue"
          value={formatEgp(totals.realizedRevenue)}
          hint="Money actually received"
        />
        <Stat
          label="Product sales"
          value={formatEgp(totals.totalProductSales)}
        />
        <Stat
          label="Shipping fees charged"
          value={formatEgp(totals.shippingFeesCollected)}
        />
        <Stat
          label="Shipping costs paid"
          value={formatEgp(totals.totalShippingCostsPaid)}
        />
        <Stat
          label="Product costs"
          value={formatEgp(totals.totalProductCosts)}
        />
        <Stat
          label="Additional expenses"
          value={formatEgp(totals.totalAdditionalExpenses)}
        />
        <Stat
          label="Return costs"
          value={formatEgp(totals.totalReturnCosts)}
        />
        <Stat
          label="Net profit (realized)"
          value={formatSignedEgp(totals.netProfit)}
        />
        <Stat label="Total losses" value={formatEgp(totals.totalLosses)} />
        <Stat
          label="Outstanding settlement"
          value={formatEgp(totals.outstandingSettlement)}
          hint="Expected from couriers"
        />
        <Stat label="Cash in" value={formatEgp(totals.moneyIn)} />
        <Stat label="Cash out" value={formatEgp(totals.moneyOut)} />
        <Stat
          label="Net cash flow"
          value={formatSignedEgp(totals.netCashFlow)}
        />
      </div>
    </section>
  );
}
