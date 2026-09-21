-- Core schema for KN inventory + billing (single owner). Additive only.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Single-row application settings; owner_id is linked after the owner account exists.
create table public.settings (
  id boolean primary key default true check (id),
  owner_id uuid references auth.users (id) on delete restrict,
  shop_name text not null default 'KN AND ANTIC BAGS',
  phones text not null default '9321777582 | 8080828615',
  address text not null default 'Shop No 14, Mominpura Kalapani, Near Ahley Hadies Masjid, Opp. Maulana Azad High School, Municipal Colony, Byculla West, Byculla, Mumbai, Maharashtra 400011',
  gst_number text,
  invoice_prefix text not null default 'KN-',
  next_invoice_no integer not null default 1 check (next_invoice_no >= 1),
  default_gst_rate numeric(5,2) not null default 0 check (default_gst_rate between 0 and 100),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (true);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_name_key on public.categories (lower(btrim(name)));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index suppliers_name_key on public.suppliers (lower(btrim(name)));

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_name_key on public.customers (lower(btrim(name)));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null check (length(btrim(sku)) > 0),
  name text not null default '',
  colour text not null default '',
  size text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  opening_stock integer not null default 0 check (opening_stock >= 0),
  purchase_rate numeric(12,2) not null default 0 check (purchase_rate >= 0),
  selling_rate numeric(12,2) not null default 0 check (selling_rate >= 0),
  gst_rate numeric(5,2) not null default 0 check (gst_rate between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_sku_key on public.products (lower(btrim(sku)));
create index products_supplier_idx on public.products (supplier_id);
create index products_category_idx on public.products (category_id);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_date date not null default current_date,
  supplier_id uuid references public.suppliers (id) on delete set null,
  transport_charges numeric(12,2) not null default 0 check (transport_charges >= 0),
  notes text,
  legacy_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchases_date_idx on public.purchases (purchase_date desc);
create index purchases_supplier_idx on public.purchases (supplier_id);
create unique index purchases_legacy_ref_key on public.purchases (legacy_ref) where legacy_ref is not null;

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  rate numeric(12,2) not null default 0 check (rate >= 0),
  line_total numeric(14,2) generated always as (quantity * rate) stored,
  created_at timestamptz not null default now()
);
create index purchase_items_purchase_idx on public.purchase_items (purchase_id);
create index purchase_items_product_idx on public.purchase_items (product_id);

-- A sale is the bill: one record covers stock-out and the invoice.
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null,
  sale_date date not null default current_date,
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text not null default '',
  discount_rate numeric(5,2) not null default 0 check (discount_rate between 0 and 100),
  gst_rate numeric(5,2) not null default 0 check (gst_rate between 0 and 100),
  previous_due numeric(12,2) not null default 0 check (previous_due >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  gst_amount numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  total_payable numeric(14,2) generated always as (grand_total + previous_due) stored,
  balance_due numeric(14,2) generated always as (greatest(grand_total + previous_due - amount_paid, 0)) stored,
  change_amount numeric(14,2) generated always as (greatest(amount_paid - (grand_total + previous_due), 0)) stored,
  notes text,
  legacy_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sales_invoice_no_key on public.sales (invoice_no);
create index sales_date_idx on public.sales (sale_date desc);
create index sales_customer_idx on public.sales (customer_id);
create unique index sales_legacy_ref_key on public.sales (legacy_ref) where legacy_ref is not null;

-- product_id set = stock item (deducts stock); product_id null = custom non-stock line.
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  position integer not null default 0,
  line_date date,
  product_id uuid references public.products (id) on delete restrict,
  description text not null check (length(btrim(description)) > 0),
  quantity integer not null check (quantity > 0),
  rate numeric(12,2) not null default 0 check (rate >= 0),
  line_total numeric(14,2) generated always as (quantity * rate) stored,
  created_at timestamptz not null default now()
);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (product_id) where product_id is not null;

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  return_date date not null default current_date,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  reason text not null check (reason in ('customer_return', 'rto', 'defective')),
  restock boolean not null,
  sale_id uuid references public.sales (id) on delete set null,
  notes text,
  legacy_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index returns_date_idx on public.returns (return_date desc);
create index returns_product_idx on public.returns (product_id);
create index returns_sale_idx on public.returns (sale_id) where sale_id is not null;
create unique index returns_legacy_ref_key on public.returns (legacy_ref) where legacy_ref is not null;

do $$
declare t text;
begin
  foreach t in array array['settings','categories','suppliers','customers','products','purchases','sales','returns']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
