-- Stock batches: import (China landed cost) or local (product cost + packaging/ads/etc.)

alter table public.import_orders
  add column if not exists stock_type text not null default 'import'
    check (stock_type in ('import', 'local'));

comment on column public.import_orders.stock_type is
  'import = overseas shipment landed cost; local = local stock with base cost + expenses';
