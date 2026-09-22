-- Legacy data import: one function, two calls. p_dry_run=true runs everything then rolls back and
-- returns the would-be result via a raised exception (caught and parsed by the caller); p_dry_run=false
-- commits for real. Idempotent: every imported row is tagged with legacy_ref so re-running the same
-- backup file only imports what wasn't imported before. If anything would push stock below zero, the
-- whole import (dry run or real) is refused so partial/bad data never lands.

create or replace function public.import_legacy_bundle(p jsonb, p_dry_run boolean default true)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  item jsonb;
  bill jsonb;
  bill_item jsonb;
  v_pid uuid;
  v_desc text;
  v_supplier_id uuid;
  v_customer_id uuid;
  v_purchase_id uuid;
  v_sale_id uuid;
  v_return_id uuid;
  v_return_ref text;
  v_bill_no text;
  v_sub numeric;
  v_disc numeric;
  v_gst numeric;
  v_pos integer;
  v_no integer;
  max_legacy_no integer := 0;
  legacy_seq integer := 0;
  products_created integer := 0;
  products_matched integer := 0;
  purchases_imported integer := 0;
  purchases_skipped integer := 0;
  inv_sales_imported integer := 0;
  inv_sales_skipped integer := 0;
  returns_imported integer := 0;
  returns_skipped integer := 0;
  bills_imported integer := 0;
  bills_skipped integer := 0;
  warnings text[] := '{}';
  blocking text[] := '{}';
  neg record;
  summary jsonb;
