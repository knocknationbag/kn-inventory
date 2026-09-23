-- One read-only feed of every bill (Normal + GST) so the Bills list can search, filter, total and
-- paginate across both types in a single query. Normal bills are always final; GST ones may be drafts.
create view public.all_bills
with (security_invoker = true) as
select
  'normal'::text as bill_type, s.id, s.invoice_no as bill_no, s.sale_date as bill_date, s.customer_name,
  s.grand_total, s.amount_paid, s.balance_due, 'final'::text as status, s.created_at
from public.sales s
union all
select
  'gst'::text, g.id, g.invoice_no, g.invoice_date, g.customer_name,
  g.grand_total, g.amount_paid, g.balance_due, g.status, g.created_at
from public.gst_invoices g;

revoke all on public.all_bills from anon;
