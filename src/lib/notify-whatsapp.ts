import type { Order } from "@/lib/orders";

/** Kept for message preview / future providers — CallMeBot is not used here. */
export function newOrderWhatsAppText(order: {
  orderNumber: string;
  name: string;
  phone: string;
  total: number;
}) {
  return `New Rovik order ${order.orderNumber} — ${order.name} — ${order.phone}`;
}

/** CallMeBot disabled in admin. No outbound WhatsApp send from this app. */
export async function sendWhatsAppAlert(_text: string) {
  return { ok: true as const, skipped: true as const };
}

export async function notifyNewOrderWhatsApp(_order: Order) {
  return { ok: true as const, skipped: true as const };
}
