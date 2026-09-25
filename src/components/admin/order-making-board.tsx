"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  confirmShippingFeeReceived,
  markOrderReceived,
} from "@/app/admin/order-actions";
import { useLiveOrders } from "@/components/admin/order-watcher";
import { SubmitButton } from "@/components/admin/submit-button";
import { EmptyState, Card, btnSecondary } from "@/components/admin/ui";
import { STATUS_LABELS } from "@/lib/finance";
import { clearNewOrder } from "@/lib/order-alerts";
import { formatDate, formatEgp, type Order } from "@/lib/orders";
import {
  customerShippingFeeWhatsAppUrl,
  customerWhatsAppChatUrl,
  ETISALAT_CASH_DISPLAY,
  shippingFeeWhatsAppMessage,
} from "@/lib/whatsapp";
import { OrderLineLabel } from "@/components/admin/order-line-label";

type Stage = "needs_receive" | "awaiting_fee" | "done_pipeline";

function stageOf(order: Order): Stage {
  if (order.status === "pending") return "needs_receive";
  if (
    order.status === "received" ||
    (order.status === "confirmed" &&
      order.finance.shippingPaymentStatus === "unpaid")
  ) {
    return "awaiting_fee";
  }
  return "done_pipeline";
}

export function OrderMakingBoard({ initial }: { initial: Order[] }) {
  const { orders, newIds, setNewIds } = useLiveOrders(initial);

  const groups = useMemo(() => {
    const needsReceive: Order[] = [];
    const awaitingFee: Order[] = [];
    for (const order of orders) {
      const stage = stageOf(order);
      if (stage === "needs_receive") needsReceive.push(order);
      else if (stage === "awaiting_fee") awaitingFee.push(order);
    }
    return { needsReceive, awaitingFee };
  }, [orders]);

  if (orders.length === 0) {
    return <EmptyState message="No orders yet." />;
  }

  if (groups.needsReceive.length === 0 && groups.awaitingFee.length === 0) {
    return (
      <EmptyState message="No orders waiting for receive or shipping-fee confirmation." />
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 text-sm font-semibold">1. New orders — mark received</h3>
        <p className="mb-4 text-xs text-muted">
          When a customer places an order, mark it received to start confirmation.
        </p>
        {groups.needsReceive.length === 0 ? (
          <p className="text-sm text-muted">None waiting.</p>
        ) : (
          <div className="space-y-4">
            {groups.needsReceive.map((order) => (
              <OrderMakingCard
                key={order.id}
                order={order}
                isNew={newIds.has(order.id)}
                onSeen={() => {
                  if (!newIds.has(order.id)) return;
                  setNewIds(clearNewOrder(order.id));
                }}
                mode="receive"
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">
          2. Ask for shipping fees · then confirm
        </h3>
        <p className="mb-4 text-xs text-muted">
          Send Arabic WhatsApp asking them to pay the shipping fee via InstaPay
          or Etisalat Cash ({ETISALAT_CASH_DISPLAY}). After you receive payment,
          confirm — that marks the order confirmed and emails the customer.
        </p>
        {groups.awaitingFee.length === 0 ? (
          <p className="text-sm text-muted">None awaiting fees.</p>
        ) : (
          <div className="space-y-4">
            {groups.awaitingFee.map((order) => (
              <OrderMakingCard
                key={order.id}
                order={order}
                isNew={newIds.has(order.id)}
                onSeen={() => {
                  if (!newIds.has(order.id)) return;
                  setNewIds(clearNewOrder(order.id));
                }}
                mode="fee"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OrderMakingCard({
  order,
  isNew,
  onSeen,
  mode,
}: {
  order: Order;
  isNew: boolean;
  onSeen: () => void;
  mode: "receive" | "fee";
}) {
  const [receiveState, receiveAction] = useActionState(markOrderReceived, null);
  const [confirmState, confirmAction] = useActionState(
    confirmShippingFeeReceived,
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const waUrl = customerShippingFeeWhatsAppUrl(order);
  const chatUrl = customerWhatsAppChatUrl(order.phone);
  const message = shippingFeeWhatsAppMessage(order);
  const shipping =
    order.finance.shippingFeeCharged != null &&
    order.finance.shippingFeeCharged > 0
      ? formatEgp(order.finance.shippingFeeCharged)
      : (() => {
          const itemsTotal = order.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          const inferred = order.total - itemsTotal;
          return inferred > 0 ? formatEgp(inferred) : "—";
        })();
  const error = receiveState?.error || confirmState?.error;
  const confirmedOk = confirmState?.ok && confirmState.emailOk !== false;

  return (
    <div onClick={onSeen}>
      <Card className={isNew ? "border-primary ring-2 ring-primary/20" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{order.orderNumber}</p>
          <p className="mt-1 text-xs text-muted">{formatDate(order.createdAt)}</p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs">
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <dd className="font-medium">{order.name || "—"}</dd>
        <dd>{order.phone || "No phone"}</dd>
        <dd className="text-muted">{order.email || "No email"}</dd>
        <dd className="text-muted">
          {[order.address, order.governorate].filter(Boolean).join(", ") || "—"}
        </dd>
        <dd className="pt-1">
          Total {formatEgp(order.total)} · Shipping fee {shipping}
        </dd>
      </dl>

      <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
        {order.items.map((item, i) => (
          <li key={`${item.slug}-${i}`} className="flex justify-between gap-2">
            <OrderLineLabel item={item} />
            <span className="shrink-0 tabular-nums">
              {formatEgp(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {confirmedOk ? (
        <p className="mt-3 text-sm text-primary">
          Confirmed — confirmation email sent to {order.email || "customer"}.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {chatUrl ? (
          <a
            href={chatUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[#25D366] px-4 py-2 text-sm font-medium text-[#128C7E] hover:bg-[#25D366]/10"
          >
            WA chat
          </a>
        ) : null}

        {mode === "receive" ? (
          <form action={receiveAction}>
            <input type="hidden" name="id" value={order.id} />
            <SubmitButton>Mark received</SubmitButton>
          </form>
        ) : null}

        {mode === "fee" ? (
          <>
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Ask shipping fee (WhatsApp)
              </a>
            ) : (
              <span className="rounded-xl border border-border px-4 py-2 text-sm text-muted">
                No valid phone for WhatsApp
              </span>
            )}
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? "Hide message" : "Preview message"}
            </button>
            <form action={confirmAction}>
              <input type="hidden" name="id" value={order.id} />
              <SubmitButton>
                Shipping fees received → Confirm + email
              </SubmitButton>
            </form>
          </>
        ) : null}

        <Link href={`/admin/orders/${order.id}`} className={btnSecondary}>
          Open order
        </Link>
      </div>

      {showPreview ? (
        <pre
          className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-background p-4 text-sm leading-relaxed"
          dir="rtl"
          lang="ar"
        >
          {message}
        </pre>
      ) : null}
      </Card>
    </div>
  );
}
