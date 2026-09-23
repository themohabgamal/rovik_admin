-- Product expenses + configurable USD→EGP rate for true unit cost / profit

alter table public.products
  add column if not exists cost_currency text not null default 'EGP'
    check (cost_currency in ('USD', 'EGP'));

-- Existing products used EGP costs in the admin form before this column existed
update public.products
set cost_currency = 'EGP'
where cost_currency is distinct from 'EGP'
  and cost is not null;

alter table public.site_settings
  add column if not exists usd_egp_rate numeric(12,4) not null default 50.25;

create table if not exists public.product_expenses (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  amount numeric(12,4) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'EGP')),
  -- Units this expense covers (e.g. 100 for a shipment of 100 bars).
  -- Per-unit allocation = amount / quantity.
  quantity numeric(12,4) not null default 1 check (quantity > 0),
  note text,
  occurred_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_expenses_product_id_idx
  on public.product_expenses(product_id);
create index if not exists product_expenses_occurred_at_idx
  on public.product_expenses(occurred_at desc nulls last);

alter table public.product_expenses enable row level security;

-- Ensure site_settings main row exists with a rate
insert into public.site_settings (id, usd_egp_rate, updated_at)
values ('main', 50.25, now())
on conflict (id) do update
  set usd_egp_rate = coalesce(public.site_settings.usd_egp_rate, 50.25);
