-- One row per product with names, live stock and safe-delete info. Read-only, additive.
create view public.product_overview
with (security_invoker = true) as
select
  p.id,
  p.sku,
  p.name,
  p.colour,
  p.size,
  p.category_id,
  c.name as category_name,
  p.supplier_id,
  s.name as supplier_name,
  p.opening_stock,
  p.purchase_rate,
  p.selling_rate,
  p.gst_rate,
  p.is_active,
  p.created_at,
  p.updated_at,
  ps.purchased_qty,
  ps.sold_qty,
  ps.returned_qty,
  ps.current_stock,
  (ps.current_stock * p.purchase_rate)::numeric(14,2) as stock_value,
  (ps.current_stock <= st.low_stock_threshold) as is_low,
  (
    exists (select 1 from public.purchase_items x where x.product_id = p.id)
    or exists (select 1 from public.sale_items x where x.product_id = p.id)
    or exists (select 1 from public.returns x where x.product_id = p.id)
  ) as has_transactions
from public.products p
join public.product_stock ps on ps.product_id = p.id
left join public.categories c on c.id = p.category_id
left join public.suppliers s on s.id = p.supplier_id
cross join public.settings st;

revoke all on public.product_overview from anon;
