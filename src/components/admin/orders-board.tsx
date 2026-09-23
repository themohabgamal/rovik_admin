"use client";

import { OrderCard } from "@/components/admin/order-card";
import { useLiveOrders } from "@/components/admin/order-watcher";
import { EmptyState } from "@/components/admin/ui";
import { clearNewOrder } from "@/lib/order-alerts";
import type { Order } from "@/lib/orders";

export function OrdersBoard({ initial }: { initial: Order[] }) {
  const { orders, newIds, setNewIds } = useLiveOrders(initial);

  if (orders.length === 0) {
    return <EmptyState message="No orders yet." />;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          onClick={() => {
            if (!newIds.has(order.id)) return;
            setNewIds(clearNewOrder(order.id));
          }}
        >
          <OrderCard order={order} isNew={newIds.has(order.id)} />
        </div>
      ))}
    </div>
  );
}
