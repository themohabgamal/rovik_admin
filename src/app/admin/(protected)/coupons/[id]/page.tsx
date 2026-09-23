"use client";

import { use } from "react";
import { CouponForm } from "@/components/admin/coupon-form";

export default function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CouponForm couponCode={decodeURIComponent(id)} />;
}
