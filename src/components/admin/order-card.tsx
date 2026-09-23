"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  markConfirmed,
  markShipped,
  sendOrderConfirmedEmail,
  sendOrderShippedEmail,
} from "@/app/admin/order-actions";
import { computeOrderMoney, formatSignedEgp, STATUS_LABELS } from "@/lib/finance";
import { formatDate, formatEgp, type Order } from "@/lib/orders";
import { SubmitButton } from "@/components/admin/submit-button";

function statusClass(status: Order["status"]) {
  if (status === "delivered") return "bg-primary text-white";
  if (status === "shipped" || status === "out_for_delivery") {
    return "bg-black text-white";
  }
  if (status === "returned" || status === "cancelled" || status === "delivery_failed") {
    return "border border-black text-black";
  }
  return "border border-border text-black";
}

export function OrderCard({
  order,
  isNew = false,
}: {
  order: Order;
  isNew?: boolean;
}) {
  const [shipState, shipAction] = useActionState(markShipped, null);
  const [confirmState, confirmAction] = useActionState(markConfirmed, null);
  const [emailState, emailAction] = useActionState(sendOrderShippedEmail, null);
  const [confirmEmailState, confirmEmailAction] = useActionState(
    sendOrderConfirmedEmail,
    null
  );
  const error =
    shipState?.error ||
    confirmState?.error ||
    emailState?.error ||
    confirmEmailState?.error;
  const shippedMail = emailState?.ok || (shipState?.ok && !shipState?.error);
  const confirmedMail = confirmEmailState?.ok;
  const money = computeOrderMoney(order);
  const canShip =
    order.status === "pending" ||
    order.status === "confirmed" ||
    order.status === "preparing";
  const canConfirm =
    order.status === "shipped" ||
    order.status === "out_for_delivery" ||
    order.status === "delivered";

  return (
    <article
      className={`rounded-xl border bg-card p-5 shadow-sm ${
        isNew ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{order.orderNumber}</p>
          <p className="mt-1 text-xs text-muted">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {isNew ? (
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
              New
            </span>
          ) : null}
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(order.status)}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      <dl className="mt-4 space-y-1 text-sm">
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
            {[order.address, order.governorate].filter(Boolean).join(", ") || "—"}
          </dd>
        </div>
        {order.notes ? (
          <div className="text-muted">
            <dt className="sr-only">Notes</dt>
            <dd>{order.notes}</dd>
          </div>
        ) : null}
      </dl>

      <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
        {order.items.length === 0 ? (
          <li className="text-muted">No line items</li>
        ) : (
          order.items.map((item, i) => (
            <li key={`${item.name}-${i}`} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <span>
                  {item.quantity}× {item.name}
                </span>
              </span>
              <span className="shrink-0">{formatEgp(item.price * item.quantity)}</span>
            </li>
          ))
        )}
        <li className="flex justify-between gap-3 pt-2 font-semibold">
          <span>Total</span>
          <span>{formatEgp(order.total)}</span>
        </li>
        <li className="flex justify-between gap-3 text-xs text-muted">
          <span>
            Shipping charged {formatEgp(money.shippingFeeCharged)} · Products{" "}
            {formatEgp(money.productSubtotal)}
          </span>
        </li>
        {money.isRealized && money.netProfit != null ? (
          <li className="flex justify-between gap-3 text-xs">
            <span>Realized profit</span>
            <span className="font-medium tabular-nums">
              {formatSignedEgp(money.netProfit)}
            </span>
          </li>
        ) : null}
      </ul>

      {confirmedMail ? (
        <p className="mt-3 text-sm text-primary">
          Confirmation email sent to {order.email}.
        </p>
      ) : null}
      {shippedMail ? (
        <p className="mt-3 text-sm text-primary">Shipped email sent to {order.email}.</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/admin/orders/${order.id}`}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Financials
        </Link>
        {canShip ? (
          <>
            <form action={shipAction}>
              <input type="hidden" name="id" value={order.id} />
              <SubmitButton>Mark shipped</SubmitButton>
            </form>
            {order.email ? (
              <form action={confirmEmailAction}>
                <input type="hidden" name="id" value={order.id} />
                <SubmitButton variant="secondary">Send confirmation email</SubmitButton>
              </form>
            ) : null}
          </>
        ) : null}
        {canConfirm ? (
          <>
            <form action={confirmAction}>
              <input type="hidden" name="id" value={order.id} />
              <SubmitButton variant="secondary">Mark confirmed</SubmitButton>
            </form>
            {order.trackingToken && order.email ? (
              <form action={emailAction}>
                <input type="hidden" name="id" value={order.id} />
                <SubmitButton variant="secondary">Send shipped email</SubmitButton>
              </form>
            ) : null}
          </>
        ) : null}
        {order.trackingToken ? (
          <a
            href={`/track/${encodeURIComponent(order.trackingToken)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-background"
          >
            View tracking
          </a>
        ) : null}
      </div>
    </article>
  );
}
