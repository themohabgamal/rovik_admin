import { createAdminClient } from "@/lib/supabase/admin";
import { enrichOrdersWithImages } from "@/lib/email";
import { mapOrder } from "@/lib/orders";
import { OrderMakingBoard } from "@/components/admin/order-making-board";
import { PageHeader, ErrorState } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function OrderMakingPage() {
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
        title="Order making"
        description="Receive orders → WhatsApp for shipping fees → confirm payment and email the customer."
      />
      {error ? <ErrorState message={error} /> : <OrderMakingBoard initial={orders} />}
    </div>
  );
}
