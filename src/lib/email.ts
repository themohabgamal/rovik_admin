import type { Order, OrderLine } from "@/lib/orders";
import { formatEgp } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";

export function siteUrl() {
  const track = process.env.NEXT_PUBLIC_TRACK_URL?.replace(/\/$/, "");
  if (track && !track.includes("localhost")) return track;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit && !explicit.includes("localhost")) return explicit;
  return "https://admin.rovik.ltd";
}

export function trackingUrl(token: string) {
  return `${siteUrl()}/track/${encodeURIComponent(token)}`;
}

function fromAddress() {
  const configured = process.env.EMAIL_FROM || "";
  return configured.includes("rovik.ltd")
    ? configured
    : "Rovik <orders@rovik.ltd>";
}

function publicImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function enrichItemsWithImages(items: OrderLine[]) {
  const slugs = [...new Set(items.map((item) => item.slug).filter(Boolean))];
  if (slugs.length === 0) {
    return items.map((item) => ({
      ...item,
      image: item.image ? publicImageUrl(item.image) : "",
    }));
  }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("slug, image_url")
    .in("slug", slugs);
  const bySlug = new Map(
    (data ?? []).map((row) => [String(row.slug), String(row.image_url || "")])
  );
  return items.map((item) => ({
    ...item,
    image: publicImageUrl(item.image || bySlug.get(item.slug) || ""),
  }));
}

export async function enrichOrdersWithImages(orders: Order[]) {
  const slugs = [
    ...new Set(
      orders.flatMap((order) => order.items.map((item) => item.slug).filter(Boolean))
    ),
  ];
  if (slugs.length === 0) return orders;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("slug, image_url")
    .in("slug", slugs);
  const bySlug = new Map(
    (data ?? []).map((row) => [String(row.slug), String(row.image_url || "")])
  );
  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({
      ...item,
      image: publicImageUrl(item.image || bySlug.get(item.slug) || ""),
    })),
  }));
}

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function itemRows(items: OrderLine[]) {
  if (items.length === 0) return "";
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px">
      ${items
        .map((item) => {
          const img = item.image
            ? `<img src="${esc(item.image)}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid #eee"/>`
            : `<div style="width:64px;height:64px;border-radius:10px;background:#f3f3f3"></div>`;
          return `
            <tr>
              <td style="padding:8px 12px 8px 0;width:64px;vertical-align:top">${img}</td>
              <td style="padding:8px 0;font-size:14px;color:#111;vertical-align:top">
                ${item.quantity}× ${esc(item.name)}
              </td>
              <td style="padding:8px 0 8px 12px;font-size:14px;color:#111;text-align:right;white-space:nowrap;vertical-align:top">
                ${formatEgp(item.price * item.quantity)}
              </td>
            </tr>
          `;
        })
        .join("")}
    </table>
  `;
}

function wrapEmail(title: string, body: string) {
  return `
    <div style="font-family:Inter,system-ui,sans-serif;color:#111;background:#fff;padding:32px">
      <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:16px;padding:28px">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#ff6a00">Rovik</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#000">${title}</h1>
        ${body}
      </div>
    </div>
  `;
}

async function sendResend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set" };
  if (!input.to) return { ok: false, error: "Order has no email" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body.slice(0, 280) || "Email failed" };
  }
  return { ok: true };
}

export async function sendOrderEmail(
  order: Order,
  kind: "confirmed" | "shipped"
) {
  const items = await enrichItemsWithImages(order.items);
  const url = order.trackingToken ? trackingUrl(order.trackingToken) : "";
  const trackButton = url
    ? `<a href="${url}" style="display:inline-block;background:#ff6a00;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600">Track order</a>
       <p style="margin:16px 0 0;font-size:12px;color:#888">${url}</p>`
    : "";

  if (kind === "confirmed") {
    return sendResend({
      to: order.email,
      subject: `We received your Rovik order ${order.orderNumber}`,
      html: wrapEmail(
        "Order confirmed",
        `<p style="margin:0 0 16px;color:#444">Thanks — we received order <strong>${esc(order.orderNumber)}</strong>.</p>
         ${itemRows(items)}
         <p style="margin:0 0 20px;font-weight:600">Total ${formatEgp(order.total)}</p>
         ${trackButton}`
      ),
      text: `We received your Rovik order ${order.orderNumber}.\nTotal ${formatEgp(order.total)}\n${url ? `\nTrack: ${url}` : ""}`,
    });
  }

  return sendResend({
    to: order.email,
    subject: `Your Rovik order ${order.orderNumber} is now shipped`,
    html: wrapEmail(
      "Your order is now shipped",
      `<p style="margin:0 0 16px;color:#444">Good news — order <strong>${esc(order.orderNumber)}</strong> is on its way.</p>
       ${itemRows(items)}
       <p style="margin:0 0 20px;font-weight:600">Total ${formatEgp(order.total)}</p>
       ${trackButton}`
    ),
    text: `Your Rovik order ${order.orderNumber} is now shipped.\nTotal ${formatEgp(order.total)}\n${url ? `\nTrack: ${url}` : ""}`,
  });
}
