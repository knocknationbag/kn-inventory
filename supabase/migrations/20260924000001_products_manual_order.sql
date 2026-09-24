-- Manual (drag-and-drop) ordering for the Products page. Additive: one new column on products, a
-- deterministic backfill from creation order, an insert trigger that appends new products at the end,
-- and an RPC that reorders a set of products safely. No existing business data is changed.

alter table public.products add column manual_sort_order integer;

-- Backfill: oldest-created product = 1, next = 2, ... The backfill is not a business edit, so the audit
-- and updated_at triggers are paused for it (created_at, updated_at, stock and every other column are untouched).
alter table public.products disable trigger audit_row;
alter table public.products disable trigger set_updated_at;
update public.products p
set manual_sort_order = r.position
from (select id, row_number() over (order by created_at, id)::integer as position from public.products) r
where p.id = r.id and p.manual_sort_order is null;
alter table public.products enable trigger set_updated_at;
alter table public.products enable trigger audit_row;

alter table public.products alter column manual_sort_order set not null;
-- Deferred so a reorder can permute values inside one statement without tripping over itself.
alter table public.products
  add constraint products_manual_sort_order_key unique (manual_sort_order) deferrable initially deferred;

-- New products join the end of the manual order. An advisory lock keeps two simultaneous inserts apart.
create or replace function public.assign_manual_sort_order()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.manual_sort_order is null then
    perform pg_advisory_xact_lock(hashtext('products_manual_sort_order'));
    select coalesce(max(manual_sort_order), 0) + 1 into new.manual_sort_order from public.products;
  end if;
  return new;
end;
$$;

create trigger assign_manual_sort_order before insert on public.products
  for each row execute function public.assign_manual_sort_order();

-- Reordering is not a product edit: leave updated_at alone when manual_sort_order is the only change.
drop trigger set_updated_at on public.products;
create trigger set_updated_at before update on public.products
  for each row
  when ((to_jsonb(old) - 'manual_sort_order') is distinct from (to_jsonb(new) - 'manual_sort_order'))
  execute function public.set_updated_at();

-- p_ids is the new top-to-bottom order of some products (a page, or a filtered subset). They swap among
-- the positions they already occupy, so products that are not in the list keep their exact positions and
-- every value stays unique. Runs as the caller, so row-level security still applies.
create or replace function public.reorder_products(p_ids uuid[])
returns integer
language plpgsql
set search_path = public
as $$
declare
  found_count integer;
  changed integer;
begin
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    raise exception 'NOTHING_TO_REORDER';
  end if;
  if array_length(p_ids, 1) > 500 then
    raise exception 'TOO_MANY_PRODUCTS';
  end if;
  if (select count(distinct x) from unnest(p_ids) x) <> array_length(p_ids, 1) then
    raise exception 'DUPLICATE_PRODUCT';
  end if;

  perform 1 from public.products where id = any(p_ids) order by id for update;
  select count(*) into found_count from public.products where id = any(p_ids);
  if found_count <> array_length(p_ids, 1) then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  update public.products p
  set manual_sort_order = s.slot
  from (
    select u.id, sl.slot
    from unnest(p_ids) with ordinality as u(id, ord)
    join (
      select slot, row_number() over (order by slot) as ord
      from (select manual_sort_order as slot from public.products where id = any(p_ids)) x
    ) sl on sl.ord = u.ord
  ) s
  where p.id = s.id and p.manual_sort_order <> s.slot;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke execute on function public.reorder_products(uuid[]) from public, anon;
grant execute on function public.reorder_products(uuid[]) to authenticated;

-- Expose the order to the Products list (appended last: CREATE OR REPLACE VIEW cannot reorder columns).
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
  p.hsn_code,
  p.manual_sort_order
from public.products p
join public.product_stock ps on ps.product_id = p.id
left join public.categories c on c.id = p.category_id
left join public.suppliers s on s.id = p.supplier_id
cross join public.settings st;
