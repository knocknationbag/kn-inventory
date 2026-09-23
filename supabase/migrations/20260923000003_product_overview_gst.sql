-- product_overview learns about GST invoices: has_transactions now also counts GST invoice lines (so a
-- product used only on a GST invoice is not offered for deletion) and hsn_code is exposed for the
-- invoice form. hsn_code is appended last because CREATE OR REPLACE VIEW cannot reorder columns.
create or replace view public.product_overview
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
    or exists (select 1 from public.gst_invoice_items x where x.product_id = p.id)
    or exists (select 1 from public.returns x where x.product_id = p.id)
  ) as has_transactions,
  p.hsn_code
from public.products p
join public.product_stock ps on ps.product_id = p.id
left join public.categories c on c.id = p.category_id
left join public.suppliers s on s.id = p.supplier_id
cross join public.settings st;
