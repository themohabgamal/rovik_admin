import type { OrderLine } from "@/lib/orders";
import { orderLineMeta } from "@/lib/orders";

export function OrderLineLabel({ item }: { item: OrderLine }) {
  const meta = orderLineMeta(item);
  return (
    <span className="min-w-0">
      <span>
        {item.quantity}× {item.name}
      </span>
      {meta.length > 0 ? (
        <span className="mt-1 flex flex-wrap gap-1.5">
          {meta.map((value) => (
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
  );
}
