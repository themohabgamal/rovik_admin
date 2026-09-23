"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  eligibilityLabel,
  formatDiscount,
  formatPhoneDisplay,
  mapCoupon,
  mapRedemption,
  usageLabel,
  type Coupon,
  type CouponRedemption,
} from "@/lib/coupons";
import { formatDate, formatEgp } from "@/lib/orders";
import { useToast } from "@/components/admin/toast";
import {
  PageHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  Card,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/ui";

export default function CouponsPage() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const [couponsRes, redemptionsRes, countsRes] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase
        .from("coupon_redemptions")
        .select("*")
        .order("redeemed_at", { ascending: false })
        .limit(100),
      supabase.from("coupon_redemptions").select("coupon_code"),
    ]);
    setLoading(false);

    if (couponsRes.error) {
      setError(couponsRes.error.message);
      return;
    }

    const countByCode = new Map<string, number>();
    for (const row of countsRes.data ?? []) {
      const code = String((row as { coupon_code: string }).coupon_code);
      countByCode.set(code, (countByCode.get(code) ?? 0) + 1);
    }

    setCoupons(
      (couponsRes.data ?? [])
        .map((row) =>
          mapCoupon(
            row,
            countByCode.get(String((row as { code: string }).code)) ?? 0
          )
        )
        .filter((row): row is Coupon => !!row)
    );
    setRedemptions(
      (redemptionsRes.data ?? [])
        .map(mapRedemption)
        .filter((row): row is CouponRedemption => !!row)
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(coupon: Coupon) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("coupons")
      .update({
        is_active: !coupon.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("code", coupon.code);
    if (err) {
      toast(err.message, "error");
      return;
    }
    toast(coupon.isActive ? "Coupon deactivated" : "Coupon activated");
    void load();
  }

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Server-enforced discounts. ROVIK10 is one-time per phone after a delivered order."
        actions={
          <Link href="/admin/coupons/new" className={btnPrimary}>
            New coupon
          </Link>
        }
      />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="space-y-6">
          {coupons.length === 0 ? (
            <EmptyState message="No coupons yet." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Discount</th>
                    <th className="px-4 py-3 font-medium">Eligibility</th>
                    <th className="px-4 py-3 font-medium">Usage</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium">Redemptions</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.code} className="border-b border-border/60">
                      <td className="px-4 py-3 font-semibold">{coupon.code}</td>
                      <td className="px-4 py-3">{formatDiscount(coupon)}</td>
                      <td className="px-4 py-3 text-muted">
                        {eligibilityLabel(coupon)}
                      </td>
                      <td className="px-4 py-3 text-muted">{usageLabel(coupon)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            coupon.isActive
                              ? "bg-primary text-white"
                              : "border border-border"
                          }`}
                        >
                          {coupon.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {coupon.expiresAt
                          ? formatDate(coupon.expiresAt)
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {coupon.redemptionCount ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/coupons/${encodeURIComponent(coupon.code)}`}
                            className={btnSecondary}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="text-xs hover:underline"
                            onClick={() => void toggleActive(coupon)}
                          >
                            {coupon.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Card>
            <h3 className="mb-3 text-sm font-semibold">Redemption history</h3>
            {redemptions.length === 0 ? (
              <p className="text-sm text-muted">No redemptions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted">
                      <th className="pb-2 font-medium">Code</th>
                      <th className="pb-2 font-medium">Phone</th>
                      <th className="pb-2 font-medium">Order #</th>
                      <th className="pb-2 font-medium">Discount</th>
                      <th className="pb-2 font-medium">Redeemed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-2.5 font-medium">{row.couponCode}</td>
                        <td className="py-2.5 tabular-nums">
                          {formatPhoneDisplay(row.phoneNormalized)}
                        </td>
                        <td className="py-2.5 tabular-nums">{row.orderNumber}</td>
                        <td className="py-2.5 tabular-nums">
                          {formatEgp(row.discountAmount)}
                        </td>
                        <td className="py-2.5 text-muted">
                          {formatDate(row.redeemedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
