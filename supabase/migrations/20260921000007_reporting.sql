-- Reporting layer: read-only views and one function. Additive; no data or table changes.

create view public.sale_item_details
with (security_invoker = true) as
select
  si.id,
  si.sale_id,
  si.product_id,
  si.description,
  si.quantity,
  si.rate,
  si.line_total,
  sa.sale_date,
  sa.invoice_no,
  sa.customer_name,
  p.sku,
  p.name as product_name,
  p.colour,
  p.size
from public.sale_items si
join public.sales sa on sa.id = si.sale_id
left join public.products p on p.id = si.product_id;

create view public.purchase_item_details
with (security_invoker = true) as
select
  pi.id,
  pi.purchase_id,
  pi.product_id,
  pi.quantity,
  pi.rate,
  pi.line_total,
  pu.purchase_date,
  pu.supplier_id,
  s.name as supplier_name,
  p.sku,
  p.name as product_name,
  p.colour,
  p.size
from public.purchase_items pi
join public.purchases pu on pu.id = pi.purchase_id
left join public.suppliers s on s.id = pu.supplier_id
join public.products p on p.id = pi.product_id;

create view public.sales_daily
with (security_invoker = true) as
select
  sale_date,
  count(*)::integer as bills,
  sum(subtotal)::numeric(14,2) as subtotal,
  sum(discount_amount)::numeric(14,2) as discount,
  sum(gst_amount)::numeric(14,2) as gst,
  sum(grand_total)::numeric(14,2) as grand_total,
  sum(amount_paid)::numeric(14,2) as paid,
  sum(balance_due)::numeric(14,2) as balance_due
from public.sales
group by sale_date;

create view public.purchases_daily
with (security_invoker = true) as
select
  purchase_date,
  count(*)::integer as purchases,
  sum(total_qty)::integer as units,
  sum(items_total)::numeric(14,2) as items_total,
  sum(transport_charges)::numeric(14,2) as transport,
  sum(grand_total)::numeric(14,2) as grand_total
from public.purchase_overview
group by purchase_date;

create view public.stock_ledger_details
with (security_invoker = true) as
select l.*, p.sku, p.name, p.colour, p.size
from public.stock_ledger l
join public.products p on p.id = l.product_id;

create view public.stock_daily
with (security_invoker = true) as
select
  movement_date,
  product_id,
  coalesce(sum(quantity) filter (where kind = 'purchase'), 0)::integer as stock_in,
  coalesce(-sum(quantity) filter (where kind = 'sale'), 0)::integer as stock_out,
  coalesce(sum(quantity) filter (where kind = 'return'), 0)::integer as returned
from public.stock_movements
group by movement_date, product_id;

-- Opening and closing balance per product for any period (null = unbounded).
create or replace function public.stock_summary(p_from date default null, p_to date default null)
returns table (
  product_id uuid,
  sku text,
  name text,
  colour text,
  size text,
  is_active boolean,
  opening_balance integer,
  stock_in integer,
  returned integer,
  stock_out integer,
  closing_balance integer
)
language sql
stable
set search_path = public
as $$
  select
    p.id,
    p.sku,
    p.name,
    p.colour,
    p.size,
    p.is_active,
    (p.opening_stock + coalesce(sum(m.quantity) filter (where p_from is not null and m.movement_date < p_from), 0))::integer,
    coalesce(sum(m.quantity) filter (where m.kind = 'purchase' and (p_from is null or m.movement_date >= p_from) and (p_to is null or m.movement_date <= p_to)), 0)::integer,
    coalesce(sum(m.quantity) filter (where m.kind = 'return' and (p_from is null or m.movement_date >= p_from) and (p_to is null or m.movement_date <= p_to)), 0)::integer,
    coalesce(-sum(m.quantity) filter (where m.kind = 'sale' and (p_from is null or m.movement_date >= p_from) and (p_to is null or m.movement_date <= p_to)), 0)::integer,
    (p.opening_stock + coalesce(sum(m.quantity) filter (where p_to is null or m.movement_date <= p_to), 0))::integer
  from public.products p
  left join public.stock_movements m on m.product_id = p.id
  group by p.id, p.sku, p.name, p.colour, p.size, p.is_active, p.opening_stock;
$$;

revoke all on public.sale_item_details, public.purchase_item_details, public.sales_daily, public.purchases_daily,
  public.stock_ledger_details, public.stock_daily from anon;
revoke execute on function public.stock_summary(date, date) from public, anon;
grant execute on function public.stock_summary(date, date) to authenticated;
