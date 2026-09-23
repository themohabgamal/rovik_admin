import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapOrder } from "@/lib/orders";
import { buildTrueCostBySlug } from "@/lib/product-cost";
import { FinanceOverview } from "@/components/admin/finance-overview";
import { ProfitOverview } from "@/components/admin/profit-overview";
import { Card, PageHeader, btnPrimary, btnSecondary } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    ordersRes,
    productsRes,
    expensesRes,
    settingsRes,
  ] = await Promise.all([
    admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    admin.from("products").select("id, slug, price, cost, cost_currency"),
    admin.from("product_expenses").select("*"),
    admin
      .from("site_settings")
      .select("usd_egp_rate")
      .eq("id", "main")
      .maybeSingle(),
  ]);

  const orderRows = ordersRes.data;
  const products = productsRes.error ? null : productsRes.data;
  const expenses = expensesRes.error ? [] : expensesRes.data ?? [];
  const usdEgpRate = Number(settingsRes.data?.usd_egp_rate) || 50.25;
  const trueCostMap = products
    ? buildTrueCostBySlug(products, expenses, usdEgpRate)
    : new Map<string, number>();

  const orders = (orderRows ?? [])
    .map(mapOrder)
    .filter((row): row is NonNullable<typeof row> => !!row);

  const { data: recentWaitlist } = await supabase
    .from("waitlist")
    .select("id, email, source, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="How much you sold, what it cost, and what you actually made."
        actions={
          <>
            <Link href="/admin/orders" className={btnPrimary}>
              View orders
            </Link>
            <Link href="/admin/products" className={btnSecondary}>
              Products
            </Link>
          </>
        }
      />

      <ProfitOverview
        orders={orders}
        trueCostBySlug={Object.fromEntries(trueCostMap)}
      />

      <details className="mb-8">
        <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
          Detailed cash flow (optional)
        </summary>
        <div className="mt-4">
          <FinanceOverview orders={orders} />
        </div>
      </details>

      <Card>
        <h3 className="mb-4 text-sm font-semibold">Recent waitlist signups</h3>
        {!recentWaitlist?.length ? (
          <p className="text-sm text-muted">No signups yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentWaitlist.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2.5">{row.email}</td>
                    <td className="py-2.5 text-muted">{row.source ?? "—"}</td>
                    <td className="py-2.5 text-muted">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
