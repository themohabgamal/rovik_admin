-- Import order cost calculator (landed cost, no selling price)

create table if not exists public.import_orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supplier_name text,
  order_date date,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  exchange_rate numeric(12,4) not null default 50.25,
  international_shipping_usd numeric(12,2) not null default 0,
  products jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_orders_status_idx on public.import_orders(status);
create index if not exists import_orders_order_date_idx on public.import_orders(order_date desc nulls last);
create index if not exists import_orders_created_at_idx on public.import_orders(created_at desc);

alter table public.import_orders enable row level security;
