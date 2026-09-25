import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichItemsWithImages } from "@/lib/email";
import { formatDate, formatEgp, mapOrder } from "@/lib/orders";
import {
  buildTrueCostBySlug,
  estimateOrderProductCost,
} from "@/lib/product-cost";
import { STATUS_LABELS } from "@/lib/finance";
import { OrderFinancePanel } from "@/components/admin/order-finance-panel";
import { OrderLineLabel } from "@/components/admin/order-line-label";
import { PageHeader, Card } from "@/components/admin/ui";
import { listOrderTransactions } from "@/app/admin/finance-actions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const order = mapOrder(data);
  if (!order) notFound();

  const items = await enrichItemsWithImages(order.items);
  const { rows: transactions } = await listOrderTransactions(order.id);

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

  const suggestedProductCost =
    products && products.length > 0
      ? estimateOrderProductCost(
          items,
          buildTrueCostBySlug(
            products,
            expenses ?? [],
            Number(settings?.usd_egp_rate) || 50.25
          )
        )
      : null;

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`${STATUS_LABELS[order.status]} · ${formatDate(order.createdAt)}`}
        actions={
          <Link
            href="/admin/orders"
            className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-background"
          >
            Back to orders
          </Link>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Customer</h3>
          <dl className="space-y-1 text-sm">
            <div>
              <dt className="sr-only">Name</dt>
              <dd className="font-medium">{order.name || "—"}</dd>
            </div>
            <div>
              <dt className="sr-only">Email</dt>
              <dd>{order.email || "—"}</dd>
            </div>
            <div>
              <dt className="sr-only">Phone</dt>
              <dd>{order.phone || "—"}</dd>
            </div>
            <div>
              <dt className="sr-only">Address</dt>
              <dd>
                {[order.address, order.governorate].filter(Boolean).join(", ") ||
                  "—"}
              </dd>
            </div>
            {order.notes ? (
              <div className="text-muted">
                <dt className="sr-only">Notes</dt>
                <dd>{order.notes}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Items</h3>
          <ul className="space-y-2 text-sm">
            {items.map((item, i) => (
              <li
                key={`${item.name}-${i}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : null}
                  <span>
                    <OrderLineLabel item={item} />
                  </span>
                </span>
                <span>{formatEgp(item.price * item.quantity)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Order total</span>
              <span>{formatEgp(order.total)}</span>
            </li>
          </ul>
          {order.trackingToken ? (
            <a
              href={`/track/${encodeURIComponent(order.trackingToken)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              Open tracking page
            </a>
          ) : null}
        </Card>
      </div>

      <OrderFinancePanel
        order={{ ...order, items }}
        suggestedProductCost={
          suggestedProductCost != null && suggestedProductCost > 0
            ? suggestedProductCost
            : null
        }
        transactions={transactions.map((row) => ({
          id: String(row.id),
          type: String(row.type),
          direction: String(row.direction),
          amount: Number(row.amount),
          note: row.note ? String(row.note) : null,
          occurred_at: String(row.occurred_at),
        }))}
      />
    </div>
  );
}
