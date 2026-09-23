-- GST Tax Invoice system. Additive only: two new tables, nullable columns on customers/settings/
-- products, and the existing stock views/guard extended to recognize finalized GST invoices as
-- stock-out alongside Normal Bills. Nothing here touches sales/sale_items/save_sale.

-- 1) Reused tables gain nullable GST-only columns. Normal Bills never populate or read these.
alter table public.customers
  add column gstin text,
  add column address text,
  add column state text,
  add column state_code text;

alter table public.settings
  add column pan text,
  add column bank_name text,
  add column bank_account text,
  add column bank_ifsc text,
  add column bank_branch text;

alter table public.products
  add column hsn_code text;

-- 2) GST invoice header. invoice_no is its own numbering series, independent of settings.next_invoice_no
-- (which stays exclusively for Normal Bills) — GST bill books are commonly numbered/reconciled by hand.
create table public.gst_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null,
  status text not null default 'draft' check (status in ('draft', 'final')),
  invoice_date date not null default current_date,
  reverse_charge boolean not null default false,
  supply_state text not null default 'Maharashtra',
  supply_state_code text not null default '27',
  transport_mode text,
  vehicle_number text,
  date_of_supply date,
  place_of_supply text,
  place_of_supply_state_code text,
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text not null default '',
  customer_gstin text,
  customer_mobile text,
  customer_address text,
  customer_state text not null default 'Maharashtra',
  customer_state_code text not null default '27',
  tax_type text not null default 'intra' check (tax_type in ('intra', 'inter')),
  cgst_rate numeric(5,2) not null default 9 check (cgst_rate between 0 and 100),
  sgst_rate numeric(5,2) not null default 9 check (sgst_rate between 0 and 100),
  igst_rate numeric(5,2) not null default 18 check (igst_rate between 0 and 100),
  taxable_amount numeric(14,2) not null default 0,
  cgst_amount numeric(14,2) not null default 0,
  sgst_amount numeric(14,2) not null default 0,
  igst_amount numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(14,2) generated always as (greatest(grand_total - amount_paid, 0)) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index gst_invoices_invoice_no_key on public.gst_invoices (invoice_no);
create index gst_invoices_date_idx on public.gst_invoices (invoice_date desc);
create index gst_invoices_status_idx on public.gst_invoices (status);
create index gst_invoices_customer_idx on public.gst_invoices (customer_id);

-- product_id set = stock item (deducts stock once finalized); product_id null = custom non-stock line.
-- HSN/UOM/name are snapshotted at save time so an edited product never rewrites a past invoice.
create table public.gst_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.gst_invoices (id) on delete cascade,
  position integer not null default 0,
  product_id uuid references public.products (id) on delete restrict,
  product_name text not null default '',
  item_no text,
  hsn_code text,
  uom text not null default 'Pcs',
  quantity integer not null check (quantity > 0),
  rate numeric(12,2) not null default 0 check (rate >= 0),
  line_total numeric(14,2) generated always as (quantity * rate) stored,
  created_at timestamptz not null default now()
);
create index gst_invoice_items_invoice_idx on public.gst_invoice_items (invoice_id);
create index gst_invoice_items_product_idx on public.gst_invoice_items (product_id) where product_id is not null;

create trigger set_updated_at before update on public.gst_invoices for each row execute function public.set_updated_at();

-- 3) Stock integration: finalized GST invoice items join the same movement feed Normal Bills use.
-- A draft's items are simply absent from this view (filtered by status='final'), so a draft can never
-- affect stock — product_stock.current_stock, which sums every movement, picks this up with no other
-- changes needed. sold_qty is updated below so GST sales count toward "units sold" alongside Normal ones.
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
where gi.product_id is not null and gv.status = 'final';

create or replace view public.product_stock
with (security_invoker = true) as
select
  p.id as product_id,
  p.opening_stock,
  coalesce(sum(m.quantity) filter (where m.kind = 'purchase'), 0)::integer as purchased_qty,
  coalesce(-sum(m.quantity) filter (where m.kind in ('sale', 'gst_sale')), 0)::integer as sold_qty,
  coalesce(sum(m.quantity) filter (where m.kind = 'return'), 0)::integer as returned_qty,
  (p.opening_stock + coalesce(sum(m.quantity), 0))::integer as current_stock
