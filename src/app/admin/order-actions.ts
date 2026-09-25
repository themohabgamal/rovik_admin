"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichOrdersWithImages, sendOrderEmail } from "@/lib/email";
import { mapOrder, type Order } from "@/lib/orders";
import { ADMIN_COOKIE, isValidSessionValue } from "@/lib/auth/session";

export async function markShipped(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  const orderId = String(formData.get("id") ?? "");
  if (!orderId) return { error: "Missing order" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error || !data) return { error: error?.message ?? "Order not found" };

  const order = mapOrder(data);
  if (!order) return { error: "Order not found" };

  const trackingToken = order.trackingToken || randomUUID();
  const shippedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "shipped",
      shipped_at: shippedAt,
      tracking_token: trackingToken,
    })
    .eq("id", orderId);

  if (updateError) return { error: updateError.message };

  const email = await sendOrderEmail(
    { ...order, trackingToken, status: "shipped", shippedAt },
    "shipped"
  );

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/track/${trackingToken}`);

  if (!email.ok) {
    return {
      ok: true,
      error: `Shipped, but the customer email failed: ${email.error}`,
    };
  }
  return { ok: true };
}

export async function markOrderReceived(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  const orderId = String(formData.get("id") ?? "");
  if (!orderId) return { error: "Missing order" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "received" })
    .eq("id", orderId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/order-making");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

/**
 * Admin confirmed delivery/shipping fees were paid → order confirmed + email.
 */
export async function confirmShippingFeeReceived(
  _prev: { error?: string; ok?: boolean; emailOk?: boolean } | null,
  formData: FormData
) {
  const orderId = String(formData.get("id") ?? "");
  if (!orderId) return { error: "Missing order" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error || !data) return { error: error?.message ?? "Order not found" };

  const order = mapOrder(data);
  if (!order) return { error: "Order not found" };

  const trackingToken = order.trackingToken || randomUUID();
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "confirmed",
      shipping_payment_status: "paid",
      shipping_paid_at: order.finance.shippingPaidAt || new Date().toISOString(),
      tracking_token: trackingToken,
    })
    .eq("id", orderId);
  if (updateError) return { error: updateError.message };

  const email = await sendOrderEmail(
    { ...order, trackingToken, status: "confirmed" },
    "confirmed"
  );

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/order-making");
  revalidatePath(`/admin/orders/${orderId}`);
  if (trackingToken) revalidatePath(`/track/${trackingToken}`);

  if (!email.ok) {
    return {
      ok: true,
      emailOk: false,
      error: `Order confirmed, but email failed: ${email.error}`,
    };
  }
  return { ok: true, emailOk: true };
}

export async function markConfirmed(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  const orderId = String(formData.get("id") ?? "");
  if (!orderId) return { error: "Missing order" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "confirmed", shipped_at: null })
    .eq("id", orderId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/order-making");
  return { ok: true };
}

export async function listOrders() {
  const store = await cookies();
  if (!isValidSessionValue(store.get(ADMIN_COOKIE)?.value)) {
    return { error: "Unauthorized", orders: [] as Order[] };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message, orders: [] as Order[] };
  const orders = (data ?? []).map(mapOrder).filter((row): row is Order => !!row);
  return { orders: await enrichOrdersWithImages(orders) };
}

export async function sendOrderShippedEmail(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  const orderId = String(formData.get("id") ?? "");
  if (!orderId) return { error: "Missing order" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error || !data) return { error: error?.message ?? "Order not found" };

  const order = mapOrder(data);
  if (!order) return { error: "Order not found" };
  if (!order.trackingToken) return { error: "Order has no tracking link yet" };

  const email = await sendOrderEmail(order, "shipped");
  if (!email.ok) return { error: email.error };
  return { ok: true };
}

export async function sendOrderConfirmedEmail(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  const orderId = String(formData.get("id") ?? "");
  if (!orderId) return { error: "Missing order" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error || !data) return { error: error?.message ?? "Order not found" };

  const order = mapOrder(data);
  if (!order) return { error: "Order not found" };

  let trackingToken = order.trackingToken;
  if (!trackingToken) {
    trackingToken = randomUUID();
    const { error: updateError } = await supabase
      .from("orders")
      .update({ tracking_token: trackingToken })
      .eq("id", orderId);
    if (updateError) return { error: updateError.message };
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
  }

  const email = await sendOrderEmail(
    { ...order, trackingToken },
    "confirmed"
  );
  if (!email.ok) return { error: email.error };
  return { ok: true };
}

/** Backup path when admin tab detects new orders (also covered by DB webhook). */
export async function notifyNewOrdersWhatsApp(orderIds: string[]) {
  const store = await cookies();
  if (!isValidSessionValue(store.get(ADMIN_COOKIE)?.value)) {
    return { error: "Unauthorized", notified: 0 };
  }
  if (!orderIds.length) return { notified: 0 };

  const { notifyNewOrderWhatsApp } = await import("@/lib/notify-whatsapp");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .in("id", orderIds)
    .is("wa_notified_at", null);
  if (error) return { error: error.message, notified: 0 };

  let notified = 0;
  for (const row of data ?? []) {
    const order = mapOrder(row);
    if (!order) continue;
    const result = await notifyNewOrderWhatsApp(order);
    if (result.ok) notified += 1;
  }
  return { notified };
}
