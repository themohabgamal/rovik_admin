-- New-order WhatsApp notify: mark column + HTTP trigger via pg_net

alter table public.orders
  add column if not exists wa_notified_at timestamptz;

create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);

alter table public.app_secrets enable row level security;

insert into public.app_secrets (key, value)
values
  ('order_webhook_url', 'https://admin.rovik.ltd/api/webhooks/new-order'),
  ('order_webhook_secret', 'rovik_wh_694f2e3d32e030a0cec98521cf4aeacf5224c1773804781b')
on conflict (key) do update
  set value = excluded.value;

create or replace function public.notify_new_order_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  webhook_url text;
  webhook_secret text;
begin
  select value into webhook_url from public.app_secrets where key = 'order_webhook_url';
  select value into webhook_secret from public.app_secrets where key = 'order_webhook_secret';

  if webhook_url is null or webhook_secret is null then
    return NEW;
  end if;

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'order.created',
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'name', NEW.name,
      'phone', NEW.phone,
      'total', NEW.total,
      'status', NEW.status,
      'created_at', NEW.created_at
    )
  );

  return NEW;
end;
$$;

drop trigger if exists orders_notify_whatsapp on public.orders;
create trigger orders_notify_whatsapp
  after insert on public.orders
  for each row
  execute function public.notify_new_order_whatsapp();
