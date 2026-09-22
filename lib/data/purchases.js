import { fetchAll } from "@/lib/db";
import { UUID_RE, cleanSearch, isValidDate } from "@/lib/validate";

export const PURCHASE_PAGE_SIZE = 20;

function applyFilters(query, { q, supplier, from, to }) {
  const term = cleanSearch(q);
  if (term) {
    const like = `%${term}%`;
    query = query.or(["supplier_name", "notes", "skus"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  if (supplier && UUID_RE.test(supplier)) query = query.eq("supplier_id", supplier);
  if (isValidDate(from)) query = query.gte("purchase_date", from);
  if (isValidDate(to)) query = query.lte("purchase_date", to);
  return query;
}

export async function listPurchases(supabase, filters, page) {
  const start = (page - 1) * PURCHASE_PAGE_SIZE;
  const query = applyFilters(supabase.from("purchase_overview").select("*", { count: "exact" }), filters)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(start, start + PURCHASE_PAGE_SIZE - 1);
  const { data, count, error } = await query;
  return { rows: data ?? [], count: count ?? 0, error };
}

export async function getPurchaseTotals(supabase, filters) {
  const { data } = await fetchAll(() => applyFilters(supabase.from("purchase_overview").select("id, total_qty, grand_total"), filters).order("id"));
  const rows = data ?? [];
  return {
    count: rows.length,
    units: rows.reduce((a, r) => a + r.total_qty, 0),
    spend: rows.reduce((a, r) => a + Number(r.grand_total), 0),
  };
}

export async function getPurchase(supabase, id) {
  if (!UUID_RE.test(id)) return null;
  const { data: purchase } = await supabase.from("purchase_overview").select("*").eq("id", id).maybeSingle();
  if (!purchase) return null;
  const { data: items } = await supabase
    .from("purchase_items")
    .select("id, product_id, quantity, rate, line_total, products(sku, name, colour, size)")
    .eq("purchase_id", id);
  const sorted = (items ?? []).sort((a, b) => a.products.sku.localeCompare(b.products.sku));
  return { purchase, items: sorted };
}
