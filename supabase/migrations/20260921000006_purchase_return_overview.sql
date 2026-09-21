-- Read-only list views for purchases and returns. Additive; no data or table changes.
create view public.purchase_overview
with (security_invoker = true) as
select
  pu.id,
  pu.purchase_date,
  pu.supplier_id,
  s.name as supplier_name,
  pu.transport_charges,
  pu.notes,
  pu.created_at,
  coalesce(i.item_count, 0)::integer as item_count,
  coalesce(i.total_qty, 0)::integer as total_qty,
  coalesce(i.items_total, 0)::numeric(14,2) as items_total,
  (coalesce(i.items_total, 0) + pu.transport_charges)::numeric(14,2) as grand_total,
  coalesce(i.skus, '') as skus
from public.purchases pu
left join public.suppliers s on s.id = pu.supplier_id
left join lateral (
  select
    count(*) as item_count,
    sum(pi.quantity) as total_qty,
    sum(pi.line_total) as items_total,
    string_agg(p.sku, ' ') as skus
  from public.purchase_items pi
  join public.products p on p.id = pi.product_id
  where pi.purchase_id = pu.id
) i on true;

create view public.return_overview
with (security_invoker = true) as
select
  r.id,
  r.return_date,
  r.product_id,
  p.sku,
  p.name,
  p.colour,
  p.size,
  r.quantity,
  r.reason,
  r.restock,
  r.sale_id,
  r.notes,
  r.created_at
from public.returns r
join public.products p on p.id = r.product_id;

revoke all on public.purchase_overview, public.return_overview from anon;
