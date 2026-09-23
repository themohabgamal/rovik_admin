-- Rovik order finance + settlement + returns
-- Safe / backward compatible: all new columns nullable with sensible defaults.

alter table public.products
  add column if not exists cost numeric(12,2);

alter table public.orders
  add column if not exists product_subtotal numeric(12,2),
  add column if not exists shipping_fee_charged numeric(12,2),
  add column if not exists shipping_company_cost numeric(12,2),
  add column if not exists product_cost numeric(12,2),
  add column if not exists packaging_cost numeric(12,2) default 0,
  add column if not exists advertising_cost numeric(12,2) default 0,
  add column if not exists other_expenses numeric(12,2) default 0,
  add column if not exists other_expenses_note text,
  add column if not exists amount_collected numeric(12,2),
  add column if not exists amount_received numeric(12,2),
  add column if not exists shipping_company text,
  add column if not exists shipping_tracking_number text,
  add column if not exists shipping_paid_at timestamptz,
  add column if not exists shipping_payment_status text default 'unpaid',
  add column if not exists settlement_status text default 'pending',
  add column if not exists settlement_date timestamptz,
  add column if not exists settlement_reference text,
  add column if not exists settlement_notes text,
  add column if not exists financial_status text default 'expected',
  add column if not exists return_reason text,
  add column if not exists return_shipping_cost numeric(12,2) default 0,
  add column if not exists product_recoverable_value numeric(12,2) default 0,
  add column if not exists product_lost_cost numeric(12,2) default 0,
  add column if not exists return_additional_expenses numeric(12,2) default 0,
  add column if not exists customer_refund numeric(12,2) default 0,
  add column if not exists delivered_at timestamptz,
  add column if not exists returned_at timestamptz,
  add column if not exists cancelled_at timestamptz;

create table if not exists public.order_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  type text not null,
  direction text not null check (direction in ('income', 'expense')),
  amount numeric(12,2) not null check (amount >= 0),
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists order_transactions_order_id_idx
  on public.order_transactions(order_id);
create index if not exists order_transactions_occurred_at_idx
  on public.order_transactions(occurred_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_settlement_status_idx on public.orders(settlement_status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

alter table public.order_transactions enable row level security;
