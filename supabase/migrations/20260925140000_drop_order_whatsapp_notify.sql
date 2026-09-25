-- Stop CallMeBot / new-order WhatsApp notify from this admin project

drop trigger if exists orders_notify_whatsapp on public.orders;
drop function if exists public.notify_new_order_whatsapp();

delete from public.app_secrets
where key in ('order_webhook_url', 'order_webhook_secret');
