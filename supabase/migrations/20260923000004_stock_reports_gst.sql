-- Stock reports count finalized GST invoice lines ('gst_sale') as stock out, exactly like Normal bill lines
-- ('sale'). Without this, opening + in + returns - out would not equal closing once a GST invoice exists.
create or replace view public.stock_daily
with (security_invoker = true) as
select
  movement_date,
  product_id,
  coalesce(sum(quantity) filter (where kind = 'purchase'), 0)::integer as stock_in,
  coalesce(-sum(quantity) filter (where kind in ('sale', 'gst_sale')), 0)::integer as stock_out,
  coalesce(sum(quantity) filter (where kind = 'return'), 0)::integer as returned
from public.stock_movements
group by movement_date, product_id;

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
    coalesce(-sum(m.quantity) filter (where m.kind in ('sale', 'gst_sale') and (p_from is null or m.movement_date >= p_from) and (p_to is null or m.movement_date <= p_to)), 0)::integer,
    (p.opening_stock + coalesce(sum(m.quantity) filter (where p_to is null or m.movement_date <= p_to), 0))::integer
  from public.products p
  left join public.stock_movements m on m.product_id = p.id
  group by p.id, p.sku, p.name, p.colour, p.size, p.is_active, p.opening_stock;
$$;
