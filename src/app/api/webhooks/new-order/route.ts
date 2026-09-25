import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.ORDER_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const alt = request.headers.get("x-webhook-secret")?.trim() || "";
  return bearer === expected || alt === expected;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = String(body.order_id ?? body.id ?? "");
  if (!orderId) {
    return Response.json({ error: "Missing order_id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, wa_notified_at")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Order not found" },
      { status: 404 }
    );
  }

  // Outbound WhatsApp (CallMeBot) removed from admin — front app owns alerts.
  return Response.json({ ok: true, skipped: true, reason: "whatsapp_disabled" });
}
