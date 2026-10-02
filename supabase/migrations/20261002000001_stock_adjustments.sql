-- Editing a product's opening stock now resets its CURRENT stock to the entered number. Stock stays derived
-- (opening + movements), so the reset is recorded as a dated "adjustment" movement of (entered - current)
-- rather than by rewriting opening_stock or any past purchase/bill/return. Every historical document,
-- report total and past balance stays exactly as it was; later sales keep reducing stock normally.

create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  adjustment_date date not null default current_date,
  quantity integer not null check (quantity <> 0),
  new_stock integer not null check (new_stock >= 0),
  created_at timestamptz not null default now()
);
create index stock_adjustments_product_idx on public.stock_adjustments (product_id, adjustment_date);

alter table public.stock_adjustments enable row level security;
revoke all on public.stock_adjustments from anon;
create policy owner_all on public.stock_adjustments for all to authenticated using (public.is_owner()) with check (public.is_owner());
create trigger audit_row after insert or update or delete on public.stock_adjustments for each row execute function public.audit_row();

-- Adjustments join the movement feed (appended branch; existing rows are unchanged). document_id is the
-- product, since an adjustment has no separate document page. product_stock.current_stock sums every
-- movement, so it picks this up with no other change.
create or replace view public.stock_movements
with (security_invoker = true) as
select
  pi.id as source_id, 'purchase'::text as kind, 0 as sort_order, pi.product_id,
  pu.purchase_date as movement_date, pi.quantity as quantity, coalesce(su.name, '') as party,
  pi.rate as rate, pu.id as document_id, pi.created_at
from public.purchase_items pi
join public.purchases pu on pu.id = pi.purchase_id
left join public.suppliers su on su.id = pu.supplier_id
union all
select r.id, 'return', 1, r.product_id, r.return_date, r.quantity, r.reason, 0, r.id, r.created_at
from public.returns r
where r.restock
union all
select si.id, 'sale', 2, si.product_id, sa.sale_date, -si.quantity, sa.customer_name, si.rate, sa.id, si.created_at
from public.sale_items si
join public.sales sa on sa.id = si.sale_id
where si.product_id is not null
union all
select gi.id, 'gst_sale', 2, gi.product_id, gv.invoice_date, -gi.quantity, gv.customer_name, gi.rate, gv.id, gi.created_at
from public.gst_invoice_items gi
join public.gst_invoices gv on gv.id = gi.invoice_id
where gi.product_id is not null and gv.status = 'final'
union all
select a.id, 'adjustment', 3, a.product_id, a.adjustment_date, a.quantity, 'Stock set to ' || a.new_stock, 0, a.product_id, a.created_at
from public.stock_adjustments a;

-- Same-day ordering: an adjustment is placed after everything entered before it that day and before
-- everything entered after it, so the running balance reads "set to N" at the right point. Each movement's
-- sort_order is bumped by 10 per earlier same-day adjustment; with no adjustments it is unchanged, so every
-- existing ledger balance is identical to before.
create or replace view public.stock_ledger
with (security_invoker = true) as
select
  m.source_id, m.kind, o.sort_order, m.product_id, m.movement_date, m.quantity, m.party, m.rate, m.document_id, m.created_at,
  (p.opening_stock + sum(m.quantity) over (
    partition by m.product_id
    order by m.movement_date, o.sort_order, m.created_at, m.source_id
    rows between unbounded preceding and current row
  ))::integer as balance_after
from public.stock_movements m
join public.products p on p.id = m.product_id
cross join lateral (
  select m.sort_order + 10 * (
    select count(*)::integer from public.stock_adjustments a
    where a.product_id = m.product_id and a.adjustment_date = m.movement_date and a.created_at < m.created_at
  ) as sort_order
) o;

create constraint trigger stock_guard after insert or update of product_id, quantity or delete
  on public.stock_adjustments deferrable initially deferred
  for each row execute function public.assert_stock_not_negative();

-- Sets a product's current stock to p_stock by recording the difference as an adjustment. The product row
-- is locked first (the same lock the stock guard takes), so the difference is computed against a stable
-- balance. Returns the change applied (0 = already at that number, nothing recorded).
create or replace function public.set_product_stock(p_product_id uuid, p_stock integer, p_date date default null)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_current integer;
  v_delta integer;
begin
  if p_stock is null or p_stock < 0 then
    raise exception 'INVALID_STOCK';
  end if;
  perform 1 from public.products where id = p_product_id for no key update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  select current_stock into v_current from public.product_stock where product_id = p_product_id;
  v_delta := p_stock - v_current;
  if v_delta <> 0 then
    insert into public.stock_adjustments (product_id, adjustment_date, quantity, new_stock)
    values (p_product_id, coalesce(p_date, current_date), v_delta, p_stock);
  end if;
  return v_delta;
end;
$$;

revoke execute on function public.set_product_stock(uuid, integer, date) from public, anon;
grant execute on function public.set_product_stock(uuid, integer, date) to authenticated;
