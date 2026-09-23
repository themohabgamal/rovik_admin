-- Prior admin form stored product.cost in EGP; default currency was incorrectly USD.

alter table public.products
  alter column cost_currency set default 'EGP';

update public.products
set cost_currency = 'EGP'
where cost_currency = 'USD';
