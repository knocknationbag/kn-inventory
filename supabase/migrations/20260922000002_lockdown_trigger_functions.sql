-- Trigger functions are only ever meant to run via their triggers, but Postgres grants EXECUTE to
-- PUBLIC by default on new functions. Calling one directly would error out anyway (they read NEW/OLD/
-- TG_OP, which are undefined outside trigger context) so this isn't exploitable, but locking it down
-- explicitly keeps every function's grants intentional rather than relying on that default behaviour.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.assert_stock_not_negative() from public, anon, authenticated;
revoke execute on function public.audit_row() from public, anon, authenticated;
