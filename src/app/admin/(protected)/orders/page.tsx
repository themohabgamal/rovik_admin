import { createAdminClient } from "@/lib/supabase/admin";
import { enrichOrdersWithImages } from "@/lib/email";
import { mapOrder } from "@/lib/orders";
import { OrdersBoard } from "@/components/admin/orders-board";
import { PageHeader, ErrorState } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  let error = "";
  let orders: NonNullable<ReturnType<typeof mapOrder>>[] = [];

  try {
    const supabase = createAdminClient();
    const { data, error: queryError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (queryError) error = queryError.message;
    else
      orders = await enrichOrdersWithImages(
        (data ?? [])
          .map(mapOrder)
          .filter((row): row is NonNullable<typeof row> => !!row)
      );
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load orders";
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Live list — new orders flash New and play a sound."
      />
      {error ? <ErrorState message={error} /> : <OrdersBoard initial={orders} />}
    </div>
  );
}
