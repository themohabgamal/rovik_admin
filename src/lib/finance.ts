import {
  formatEgp,
  type Order,
  type OrderLine,
  type OrderStatus,
  type OrderFinance,
  type SettlementStatus,
  type FinancialStatus,
  type ShippingPaymentStatus,
} from "@/lib/orders";

export type TransactionType =
  | "shipping_payment"
  | "shipping_settlement"
  | "product_cost"
  | "packaging_cost"
  | "advertising_cost"
  | "return_shipping_cost"
  | "customer_refund"
  | "other_expense";

export type TransactionDirection = "income" | "expense";

export type { OrderFinance, SettlementStatus, FinancialStatus, ShippingPaymentStatus };

export type MoneySnapshot = {
  customerTotal: number;
  productSubtotal: number;
  shippingFeeCharged: number;
  expectedCollection: number;
  amountCollected: number | null;
  amountReceived: number | null;
  outstandingSettlement: number | null;
  totalBusinessExpenses: number;
  totalReturnCosts: number;
  expectedExpenses: number;
  expectedProfit: number | null;
  realizedRevenue: number | null;
  realizedExpenses: number | null;
  netProfit: number | null;
  profitMargin: number | null;
  isRealized: boolean;
  isLoss: boolean;
  labels: {
    revenueKind: "expected" | "realized" | "none";
    profitKind: "expected" | "realized" | "loss" | "none";
  };
};

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "received",
  "confirmed",
  "preparing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "return_requested",
  "returning",
  "returned",
  "cancelled",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  received: "Received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery failed",
  return_requested: "Return requested",
  returning: "Returning",
  returned: "Returned",
  cancelled: "Cancelled",
};

export const SETTLEMENT_LABELS: Record<SettlementStatus, string> = {
  pending: "Pending",
  partially_received: "Partially received",
  received: "Received",
  disputed: "Disputed",
};

const REALIZED_STATUSES = new Set<OrderStatus>(["delivered"]);
const RETURN_STATUSES = new Set<OrderStatus>([
  "return_requested",
  "returning",
  "returned",
]);
const NON_REVENUE_STATUSES = new Set<OrderStatus>([
  "cancelled",
  "delivery_failed",
  "returned",
]);

