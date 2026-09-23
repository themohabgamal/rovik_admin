import { formatEgp } from "@/lib/orders";
import { formatPhoneDisplay } from "@/lib/phone";

export type Coupon = {
  code: string;
  percentOff: number;
  isActive: boolean;
  expiresAt: string | null;
  requiresDeliveredOrder: boolean;
  maxRedemptionsPerPhone: number;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  redemptionCount?: number;
};

export type CouponRedemption = {
  id: string;
  couponCode: string;
  phoneNormalized: string;
  orderNumber: number;
  discountAmount: number;
  redeemedAt: string;
};

export type CouponValidationResult = {
  valid: boolean;
  reason?: string;
  message?: string;
  code?: string;
  percentOff?: number;
  discountAmount?: number;
  subtotal?: number;
};

export function mapCoupon(raw: unknown, redemptionCount?: number): Coupon | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const code = String(row.code ?? "").trim();
  if (!code) return null;
  return {
    code,
    percentOff: Number(row.percent_off) || 0,
    isActive: Boolean(row.is_active),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    requiresDeliveredOrder: row.requires_delivered_order !== false,
    maxRedemptionsPerPhone: Number(row.max_redemptions_per_phone ?? 1) || 1,
    description: row.description ? String(row.description) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    redemptionCount,
  };
}

export function mapRedemption(raw: unknown): CouponRedemption | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? "");
  if (!id) return null;
  return {
    id,
    couponCode: String(row.coupon_code ?? ""),
    phoneNormalized: String(row.phone_normalized ?? ""),
    orderNumber: Number(row.order_number) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    redeemedAt: String(row.redeemed_at ?? ""),
  };
}

export function formatDiscount(coupon: Pick<Coupon, "percentOff">) {
  return `${coupon.percentOff}%`;
}

export function eligibilityLabel(coupon: Coupon) {
  return coupon.requiresDeliveredOrder
    ? "Customers with delivered orders"
    : "Public (anyone)";
}

export function usageLabel(coupon: Coupon) {
  if (coupon.maxRedemptionsPerPhone <= 1) return "One time per phone number";
  return `Up to ${coupon.maxRedemptionsPerPhone}× per phone`;
}

export { formatPhoneDisplay, formatEgp };
