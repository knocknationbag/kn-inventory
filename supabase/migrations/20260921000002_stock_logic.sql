-- Stock is derived, never stored: views over purchase/sale/return lines cannot drift.

create view public.stock_movements
with (security_invoker = true) as
select
  pi.id as source_id,
  'purchase'::text as kind,
  0 as sort_order,
  pi.product_id,
  pu.purchase_date as movement_date,
  pi.quantity as quantity,
  coalesce(su.name, '') as party,
  pi.rate as rate,
  pu.id as document_id,
  pi.created_at
from public.purchase_items pi
join public.purchases pu on pu.id = pi.purchase_id
left join public.suppliers su on su.id = pu.supplier_id
union all
select
  r.id,
  'return',
  1,
  r.product_id,
  r.return_date,
  r.quantity,
  r.reason,
  0,
  r.id,
  r.created_at
from public.returns r
where r.restock
union all
select
  si.id,
  'sale',
  2,
  si.product_id,
  sa.sale_date,
  -si.quantity,
  sa.customer_name,
  si.rate,
  sa.id,
  si.created_at
from public.sale_items si
join public.sales sa on sa.id = si.sale_id
where si.product_id is not null;

create view public.product_stock
with (security_invoker = true) as
select
  p.id as product_id,
  p.opening_stock,
  coalesce(sum(m.quantity) filter (where m.kind = 'purchase'), 0)::integer as purchased_qty,
  coalesce(-sum(m.quantity) filter (where m.kind = 'sale'), 0)::integer as sold_qty,
  coalesce(sum(m.quantity) filter (where m.kind = 'return'), 0)::integer as returned_qty,
  (p.opening_stock + coalesce(sum(m.quantity), 0))::integer as current_stock
from public.products p
left join public.stock_movements m on m.product_id = p.id
group by p.id, p.opening_stock;

-- Running balance is computed over the full history; filter by date on the outside.
create view public.stock_ledger
with (security_invoker = true) as
select
  m.*,
  (p.opening_stock + sum(m.quantity) over (
    partition by m.product_id
    order by m.movement_date, m.sort_order, m.created_at, m.source_id
    rows between unbounded preceding and current row
  ))::integer as balance_after
from public.stock_movements m
join public.products p on p.id = m.product_id;

-- Reject any change that would leave a product below zero. Deferred so a
-- multi-statement save (replace lines) is validated once, at commit.
create or replace function public.assert_stock_not_negative()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pids uuid[] := '{}';
  pid uuid;
  cur integer;
  v_sku text;
begin
  if tg_table_name = 'products' then
    pids := array[new.id];
  else
    if tg_op in ('UPDATE', 'DELETE') then pids := pids || old.product_id; end if;
    if tg_op in ('INSERT', 'UPDATE') then pids := pids || new.product_id; end if;
  end if;

  foreach pid in array pids loop
    continue when pid is null;
    perform 1 from public.products where id = pid for no key update;
    select ps.current_stock, p.sku into cur, v_sku
    from public.product_stock ps
    join public.products p on p.id = ps.product_id
    where ps.product_id = pid;
    if cur is not null and cur < 0 then
      raise exception 'INSUFFICIENT_STOCK: % would go to %', v_sku, cur
        using errcode = '23514';
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger stock_guard after insert or update of product_id, quantity or delete
  on public.purchase_items deferrable initially deferred
  for each row execute function public.assert_stock_not_negative();

create constraint trigger stock_guard after insert or update of product_id, quantity or delete
  on public.sale_items deferrable initially deferred
  for each row execute function public.assert_stock_not_negative();

create constraint trigger stock_guard after insert or update of product_id, quantity, restock or delete
  on public.returns deferrable initially deferred
  for each row execute function public.assert_stock_not_negative();

create constraint trigger stock_guard after update of opening_stock
  on public.products deferrable initially deferred
  for each row execute function public.assert_stock_not_negative();
