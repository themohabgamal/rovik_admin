-- Align with storefront coupon schema already live in Supabase.
-- Existing: coupons(code PK, percent_off, …), coupon_redemptions(coupon_code, phone_normalized UNIQUE),
-- normalize_egypt_phone, validate_coupon.

-- Optional admin fields (safe if already present)
alter table public.coupons
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists description text;

-- Ensure ROVIK10 exists with correct rules
insert into public.coupons (
  code,
  percent_off,
  is_active,
  expires_at,
  requires_delivered_order,
  max_redemptions_per_phone,
  description
)
values (
  'ROVIK10',
  10,
  true,
  null,
  true,
  1,
  '10% off — one time per phone for customers with a prior delivered order'
)
on conflict (code) do update set
  percent_off = excluded.percent_off,
  requires_delivered_order = true,
  max_redemptions_per_phone = 1,
  description = coalesce(public.coupons.description, excluded.description),
  updated_at = now();

-- Redeem ONLY after order exists. Unique (coupon_code, phone_normalized) is the race guard.
create or replace function public.redeem_coupon(
  p_code text,
  p_phone text,
  p_order_number integer,
  p_discount_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  code_norm text;
  phone_norm text;
  v_order record;
  v_subtotal numeric(12,2);
  v_validation jsonb;
  v_discount numeric(12,2);
  v_redemption_id uuid;
begin
  code_norm := upper(trim(coalesce(p_code, '')));
  phone_norm := public.normalize_egypt_phone(p_phone);

  if p_order_number is null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'missing_order',
      'message', 'Order number is required.'
    );
  end if;

  select
    o.id,
    o.order_number,
    o.phone,
    o.total,
    o.product_subtotal
  into v_order
  from public.orders o
  where o.order_number = p_order_number
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'order_not_found',
      'message', 'Order not found.'
    );
  end if;

  if public.normalize_egypt_phone(v_order.phone) is distinct from phone_norm then
    return jsonb_build_object(
      'ok', false,
      'reason', 'phone_mismatch',
      'message', 'Phone does not match the order.'
    );
  end if;

  v_subtotal := greatest(coalesce(v_order.product_subtotal, v_order.total, 0), 0);
  v_validation := public.validate_coupon(code_norm, p_phone, v_subtotal);

  if coalesce((v_validation->>'valid')::boolean, false) is not true then
    return jsonb_build_object(
      'ok', false,
      'reason', v_validation->>'reason',
      'message', v_validation->>'message'
    );
  end if;

  -- Prefer server-calculated discount; ignore untrusted client amount unless equal
  v_discount := (v_validation->>'discount_amount')::numeric;
  if p_discount_amount is not null and abs(p_discount_amount - v_discount) > 0.05 then
    -- Still use server amount; do not trust browser
    v_discount := (v_validation->>'discount_amount')::numeric;
  end if;

  begin
    insert into public.coupon_redemptions (
      coupon_code,
      phone_normalized,
      order_number,
      discount_amount,
      redeemed_at
    ) values (
      code_norm,
      phone_norm,
      p_order_number,
      v_discount,
      now()
    )
    returning id into v_redemption_id;
  exception
    when unique_violation then
      return jsonb_build_object(
        'ok', false,
        'reason', 'already_used',
        'message', 'This coupon has already been used.'
      );
  end;

  -- Audit columns on order if present
  begin
    update public.orders
    set
      coupon_code = code_norm,
      coupon_discount = v_discount
    where order_number = p_order_number;
  exception
    when undefined_column then
      null;
  end;

  return jsonb_build_object(
    'ok', true,
    'reason', 'ok',
    'redemption_id', v_redemption_id,
    'code', code_norm,
    'discount_amount', v_discount,
    'phone_normalized', phone_norm,
    'order_number', p_order_number
  );
end;
$$;

alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists coupon_discount numeric(12,2);

revoke all on function public.redeem_coupon(text, text, integer, numeric) from public;
grant execute on function public.redeem_coupon(text, text, integer, numeric) to anon, authenticated, service_role;

-- Keep table locked to anon; admin uses service role / pg proxy
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
