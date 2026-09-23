# Rovik Admin

Password-gated dashboard for the Rovik storefront.

## Tabs

Dashboard, Orders, Coupons, Import costs, Categories, Products, Waitlist, Settings.

- Order financials: `/admin/orders/[id]`
- Coupons: `/admin/coupons`
- Import cost calculator: `/admin/import-orders`
- Tracking: `/track/[tracking_token]`
- `/admin` is `noindex`

## Coupons (ROVIK10)

Reuses the storefront tables/RPCs already in Supabase:

- `coupons` — `code` PK, `percent_off`, `requires_delivered_order`, `max_redemptions_per_phone`
- `coupon_redemptions` — unique `(coupon_code, phone_normalized)` (DB race protection)
- `normalize_egypt_phone` → `+20XXXXXXXXXX`
- `validate_coupon(code, phone, subtotal)` — eligibility + server discount
- `redeem_coupon(code, phone, order_number)` — call only after order insert

Storefront checkout must call these RPCs; never trust browser discount amounts.

Migration: `supabase/migrations/20260909120000_coupons.sql`

## Finance migration

`supabase/migrations/20260829120000_order_finance.sql`
