-- "Sales by date" must be dated per product line, not per bill. A Normal Bill line can carry its own
-- sale date (sale_items.line_date — e.g. goods taken on the 24th, billed on the 25th); only when that is
-- blank does the line fall back to the bill's sale_date. GST invoice items have no per-line date, so they
-- keep the invoice date. Read-only view change: no bills, items, stock or invoices are touched.
create or replace view public.sold_items_by_date
with (security_invoker = true) as
select
  si.id, 'normal'::text as bill_type, coalesce(si.line_date, sa.sale_date) as sold_on, sa.id as bill_id, sa.invoice_no as bill_no,
  sa.customer_name, cu.phone as customer_mobile,
  si.product_id, p.sku, p.name as product_name, p.colour, p.size,
  coalesce(si.description, '') as description, si.quantity, si.rate, si.line_total, si.created_at
from public.sale_items si
join public.sales sa on sa.id = si.sale_id
left join public.customers cu on cu.id = sa.customer_id
left join public.products p on p.id = si.product_id
union all
select
  gi.id, 'gst'::text, gv.invoice_date, gv.id, gv.invoice_no,
  gv.customer_name, gv.customer_mobile,
  gi.product_id, p.sku, p.name, p.colour, p.size,
  coalesce(gi.product_name, ''), gi.quantity, gi.rate, gi.line_total, gi.created_at
from public.gst_invoice_items gi
join public.gst_invoices gv on gv.id = gi.invoice_id
left join public.products p on p.id = gi.product_id
where gv.status = 'final';

revoke all on public.sold_items_by_date from anon;
