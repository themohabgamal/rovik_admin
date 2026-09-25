import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichItemsWithImages } from "@/lib/email";
import { STATUS_LABELS } from "@/lib/finance";
import { formatDate, formatEgp, mapOrder, orderLineMeta, type OrderStatus } from "@/lib/orders";

export const dynamic = "force-dynamic";

function stage(status: OrderStatus) {
  const shipped = new Set<OrderStatus>([
    "shipped",
    "out_for_delivery",
    "delivered",
    "return_requested",
    "returning",
    "returned",
  ]);
  const delivered = new Set<OrderStatus>(["delivered"]);
  const failed = new Set<OrderStatus>([
    "delivery_failed",
    "cancelled",
    "returned",
  ]);
  return {
    shipped: shipped.has(status),
    delivered: delivered.has(status),
    failed: failed.has(status),
  };
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("tracking_token", token)
    .maybeSingle();

  if (error || !data) notFound();
  const order = mapOrder(data);
  if (!order) notFound();

  const flags = stage(order.status);
  const items = await enrichItemsWithImages(order.items);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-4 py-12">
        <img
          src="/rovik-logo.png"
          alt="Rovik"
          width={40}
          height={40}
          className="h-10 w-10"
        />
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-primary">Rovik</p>
        <h1 className="mt-2 text-2xl font-semibold">Track order</h1>
        <p className="mt-1 text-sm text-muted">{order.orderNumber}</p>
        <p className="mt-1 text-xs text-muted">Status: {STATUS_LABELS[order.status]}</p>

        <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <ol className="relative space-y-8 before:absolute before:left-[6px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
            <TimelineStep
              title="Order confirmed"
              done
              detail={formatDate(order.createdAt)}
            />
            <TimelineStep
              title="Shipped"
              done={flags.shipped}
              detail={
                flags.shipped && order.shippedAt
                  ? formatDate(order.shippedAt)
                  : "Waiting to ship"
              }
            />
            <TimelineStep
              title="Delivered"
              done={flags.delivered}
              detail={
                flags.failed
                  ? STATUS_LABELS[order.status]
                  : flags.delivered && order.finance.deliveredAt
                    ? formatDate(order.finance.deliveredAt)
                    : "In progress"
              }
            />
          </ol>
        </section>

        {items.length > 0 ? (
          <ul className="mt-6 space-y-3 rounded-xl border border-border bg-card p-5 text-sm">
            {items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <span>
                    {item.quantity}× {item.name}
                    {orderLineMeta(item).length > 0 ? (
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {orderLineMeta(item).map((value) => (
                          <span
                            key={value}
                            className="inline-flex rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted"
                          >
                            {value}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0">{formatEgp(item.price * item.quantity)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span>{formatEgp(order.total)}</span>
            </li>
          </ul>
        ) : null}
      </main>
    </div>
  );
}

function TimelineStep({
  title,
  done,
  detail,
}: {
  title: string;
  done: boolean;
  detail: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full ${
          done ? "bg-primary" : "border-2 border-border bg-card"
        }`}
      />
      <div>
        <p className={`text-sm font-medium ${done ? "" : "text-muted"}`}>
          {title}
        </p>
        <p className="text-xs text-muted">{detail}</p>
      </div>
    </li>
  );
}
