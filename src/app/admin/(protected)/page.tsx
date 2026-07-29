import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, btnPrimary, btnSecondary } from "@/components/admin/ui";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: activeProducts },
    { count: categoriesCount },
    { count: waitlistCount },
    { data: recentWaitlist },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase
      .from("waitlist")
      .select("id, email, source, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const stats = [
    { label: "Active products", value: activeProducts ?? 0 },
    { label: "Categories", value: categoriesCount ?? 0 },
    { label: "Waitlist emails", value: waitlistCount ?? 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your Rovik storefront."
        actions={
          <>
            <Link href="/admin/products/new" className={btnPrimary}>
              Add product
            </Link>
            <Link href="/admin/waitlist" className={btnSecondary}>
              View waitlist
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

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