begin
  -- 1) products: match existing by SKU (case-insensitive); create only what's missing, using the legacy fields.
  for item in select * from jsonb_array_elements(coalesce(p->'products', '[]'::jsonb)) loop
    v_pid := null;
    select id into v_pid from public.products where lower(btrim(sku)) = lower(btrim(item->>'sku'));
    if v_pid is not null then
      products_matched := products_matched + 1;
    else
      v_supplier_id := public.find_or_create_party('suppliers', item->>'supplier');
      insert into public.products (sku, name, colour, size, opening_stock, purchase_rate, gst_rate, supplier_id)
      values (
        btrim(item->>'sku'), coalesce(item->>'name', ''), coalesce(item->>'colour', ''), coalesce(item->>'size', ''),
        coalesce((item->>'opening')::integer, 0), coalesce((item->>'rate')::numeric, 0), coalesce((item->>'gst')::numeric, 0),
        v_supplier_id
      )
      returning id into v_pid;
      products_created := products_created + 1;
    end if;
  end loop;

  -- 2) purchases: one purchase + one item per legacy row.
  for item in select * from jsonb_array_elements(coalesce(p->'purchases', '[]'::jsonb)) loop
    v_pid := null; v_purchase_id := null;
    select id into v_pid from public.products where lower(btrim(sku)) = lower(btrim(item->>'sku'));
    if v_pid is null then
      purchases_skipped := purchases_skipped + 1;
      warnings := warnings || format('Skipped a purchase for unknown SKU %s.', item->>'sku');
      continue;
    end if;
    v_return_ref := 'lp:' || md5(coalesce(item->>'date','') || '|' || lower(btrim(item->>'sku')) || '|' || coalesce(item->>'qty','') || '|' || coalesce(item->>'rate','') || '|' || coalesce(item->>'supplier','') || '|' || coalesce(item->>'transport',''));
    v_supplier_id := public.find_or_create_party('suppliers', item->>'supplier');
    insert into public.purchases (purchase_date, supplier_id, transport_charges, notes, legacy_ref)
    values ((item->>'date')::date, v_supplier_id, coalesce((item->>'transport')::numeric, 0), 'Imported from legacy inventory backup', v_return_ref)
    on conflict (legacy_ref) where legacy_ref is not null do nothing
    returning id into v_purchase_id;
    if v_purchase_id is null then
      purchases_skipped := purchases_skipped + 1;
    else
      insert into public.purchase_items (purchase_id, product_id, quantity, rate)
      values (v_purchase_id, v_pid, (item->>'qty')::integer, coalesce((item->>'rate')::numeric, 0));
      purchases_imported := purchases_imported + 1;
    end if;
  end loop;

  -- 3) inventory-only "sales" (old stock-out records with no invoice): imported as bills, prefixed LEGACY-
  -- so they never collide with real KN-#### numbers, marked paid in full since no due was ever tracked.
  for item in select * from jsonb_array_elements(coalesce(p->'inventory_sales', '[]'::jsonb)) loop
    v_pid := null; v_sale_id := null; v_desc := null;
    select id into v_pid from public.products where lower(btrim(sku)) = lower(btrim(item->>'sku'));
    if v_pid is null then
      inv_sales_skipped := inv_sales_skipped + 1;
      warnings := warnings || format('Skipped a sale for unknown SKU %s.', item->>'sku');
      continue;
    end if;
    v_return_ref := 'lis:' || md5(coalesce(item->>'date','') || '|' || lower(btrim(item->>'sku')) || '|' || coalesce(item->>'qty','') || '|' || coalesce(item->>'rate','') || '|' || coalesce(item->>'customer',''));
    select id into v_sale_id from public.sales where legacy_ref = v_return_ref;
    if v_sale_id is not null then
      inv_sales_skipped := inv_sales_skipped + 1;
      continue;
    end if;
    select coalesce(nullif(name, ''), sku) into v_desc from public.products where id = v_pid;
    v_customer_id := public.find_or_create_party('customers', item->>'customer');
    v_sub := coalesce((item->>'qty')::numeric, 0) * coalesce((item->>'rate')::numeric, 0);
    insert into public.sales (invoice_no, sale_date, customer_id, customer_name, discount_rate, gst_rate, previous_due, amount_paid, subtotal, discount_amount, gst_amount, grand_total, notes, legacy_ref)
    values (
      'LEGACY-' || upper(substring(md5(v_return_ref) from 1 for 8)), (item->>'date')::date, v_customer_id, coalesce(item->>'customer', ''),
      0, 0, 0, v_sub, v_sub, 0, 0, v_sub, 'Imported from legacy inventory sales record (no invoice existed)', v_return_ref
    )
    returning id into v_sale_id;
    insert into public.sale_items (sale_id, position, product_id, description, quantity, rate)
    values (v_sale_id, 1, v_pid, v_desc, (item->>'qty')::integer, coalesce((item->>'rate')::numeric, 0));
    inv_sales_imported := inv_sales_imported + 1;
  end loop;

  -- 4) returns: preserved exactly as the old app behaved (every return restocked, including defective).
  for item in select * from jsonb_array_elements(coalesce(p->'returns', '[]'::jsonb)) loop
    v_pid := null; v_return_id := null;
    select id into v_pid from public.products where lower(btrim(sku)) = lower(btrim(item->>'sku'));
    if v_pid is null then
      returns_skipped := returns_skipped + 1;
      warnings := warnings || format('Skipped a return for unknown SKU %s.', item->>'sku');
      continue;
    end if;
    v_return_ref := 'lr:' || md5(coalesce(item->>'date','') || '|' || lower(btrim(item->>'sku')) || '|' || coalesce(item->>'qty','') || '|' || coalesce(item->>'type',''));
    insert into public.returns (return_date, product_id, quantity, reason, restock, notes, legacy_ref)
    values ((item->>'date')::date, v_pid, (item->>'qty')::integer, item->>'type', true, 'Imported from legacy inventory backup', v_return_ref)
    on conflict (legacy_ref) where legacy_ref is not null do nothing
    returning id into v_return_id;
    if v_return_id is null then
      returns_skipped := returns_skipped + 1;
    else
      returns_imported := returns_imported + 1;
    end if;
  end loop;

  -- 5) real historical bills: kept as free-text lines (no product link, so they never touch stock),
  -- with their original bill numbers preserved. The invoice counter is bumped past the highest one after.
  for bill in select * from jsonb_array_elements(coalesce(p->'bills', '[]'::jsonb)) loop
    v_sale_id := null; v_pos := 0;
    v_bill_no := nullif(btrim(bill->>'bill_no'), '');
    if v_bill_no is null then
      bills_skipped := bills_skipped + 1;
      continue;
    end if;
    v_return_ref := 'lb:' || v_bill_no;
    select id into v_sale_id from public.sales where legacy_ref = v_return_ref;
    if v_sale_id is not null then
      bills_skipped := bills_skipped + 1;
      continue;
    end if;
    if exists (select 1 from public.sales where invoice_no = v_bill_no) then
      bills_skipped := bills_skipped + 1;
      warnings := warnings || format('Bill %s already exists with different history, so it was skipped.', v_bill_no);
      continue;
    end if;

    v_customer_id := public.find_or_create_party('customers', bill->>'customer');
    insert into public.sales (invoice_no, sale_date, customer_id, customer_name, discount_rate, gst_rate, previous_due, amount_paid, notes, legacy_ref)
    values (
      v_bill_no, (bill->>'date')::date, v_customer_id, coalesce(bill->>'customer', ''),
      coalesce((bill->>'discount')::numeric, 0), coalesce((bill->>'gst')::numeric, 0),
      coalesce((bill->>'previous_due')::numeric, 0), coalesce((bill->>'paid')::numeric, 0),
      'Imported from legacy billing backup', v_return_ref
    )
    returning id into v_sale_id;

    for bill_item in select * from jsonb_array_elements(coalesce(bill->'items', '[]'::jsonb)) loop
      v_pos := v_pos + 1;
      insert into public.sale_items (sale_id, position, line_date, product_id, description, quantity, rate)
      values (
        v_sale_id, v_pos, nullif(bill_item->>'date', '')::date, null,
        coalesce(nullif(btrim(bill_item->>'description'), ''), 'Item'),
        (bill_item->>'qty')::integer, coalesce((bill_item->>'rate')::numeric, 0)
      );
    end loop;

    select coalesce(sum(line_total), 0) into v_sub from public.sale_items where sale_id = v_sale_id;
    v_disc := round(v_sub * coalesce((bill->>'discount')::numeric, 0) / 100, 2);
    v_gst := round((v_sub - v_disc) * coalesce((bill->>'gst')::numeric, 0) / 100, 2);
    update public.sales set subtotal = v_sub, discount_amount = v_disc, gst_amount = v_gst, grand_total = v_sub - v_disc + v_gst
    where id = v_sale_id;

    bills_imported := bills_imported + 1;
    v_no := nullif(substring(v_bill_no from '(\d+)$'), '')::integer;
    if v_no is not null and v_no > max_legacy_no then max_legacy_no := v_no; end if;
  end loop;

  if max_legacy_no > 0 then
    update public.settings set next_invoice_no = greatest(next_invoice_no, max_legacy_no + 1) where id;
  end if;

  -- Final safety net: every product's stock must still be zero or more after everything above.
  for neg in
    select p2.sku, ps.current_stock from public.product_stock ps join public.products p2 on p2.id = ps.product_id where ps.current_stock < 0
  loop
    blocking := blocking || format('%s would end up with %s in stock, which is not possible. Check its opening stock and history in the backup file.', neg.sku, neg.current_stock);
  end loop;

  summary := jsonb_build_object(
    'products', jsonb_build_object('created', products_created, 'matched', products_matched),
    'purchases', jsonb_build_object('imported', purchases_imported, 'skipped', purchases_skipped),
    'inventory_sales', jsonb_build_object('imported', inv_sales_imported, 'skipped', inv_sales_skipped),
    'returns', jsonb_build_object('imported', returns_imported, 'skipped', returns_skipped),
    'bills', jsonb_build_object('imported', bills_imported, 'skipped', bills_skipped),
    'warnings', to_jsonb(warnings),
    'blocking', to_jsonb(blocking)
  );

  if array_length(blocking, 1) > 0 then
    raise exception 'IMPORT_BLOCKED:%', summary::text;
  end if;

  if p_dry_run then
    raise exception 'DRY_RUN_RESULT:%', summary::text;
  end if;

  return summary;
end;
$$;

revoke all on function public.import_legacy_bundle(jsonb, boolean) from public, anon;
grant execute on function public.import_legacy_bundle(jsonb, boolean) to authenticated;
