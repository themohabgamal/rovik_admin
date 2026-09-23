"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeOrderMoney,
  inferSettlementStatus,
  type TransactionType,
} from "@/lib/finance";
import {
  buildTrueCostBySlug,
  estimateOrderProductCost,
} from "@/lib/product-cost";
import {
  mapOrder,
  normalizeStatus,
  type OrderStatus,
  type SettlementStatus,
  type ShippingPaymentStatus,
  type FinancialStatus,
} from "@/lib/orders";

function parseAmount(raw: FormDataEntryValue | null, allowEmpty = false) {
  if (raw == null || String(raw).trim() === "") {
    return allowEmpty ? null : 0;
  }
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) return { error: "Amounts must be valid non-negative numbers" as const };
  return n;
}

async function loadTrueCostSuggestion(
  supabase: ReturnType<typeof createAdminClient>,
  items: { slug: string; quantity: number }[]
) {
  const [{ data: products }, { data: expenses }, { data: settings }] =
    await Promise.all([
      supabase.from("products").select("id, slug, price, cost, cost_currency"),
      supabase.from("product_expenses").select("*"),
      supabase
        .from("site_settings")
        .select("usd_egp_rate")
        .eq("id", "main")
        .maybeSingle(),
    ]);
  if (!products?.length) return null;
  const rate = Number(settings?.usd_egp_rate) || 50.25;
  const costBySlug = buildTrueCostBySlug(products, expenses ?? [], rate);
  const total = estimateOrderProductCost(items, costBySlug);
  return total > 0 ? total : null;
}

async function loadOrder(orderId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error || !data) return { error: error?.message ?? "Order not found" };
  const order = mapOrder(data);
  if (!order) return { error: "Order not found" };
  return { order, supabase, raw: data };
}

async function insertTxn(
  supabase: ReturnType<typeof createAdminClient>,
  input: {
    orderId: string;
    type: TransactionType;
    direction: "income" | "expense";
    amount: number;
    note?: string;
    occurredAt?: string | null;
  }
) {
  if (input.amount <= 0) return;
  await supabase.from("order_transactions").insert({
    order_id: input.orderId,
    type: input.type,
    direction: input.direction,
    amount: input.amount,
    note: input.note ?? null,
    occurred_at: input.occurredAt || new Date().toISOString(),
  });
}

