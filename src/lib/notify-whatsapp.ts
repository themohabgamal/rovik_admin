import { formatEgp, type Order } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";

/** Admin WhatsApp for new-order alerts (Etisalat / CallMeBot). */
export const NEW_ORDER_ALERT_PHONE = "201159028516";

export function newOrderWhatsAppText(order: {
  orderNumber: string;
  name: string;
  phone: string;
  total: number;
  items?: { quantity: number; name: string; color?: string }[];
}) {
  const lines = (order.items ?? [])
    .slice(0, 5)
    .map((item) => {
      const color = item.color ? ` (${item.color})` : "";
      return `• ${item.quantity}× ${item.name}${color}`;
    })
    .join("\n");

  return [
    `🛒 *طلب جديد — Rovik*`,
    ``,
    `رقم الطلب: *${order.orderNumber}*`,
    `العميل: ${order.name || "—"}`,
    `موبايل: ${order.phone || "—"}`,
    `الإجمالي: *${formatEgp(order.total)}*`,
    lines ? `\n${lines}` : "",
    ``,
    `افتح لوحة الطلبات للمتابعة.`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

/** Send WhatsApp via CallMeBot (messages yourself after one-time activation). */
export async function sendWhatsAppAlert(text: string) {
  const apikey = process.env.CALLMEBOT_APIKEY?.trim();
  const phone =
    process.env.CALLMEBOT_PHONE?.replace(/\D/g, "") || NEW_ORDER_ALERT_PHONE;

  if (!apikey) {
    return {
      ok: false as const,
      error: "CALLMEBOT_APIKEY is not set",
    };
  }

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone.startsWith("+") ? phone : `+${phone}`);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apikey);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.text();
  if (!res.ok) {
    return { ok: false as const, error: body.slice(0, 200) || "WhatsApp send failed" };
  }
  // CallMeBot sometimes returns 200 with error text
  if (/error|invalid|apikey/i.test(body) && !/success|queued|sent/i.test(body)) {
    return { ok: false as const, error: body.slice(0, 200) };
  }
  return { ok: true as const };
}

export async function notifyNewOrderWhatsApp(order: Order) {
  const text = newOrderWhatsAppText({
    orderNumber: order.orderNumber,
    name: order.name,
    phone: order.phone,
    total: order.total,
    items: order.items,
  });
  const result = await sendWhatsAppAlert(text);
  if (!result.ok) return result;

  const supabase = createAdminClient();
  await supabase
    .from("orders")
    .update({ wa_notified_at: new Date().toISOString() })
    .eq("id", order.id)
    .is("wa_notified_at", null);

  return result;
}