from public.products p
left join public.stock_movements m on m.product_id = p.id
group by p.id, p.opening_stock;

-- 4) Stock guard: recognize gst_invoice_items the same way as sale_items, plus the one extra case that
-- doesn't exist for Normal Bills — a draft->final transition is the moment stock impact "appears" for
-- already-saved items, so it needs its own check (mirrors the products.opening_stock guard below it).
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
  elsif tg_table_name = 'gst_invoices' then
    select array_agg(product_id) into pids from public.gst_invoice_items where invoice_id = new.id and product_id is not null;
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
  on public.gst_invoice_items deferrable initially deferred
  for each row execute function public.assert_stock_not_negative();

create constraint trigger stock_guard after update of status
  on public.gst_invoices deferrable initially deferred
  for each row execute function public.assert_stock_not_negative();

-- 5) Atomic save, mirroring save_sale/save_purchase. Handles both draft and final in one call; a
-- draft only requires an invoice number (reserving the slot), final also requires a date and items.
create or replace function public.save_gst_invoice(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_customer_id uuid;
  v_item jsonb;
  v_pos integer := 0;
  v_desc text;
  v_taxable numeric := 0;
  v_cgst numeric := 0;
  v_sgst numeric := 0;
  v_igst numeric := 0;
  v_tax_type text := coalesce(p->>'tax_type', 'intra');
  v_cgst_rate numeric := coalesce(nullif(p->>'cgst_rate', '')::numeric, 9);
  v_sgst_rate numeric := coalesce(nullif(p->>'sgst_rate', '')::numeric, 9);
  v_igst_rate numeric := coalesce(nullif(p->>'igst_rate', '')::numeric, 18);
  v_status text := coalesce(p->>'status', 'draft');
begin
  if v_status not in ('draft', 'final') then
    raise exception 'Invalid invoice status.';
  end if;
  if nullif(btrim(p->>'invoice_no'), '') is null then
    raise exception 'Invoice number is required.';
  end if;
  if v_status = 'final' then
    if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') = 0 then
      raise exception 'Add at least one item before finalizing.';
    end if;
  end if;

  v_customer_id := public.find_or_create_party('customers', p->>'customer_name');
  if v_customer_id is not null then
    update public.customers set
      gstin = coalesce(nullif(p->>'customer_gstin', ''), gstin),
      address = coalesce(nullif(p->>'customer_address', ''), address),
      state = coalesce(nullif(p->>'customer_state', ''), state),
      state_code = coalesce(nullif(p->>'customer_state_code', ''), state_code)
    where id = v_customer_id;
  end if;

  if v_id is null then
    insert into public.gst_invoices (
      invoice_no, status, invoice_date, reverse_charge, supply_state, supply_state_code,
      transport_mode, vehicle_number, date_of_supply, place_of_supply, place_of_supply_state_code,
      customer_id, customer_name, customer_gstin, customer_mobile, customer_address, customer_state, customer_state_code,
      tax_type, cgst_rate, sgst_rate, igst_rate, amount_paid, notes
    ) values (
      btrim(p->>'invoice_no'), v_status, coalesce(nullif(p->>'invoice_date', '')::date, current_date),
      coalesce((p->>'reverse_charge')::boolean, false),
      coalesce(nullif(p->>'supply_state', ''), 'Maharashtra'), coalesce(nullif(p->>'supply_state_code', ''), '27'),
      nullif(p->>'transport_mode', ''), nullif(p->>'vehicle_number', ''),
      nullif(p->>'date_of_supply', '')::date, nullif(p->>'place_of_supply', ''), nullif(p->>'place_of_supply_state_code', ''),
      v_customer_id, btrim(coalesce(p->>'customer_name', '')), nullif(p->>'customer_gstin', ''),
      nullif(p->>'customer_mobile', ''), nullif(p->>'customer_address', ''),
      coalesce(nullif(p->>'customer_state', ''), 'Maharashtra'), coalesce(nullif(p->>'customer_state_code', ''), '27'),
      v_tax_type, v_cgst_rate, v_sgst_rate, v_igst_rate,
      coalesce(nullif(p->>'amount_paid', '')::numeric, 0), nullif(btrim(coalesce(p->>'notes', '')), '')
    ) returning id into v_id;
  else
    update public.gst_invoices set
      invoice_no = btrim(p->>'invoice_no'), status = v_status, invoice_date = coalesce(nullif(p->>'invoice_date', '')::date, invoice_date),
      reverse_charge = coalesce((p->>'reverse_charge')::boolean, false),
      supply_state = coalesce(nullif(p->>'supply_state', ''), 'Maharashtra'), supply_state_code = coalesce(nullif(p->>'supply_state_code', ''), '27'),
      transport_mode = nullif(p->>'transport_mode', ''), vehicle_number = nullif(p->>'vehicle_number', ''),
      date_of_supply = nullif(p->>'date_of_supply', '')::date, place_of_supply = nullif(p->>'place_of_supply', ''),
      place_of_supply_state_code = nullif(p->>'place_of_supply_state_code', ''),
      customer_id = v_customer_id, customer_name = btrim(coalesce(p->>'customer_name', '')), customer_gstin = nullif(p->>'customer_gstin', ''),
      customer_mobile = nullif(p->>'customer_mobile', ''), customer_address = nullif(p->>'customer_address', ''),
      customer_state = coalesce(nullif(p->>'customer_state', ''), 'Maharashtra'), customer_state_code = coalesce(nullif(p->>'customer_state_code', ''), '27'),
      tax_type = v_tax_type, cgst_rate = v_cgst_rate, sgst_rate = v_sgst_rate, igst_rate = v_igst_rate,
      amount_paid = coalesce(nullif(p->>'amount_paid', '')::numeric, 0), notes = nullif(btrim(coalesce(p->>'notes', '')), '')
    where id = v_id;
    if not found then raise exception 'GST invoice not found.'; end if;
    delete from public.gst_invoice_items where invoice_id = v_id;
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) loop
    v_pos := v_pos + 1;
    v_desc := btrim(coalesce(v_item->>'product_name', ''));
    if v_desc = '' and (v_item->>'product_id') is not null then
      select coalesce(nullif(btrim(name), ''), sku) into v_desc from public.products where id = (v_item->>'product_id')::uuid;
    end if;
    insert into public.gst_invoice_items (invoice_id, position, product_id, product_name, item_no, hsn_code, uom, quantity, rate)
    values (
      v_id, v_pos, nullif(v_item->>'product_id', '')::uuid, v_desc,
      nullif(v_item->>'item_no', ''), nullif(v_item->>'hsn_code', ''), coalesce(nullif(v_item->>'uom', ''), 'Pcs'),
      (v_item->>'quantity')::integer, coalesce(nullif(v_item->>'rate', '')::numeric, 0)
    );
  end loop;

  select coalesce(sum(line_total), 0) into v_taxable from public.gst_invoice_items where invoice_id = v_id;
  if v_tax_type = 'intra' then
    v_cgst := round(v_taxable * v_cgst_rate / 100, 2);
    v_sgst := round(v_taxable * v_sgst_rate / 100, 2);
    v_igst := 0;
  else
    v_igst := round(v_taxable * v_igst_rate / 100, 2);
    v_cgst := 0;
    v_sgst := 0;
  end if;

  update public.gst_invoices set
    taxable_amount = v_taxable, cgst_amount = v_cgst, sgst_amount = v_sgst, igst_amount = v_igst,
    grand_total = v_taxable + v_cgst + v_sgst + v_igst
  where id = v_id;

  return v_id;
end;
$$;

revoke execute on function public.save_gst_invoice(jsonb) from public, anon;
grant execute on function public.save_gst_invoice(jsonb) to authenticated;

-- 6) RLS: same owner-only pattern as every other table.
alter table public.gst_invoices enable row level security;
alter table public.gst_invoice_items enable row level security;
revoke all on public.gst_invoices, public.gst_invoice_items from anon;
create policy owner_all on public.gst_invoices for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_all on public.gst_invoice_items for all to authenticated using (public.is_owner()) with check (public.is_owner());

create trigger audit_row after insert or update or delete on public.gst_invoices for each row execute function public.audit_row();
create trigger audit_row after insert or update or delete on public.gst_invoice_items for each row execute function public.audit_row();
