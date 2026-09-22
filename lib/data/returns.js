import { RETURN_REASONS } from "@/lib/constants";
import { fetchAll } from "@/lib/db";
import { UUID_RE, cleanSearch, isValidDate } from "@/lib/validate";

export const RETURN_PAGE_SIZE = 20;

function applyFilters(query, { q, reason, from, to }) {
  const term = cleanSearch(q);
  if (term) {
    const like = `%${term}%`;
    query = query.or(["sku", "name", "colour", "notes"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  if (RETURN_REASONS.some((r) => r.value === reason)) query = query.eq("reason", reason);
  if (isValidDate(from)) query = query.gte("return_date", from);
  if (isValidDate(to)) query = query.lte("return_date", to);
  return query;
}

export async function listReturns(supabase, filters, page) {
  const start = (page - 1) * RETURN_PAGE_SIZE;
  const query = applyFilters(supabase.from("return_overview").select("*", { count: "exact" }), filters)
    .order("return_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(start, start + RETURN_PAGE_SIZE - 1);
  const { data, count, error } = await query;
  return { rows: data ?? [], count: count ?? 0, error };
}

export async function getReturnTotals(supabase, filters) {
  const { data } = await fetchAll(() => applyFilters(supabase.from("return_overview").select("id, quantity, restock"), filters).order("id"));
  const rows = data ?? [];
  return {
    count: rows.length,
    restocked: rows.filter((r) => r.restock).reduce((a, r) => a + r.quantity, 0),
    notRestocked: rows.filter((r) => !r.restock).reduce((a, r) => a + r.quantity, 0),
  };
}

export async function getReturn(supabase, id) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await supabase.from("return_overview").select("*").eq("id", id).maybeSingle();
  return data;
}