export function itemsSubtotal(items: OrderLine[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function money(value: number | null | undefined, fallback = 0) {
  if (value == null || Number.isNaN(Number(value))) return fallback;
  return Number(value);
}

export function nullableMoney(value: number | null | undefined) {
  if (value == null || value === ("" as unknown)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function deriveProductSubtotal(
  order: Pick<Order, "items" | "finance">
) {
  if (order.finance.productSubtotal != null) return order.finance.productSubtotal;
  return itemsSubtotal(order.items);
}

export function deriveShippingFeeCharged(
  order: Pick<Order, "total" | "items" | "finance">
) {
  if (order.finance.shippingFeeCharged != null) {
    return order.finance.shippingFeeCharged;
  }
  const sub = deriveProductSubtotal(order);
  return Math.max(order.total - sub, 0);
}

export function computeOrderMoney(
  order: Pick<Order, "status" | "total" | "items" | "finance">
): MoneySnapshot {
  const f = order.finance;
  const productSubtotal = deriveProductSubtotal(order);
  const shippingFeeCharged = deriveShippingFeeCharged(order);
  const customerTotal = productSubtotal + shippingFeeCharged;
  const expectedCollection = customerTotal;

  const productCost = money(f.productCost);
  const shippingCompanyCost = money(f.shippingCompanyCost);
  const packagingCost = money(f.packagingCost);
  const advertisingCost = money(f.advertisingCost);
  const otherExpenses = money(f.otherExpenses);

  const operatingExpenses =
    productCost +
    shippingCompanyCost +
    packagingCost +
    advertisingCost +
    otherExpenses;

  const returnTotalLoss =
    shippingCompanyCost +
    money(f.returnShippingCost) +
    money(f.returnAdditionalExpenses) +
    money(f.productLostCost) +
    money(f.customerRefund) -
    money(f.productRecoverableValue);

  const amountCollected = nullableMoney(f.amountCollected);
  const amountReceived = nullableMoney(f.amountReceived);

  const outstandingSettlement =
    amountReceived == null
      ? expectedCollection
      : Math.max(expectedCollection - amountReceived, 0);

  const isReturned = RETURN_STATUSES.has(order.status) || order.status === "returned";
  const isCancelled = order.status === "cancelled";
  const isFailed = order.status === "delivery_failed";
  const settled =
    f.settlementStatus === "received" ||
    (amountReceived != null && amountReceived > 0 && outstandingSettlement <= 0.009);
  const isDelivered = order.status === "delivered" || Boolean(f.deliveredAt);

  let isRealized = false;
  let realizedRevenue: number | null = null;
  let realizedExpenses: number | null = null;
  let netProfit: number | null = null;
  let profitMargin: number | null = null;
  let revenueKind: MoneySnapshot["labels"]["revenueKind"] = "expected";
  let profitKind: MoneySnapshot["labels"]["profitKind"] = "expected";

  if (isCancelled || isFailed) {
    revenueKind = "none";
    profitKind = operatingExpenses > 0 || returnTotalLoss > 0 ? "loss" : "none";
    realizedRevenue = 0;
    realizedExpenses = operatingExpenses + Math.max(returnTotalLoss, 0);
    netProfit = -realizedExpenses;
    isRealized = true;
  } else if (isReturned || order.status === "returned") {
    revenueKind = "none";
    profitKind = "loss";
    realizedRevenue = money(amountReceived);
    realizedExpenses =
      money(amountReceived) +
      shippingCompanyCost +
      money(f.returnShippingCost) +
      money(f.returnAdditionalExpenses) +
      money(f.productLostCost) +
      money(f.customerRefund) -
      money(f.productRecoverableValue);
    // For returns: loss = costs - recoverable - any money kept
    // Spec scenario 4: no settlement, product cost 280 + ship 100 + return ship 100 + 20 = 500 loss
    // Using: returnTotalLoss as net when no amount received
    if (amountReceived == null || amountReceived === 0) {
      netProfit = -Math.max(
        productCost +
          shippingCompanyCost +
          money(f.returnShippingCost) +
          money(f.returnAdditionalExpenses) +
          money(f.productLostCost) +
          money(f.customerRefund) -
          money(f.productRecoverableValue),
        0
      );
      realizedExpenses = -netProfit;
      realizedRevenue = 0;
    } else {
      netProfit = amountReceived - (
        productCost +
        shippingCompanyCost +
        packagingCost +
        advertisingCost +
        otherExpenses +
        money(f.returnShippingCost) +
        money(f.returnAdditionalExpenses) +
        money(f.productLostCost) +
        money(f.customerRefund) -
        money(f.productRecoverableValue)
      );
      realizedRevenue = amountReceived;
      realizedExpenses = amountReceived - netProfit;
    }
    isRealized = true;
  } else if (isDelivered && settled && amountReceived != null) {
    isRealized = true;
    revenueKind = "realized";
    realizedRevenue = amountReceived;
    realizedExpenses = operatingExpenses;
    netProfit = amountReceived - operatingExpenses;
    profitKind = netProfit < 0 ? "loss" : "realized";
    profitMargin =
      amountReceived === 0 ? null : (netProfit / amountReceived) * 100;
  } else if (NON_REVENUE_STATUSES.has(order.status)) {
    revenueKind = "none";
    profitKind = "none";
  } else {
    revenueKind = "expected";
    profitKind = "expected";
  }

  const expectedExpenses = operatingExpenses;
  const expectedProfit = expectedCollection - expectedExpenses;

  return {
    customerTotal,
    productSubtotal,
    shippingFeeCharged,
    expectedCollection,
    amountCollected,
    amountReceived,
    outstandingSettlement:
      isCancelled || isFailed || (isReturned && !amountReceived)
        ? amountReceived == null
          ? null
          : outstandingSettlement
        : outstandingSettlement,
    totalBusinessExpenses: operatingExpenses,
    totalReturnCosts: Math.max(
      money(f.returnShippingCost) +
        money(f.returnAdditionalExpenses) +
        money(f.productLostCost) +
        money(f.customerRefund),
      0
    ),
    expectedExpenses,
    expectedProfit,
    realizedRevenue,
    realizedExpenses,
    netProfit,
    profitMargin,
    isRealized,
    isLoss: (netProfit ?? 0) < 0 || profitKind === "loss",
    labels: { revenueKind, profitKind },
  };
}

export type DashboardRange =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";

export function rangeBounds(
  range: DashboardRange,
  customFrom?: string,
  customTo?: string,
  now = new Date()
) {
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  if (range === "custom" && customFrom && customTo) {
    return {
      from: startOfDay(new Date(customFrom)),
      to: endOfDay(new Date(customTo)),
    };
  }

  const today = startOfDay(now);
  if (range === "today") return { from: today, to: endOfDay(now) };
  if (range === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: y, to: endOfDay(y) };
  }
  if (range === "this_week") {
    const from = new Date(today);
    const day = from.getDay();
    const diff = day === 0 ? 6 : day - 1;
    from.setDate(from.getDate() - diff);
    return { from, to: endOfDay(now) };
  }
  if (range === "this_month") {
    return {
      from: new Date(today.getFullYear(), today.getMonth(), 1),
      to: endOfDay(now),
    };
  }
  if (range === "last_month") {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    return { from, to };
  }
  return { from: today, to: endOfDay(now) };
}

export type FinanceTotals = {
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  expectedRevenue: number;
  realizedRevenue: number;
  totalProductSales: number;
  shippingFeesCollected: number;
  totalShippingCostsPaid: number;
  totalProductCosts: number;
  totalAdditionalExpenses: number;
  totalReturnCosts: number;
  netProfit: number;
  totalLosses: number;
  outstandingSettlement: number;
  moneyIn: number;
  moneyOut: number;
  netCashFlow: number;
};

export function aggregateFinance(orders: Order[]): FinanceTotals {
  const totals: FinanceTotals = {
    totalOrders: orders.length,
    deliveredOrders: 0,
    returnedOrders: 0,
    cancelledOrders: 0,
    pendingOrders: 0,
    expectedRevenue: 0,
    realizedRevenue: 0,
    totalProductSales: 0,
    shippingFeesCollected: 0,
    totalShippingCostsPaid: 0,
    totalProductCosts: 0,
    totalAdditionalExpenses: 0,
    totalReturnCosts: 0,
    netProfit: 0,
    totalLosses: 0,
    outstandingSettlement: 0,
    moneyIn: 0,
    moneyOut: 0,
    netCashFlow: 0,
  };

  for (const order of orders) {
    const snap = computeOrderMoney(order);
    const pendingLike = new Set<OrderStatus>([
      "pending",
      "received",
      "confirmed",
      "preparing",
    ]);

    if (order.status === "delivered") totals.deliveredOrders += 1;
    if (order.status === "returned") totals.returnedOrders += 1;
    if (order.status === "cancelled") totals.cancelledOrders += 1;
    if (pendingLike.has(order.status)) totals.pendingOrders += 1;

    totals.totalProductSales += snap.productSubtotal;
    totals.shippingFeesCollected += snap.shippingFeeCharged;
    totals.totalShippingCostsPaid += money(order.finance.shippingCompanyCost);
    totals.totalProductCosts += money(order.finance.productCost);
    totals.totalAdditionalExpenses +=
      money(order.finance.packagingCost) +
      money(order.finance.advertisingCost) +
      money(order.finance.otherExpenses);
    totals.totalReturnCosts += snap.totalReturnCosts;

    if (snap.labels.revenueKind === "expected") {
      totals.expectedRevenue += snap.expectedCollection;
    }
    if (snap.isRealized && snap.realizedRevenue != null) {
      totals.realizedRevenue += snap.realizedRevenue;
    }
    if (snap.isRealized && snap.netProfit != null) {
      totals.netProfit += snap.netProfit;
      if (snap.netProfit < 0) totals.totalLosses += Math.abs(snap.netProfit);
    }
    if (
      snap.outstandingSettlement != null &&
      order.finance.settlementStatus !== "received" &&
      !["cancelled", "returned"].includes(order.status)
    ) {
      totals.outstandingSettlement += snap.outstandingSettlement;
    }

    if (order.finance.amountReceived != null) {
      totals.moneyIn += order.finance.amountReceived;
    }
    totals.moneyOut +=
      money(order.finance.shippingCompanyCost) +
      money(order.finance.productCost) +
      money(order.finance.packagingCost) +
      money(order.finance.advertisingCost) +
      money(order.finance.otherExpenses) +
      money(order.finance.returnShippingCost) +
      money(order.finance.returnAdditionalExpenses) +
      money(order.finance.customerRefund);
  }

  totals.netCashFlow = totals.moneyIn - totals.moneyOut;
  return totals;
}

export function formatSignedEgp(value: number) {
  if (value < 0) return `−${formatEgp(Math.abs(value))}`;
  return formatEgp(value);
}

export function inferSettlementStatus(
  expected: number,
  received: number | null
): SettlementStatus {
  if (received == null || received <= 0) return "pending";
  if (received + 0.009 >= expected) return "received";
  return "partially_received";
}

export { REALIZED_STATUSES };
