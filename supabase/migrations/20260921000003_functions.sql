-- Atomic save functions. SECURITY INVOKER: they run as the signed-in owner, so RLS applies.

create or replace function public.find_or_create_party(p_table text, p_name text)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_name = '' then return null; end if;
  if p_table = 'suppliers' then
    select id into v_id from public.suppliers where lower(btrim(name)) = lower(v_name);
    if v_id is null then insert into public.suppliers (name) values (v_name) returning id into v_id; end if;
  elsif p_table = 'customers' then
    select id into v_id from public.customers where lower(btrim(name)) = lower(v_name);
    if v_id is null then insert into public.customers (name) values (v_name) returning id into v_id; end if;
  else
    raise exception 'Unknown party table %', p_table;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_purchase(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_item jsonb;
begin
  if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') = 0 then
    raise exception 'Add at least one product to the purchase.';
  end if;

  if v_id is null then
    insert into public.purchases (purchase_date, supplier_id, transport_charges, notes)
    values (
      coalesce(nullif(p->>'purchase_date', '')::date, current_date),
      public.find_or_create_party('suppliers', p->>'supplier_name'),
      coalesce(nullif(p->>'transport_charges', '')::numeric, 0),
      nullif(btrim(coalesce(p->>'notes', '')), '')
    ) returning id into v_id;
  else
    update public.purchases set
      purchase_date = coalesce(nullif(p->>'purchase_date', '')::date, purchase_date),
      supplier_id = public.find_or_create_party('suppliers', p->>'supplier_name'),
      transport_charges = coalesce(nullif(p->>'transport_charges', '')::numeric, 0),
      notes = nullif(btrim(coalesce(p->>'notes', '')), '')
    where id = v_id;
    if not found then raise exception 'Purchase not found.'; end if;
    delete from public.purchase_items where purchase_id = v_id;
  end if;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    insert into public.purchase_items (purchase_id, product_id, quantity, rate)
    values (
      v_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      coalesce(nullif(v_item->>'rate', '')::numeric, 0)
    );
  end loop;

  return v_id;
end;
$$;

create or replace function public.save_sale(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_invoice text;
  v_prefix text;
  v_no integer;
  v_customer text := btrim(coalesce(p->>'customer_name', ''));
  v_item jsonb;
  v_pos integer := 0;
  v_desc text;
  v_prod uuid;
  v_disc_rate numeric := coalesce(nullif(p->>'discount_rate', '')::numeric, 0);
  v_gst_rate numeric := coalesce(nullif(p->>'gst_rate', '')::numeric, 0);
  v_sub numeric;
  v_disc numeric;
  v_gst numeric;
begin
  if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') = 0 then
    raise exception 'Add at least one item to the bill.';
  end if;

  if v_id is null then
    update public.settings set next_invoice_no = next_invoice_no + 1
    where id returning invoice_prefix, next_invoice_no - 1 into v_prefix, v_no;
    v_invoice := v_prefix || lpad(v_no::text, 4, '0');

    insert into public.sales (invoice_no, sale_date, customer_id, customer_name, discount_rate, gst_rate,
                              previous_due, amount_paid, notes)
    values (
      v_invoice,
      coalesce(nullif(p->>'sale_date', '')::date, current_date),
      public.find_or_create_party('customers', v_customer),
      v_customer,
      v_disc_rate,
      v_gst_rate,
      coalesce(nullif(p->>'previous_due', '')::numeric, 0),
      coalesce(nullif(p->>'amount_paid', '')::numeric, 0),
      nullif(btrim(coalesce(p->>'notes', '')), '')
    ) returning id into v_id;
  else
    update public.sales set
      sale_date = coalesce(nullif(p->>'sale_date', '')::date, sale_date),
      customer_id = public.find_or_create_party('customers', v_customer),
      customer_name = v_customer,
      discount_rate = v_disc_rate,
      gst_rate = v_gst_rate,
      previous_due = coalesce(nullif(p->>'previous_due', '')::numeric, 0),
      amount_paid = coalesce(nullif(p->>'amount_paid', '')::numeric, 0),
      notes = nullif(btrim(coalesce(p->>'notes', '')), '')
    where id = v_id;
    if not found then raise exception 'Bill not found.'; end if;
    delete from public.sale_items where sale_id = v_id;
  end if;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_pos := v_pos + 1;
    v_prod := nullif(v_item->>'product_id', '')::uuid;
    v_desc := btrim(coalesce(v_item->>'description', ''));
    if v_desc = '' and v_prod is not null then
      select coalesce(nullif(btrim(name), ''), sku) into v_desc from public.products where id = v_prod;
    end if;
    insert into public.sale_items (sale_id, position, line_date, product_id, description, quantity, rate)
    values (
      v_id, v_pos,
      nullif(v_item->>'line_date', '')::date,
      v_prod,
      v_desc,
      (v_item->>'quantity')::integer,
      coalesce(nullif(v_item->>'rate', '')::numeric, 0)
    );
  end loop;

  select coalesce(sum(line_total), 0) into v_sub from public.sale_items where sale_id = v_id;
  v_disc := round(v_sub * v_disc_rate / 100, 2);
  v_gst := round((v_sub - v_disc) * v_gst_rate / 100, 2);
  update public.sales set subtotal = v_sub, discount_amount = v_disc, gst_amount = v_gst,
                          grand_total = v_sub - v_disc + v_gst
  where id = v_id;

  return v_id;
end;
$$;

create or replace function public.save_return(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_reason text := p->>'reason';
  v_restock boolean := coalesce((p->>'restock')::boolean, v_reason <> 'defective');
begin
  if v_id is null then
    insert into public.returns (return_date, product_id, quantity, reason, restock, sale_id, notes)
    values (
      coalesce(nullif(p->>'return_date', '')::date, current_date),
      (p->>'product_id')::uuid,
      (p->>'quantity')::integer,
      v_reason,
      v_restock,
      nullif(p->>'sale_id', '')::uuid,
      nullif(btrim(coalesce(p->>'notes', '')), '')
    ) returning id into v_id;
  else
    update public.returns set
      return_date = coalesce(nullif(p->>'return_date', '')::date, return_date),
      product_id = (p->>'product_id')::uuid,
      quantity = (p->>'quantity')::integer,
      reason = v_reason,
      restock = v_restock,
      sale_id = nullif(p->>'sale_id', '')::uuid,
      notes = nullif(btrim(coalesce(p->>'notes', '')), '')
    where id = v_id;
    if not found then raise exception 'Return not found.'; end if;
  end if;
  return v_id;
end;
$$;