export async function updateOrderStatus(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  const orderId = String(formData.get("id") ?? "");
  const status = normalizeStatus(String(formData.get("status") ?? ""));
  if (!orderId) return { error: "Missing order" };

  const loaded = await loadOrder(orderId);
  if ("error" in loaded && !("order" in loaded)) return { error: loaded.error };

  const { order, supabase } = loaded as Awaited<ReturnType<typeof loadOrder>> & {
    order: NonNullable<ReturnType<typeof mapOrder>>;
    supabase: ReturnType<typeof createAdminClient>;
  };

  const patch: Record<string, unknown> = { status };
  const now = new Date().toISOString();

  if (status === "shipped" || status === "out_for_delivery") {
    if (!order.shippedAt) patch.shipped_at = now;
    if (!order.trackingToken) {
      const { randomUUID } = await import("crypto");
      patch.tracking_token = randomUUID();
    }
  }
  if (status === "delivered") {
    patch.delivered_at = order.finance.deliveredAt || now;
    if (!order.shippedAt) patch.shipped_at = now;
    if (order.finance.productCost == null) {
      const suggested = await loadTrueCostSuggestion(supabase, order.items);
      if (suggested != null) patch.product_cost = suggested;
    }
  }
  if (status === "returned") {
    patch.returned_at = order.finance.returnedAt || now;
    patch.financial_status = "loss";
  }
  if (status === "cancelled") {
    patch.cancelled_at = order.finance.cancelledAt || now;
    patch.financial_status = "cancelled";
  }
  if (status === "confirmed" || status === "pending" || status === "preparing") {
    // keep shipped_at if already set unless explicitly clearing via old flow
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  if (order.trackingToken) revalidatePath(`/track/${order.trackingToken}`);
  return { ok: true };
}

export async function saveOrderFinance(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  const orderId = String(formData.get("id") ?? "");
  if (!orderId) return { error: "Missing order" };

  const loaded = await loadOrder(orderId);
  if ("error" in loaded && !("order" in loaded)) return { error: loaded.error };
  const { order, supabase } = loaded as Awaited<ReturnType<typeof loadOrder>> & {
    order: NonNullable<ReturnType<typeof mapOrder>>;
    supabase: ReturnType<typeof createAdminClient>;
  };

  const fields = [
    "product_subtotal",
    "shipping_fee_charged",
    "shipping_company_cost",
    "product_cost",
    "packaging_cost",
    "advertising_cost",
    "other_expenses",
    "amount_collected",
    "amount_received",
    "return_shipping_cost",
    "product_recoverable_value",
    "product_lost_cost",
    "return_additional_expenses",
    "customer_refund",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of fields) {
    const allowEmpty = [
      "shipping_company_cost",
      "product_cost",
      "amount_collected",
      "amount_received",
      "product_subtotal",
      "shipping_fee_charged",
    ].includes(key);
    const parsed = parseAmount(formData.get(key), allowEmpty);
    if (parsed && typeof parsed === "object" && "error" in parsed) return parsed;
    patch[key] = parsed;
  }

  patch.other_expenses_note =
    String(formData.get("other_expenses_note") ?? "").trim() || null;
  patch.shipping_company =
    String(formData.get("shipping_company") ?? "").trim() || null;
  patch.shipping_tracking_number =
    String(formData.get("shipping_tracking_number") ?? "").trim() || null;
  patch.shipping_paid_at =
    String(formData.get("shipping_paid_at") ?? "").trim() || null;
  patch.settlement_date =
    String(formData.get("settlement_date") ?? "").trim() || null;
  patch.settlement_reference =
    String(formData.get("settlement_reference") ?? "").trim() || null;
  patch.settlement_notes =
    String(formData.get("settlement_notes") ?? "").trim() || null;
  patch.return_reason =
    String(formData.get("return_reason") ?? "").trim() || null;

  const shipPay = String(formData.get("shipping_payment_status") ?? "unpaid");
  patch.shipping_payment_status = (
    ["unpaid", "paid", "waived"].includes(shipPay) ? shipPay : "unpaid"
  ) as ShippingPaymentStatus;

  let settlement = String(formData.get("settlement_status") ?? "").toLowerCase();
  const expected =
    Number(patch.product_subtotal ?? order.finance.productSubtotal ?? 0) +
    Number(patch.shipping_fee_charged ?? order.finance.shippingFeeCharged ?? 0);
  const received = patch.amount_received as number | null;
  if (!settlement) {
    settlement = inferSettlementStatus(expected, received);
  }
  if (
    !["pending", "partially_received", "received", "disputed"].includes(settlement)
  ) {
    settlement = "pending";
  }
  patch.settlement_status = settlement as SettlementStatus;

  const nextOrder = {
    ...order,
    finance: {
      ...order.finance,
      productSubtotal: patch.product_subtotal as number | null,
      shippingFeeCharged: patch.shipping_fee_charged as number | null,
      shippingCompanyCost: patch.shipping_company_cost as number | null,
      productCost: patch.product_cost as number | null,
      packagingCost: Number(patch.packaging_cost ?? 0),
      advertisingCost: Number(patch.advertising_cost ?? 0),
      otherExpenses: Number(patch.other_expenses ?? 0),
      amountCollected: patch.amount_collected as number | null,
      amountReceived: patch.amount_received as number | null,
      settlementStatus: patch.settlement_status as SettlementStatus,
      returnShippingCost: Number(patch.return_shipping_cost ?? 0),
      productRecoverableValue: Number(patch.product_recoverable_value ?? 0),
      productLostCost: Number(patch.product_lost_cost ?? 0),
      returnAdditionalExpenses: Number(patch.return_additional_expenses ?? 0),
      customerRefund: Number(patch.customer_refund ?? 0),
    },
  };
  const snap = computeOrderMoney(nextOrder);
  let financialStatus: FinancialStatus = "expected";
  if (order.status === "cancelled") financialStatus = "cancelled";
  else if (snap.isRealized && snap.isLoss) financialStatus = "loss";
  else if (snap.isRealized) financialStatus = "realized";
  else if (
    patch.product_cost == null ||
    patch.shipping_company_cost == null
  ) {
    financialStatus = "incomplete";
  }
  patch.financial_status = financialStatus;

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) return { error: error.message };

  const prevShip = order.finance.shippingCompanyCost;
  const nextShip = patch.shipping_company_cost as number | null;
  if (
    nextShip != null &&
    nextShip > 0 &&
    nextShip !== prevShip &&
    patch.shipping_payment_status === "paid"
  ) {
    await insertTxn(supabase, {
      orderId,
      type: "shipping_payment",
      direction: "expense",
      amount: nextShip,
      note: "Shipping company cost",
      occurredAt: patch.shipping_paid_at as string | null,
    });
  }

  const prevRecv = order.finance.amountReceived;
  const nextRecv = patch.amount_received as number | null;
  if (nextRecv != null && nextRecv > 0 && nextRecv !== prevRecv) {
    const delta = prevRecv == null ? nextRecv : Math.max(nextRecv - prevRecv, 0);
    if (delta > 0) {
      await insertTxn(supabase, {
        orderId,
        type: "shipping_settlement",
        direction: "income",
        amount: delta,
        note: "Settlement received",
        occurredAt: patch.settlement_date as string | null,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function listOrderTransactions(orderId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("order_transactions")
    .select("*")
    .eq("order_id", orderId)
    .order("occurred_at", { ascending: false });
  if (error) return { error: error.message, rows: [] as Record<string, unknown>[] };
  return { rows: (data ?? []) as Record<string, unknown>[] };
}
