-- Single-owner security: RLS on everything, no anon access, audit trail.

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.settings s
    where s.id and s.owner_id is not null and s.owner_id = (select auth.uid())
  );
$$;

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  actor uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_row_idx on public.audit_log (table_name, row_id);

create or replace function public.audit_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (table_name, row_id, action, old_data)
    values (tg_table_name, to_jsonb(old)->>'id', 'DELETE', to_jsonb(old));
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (table_name, row_id, action, old_data, new_data)
    values (tg_table_name, to_jsonb(new)->>'id', 'UPDATE', to_jsonb(old), to_jsonb(new));
  else
    insert into public.audit_log (table_name, row_id, action, new_data)
    values (tg_table_name, to_jsonb(new)->>'id', 'INSERT', to_jsonb(new));
  end if;
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['products','purchases','purchase_items','sales','sale_items','returns']
  loop
    execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function public.audit_row()', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['settings','categories','suppliers','customers','products','purchases','purchase_items','sales','sale_items','returns']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy owner_all on public.%I for all to authenticated using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
end $$;

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon;
revoke update, delete on public.audit_log from authenticated;
create policy owner_read on public.audit_log for select to authenticated using (public.is_owner());
create policy owner_insert on public.audit_log for insert to authenticated with check (public.is_owner());

revoke all on public.stock_movements, public.product_stock, public.stock_ledger from anon;

revoke execute on function public.is_owner() from public, anon;
revoke execute on function public.find_or_create_party(text, text) from public, anon;
revoke execute on function public.save_purchase(jsonb) from public, anon;
revoke execute on function public.save_sale(jsonb) from public, anon;
revoke execute on function public.save_return(jsonb) from public, anon;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.find_or_create_party(text, text) to authenticated;
grant execute on function public.save_purchase(jsonb) to authenticated;
grant execute on function public.save_sale(jsonb) to authenticated;
grant execute on function public.save_return(jsonb) to authenticated;
