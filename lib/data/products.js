import { fetchAll } from "@/lib/db";
import { UUID_RE, cleanSearch } from "@/lib/validate";

export const PAGE_SIZE = 20;

export const SORT_OPTIONS = [
  { value: "", label: "SKU (A-Z)", column: "sku", ascending: true },
  { value: "stock_asc", label: "Stock: low to high", column: "current_stock", ascending: true },
  { value: "stock_desc", label: "Stock: high to low", column: "current_stock", ascending: false },
  { value: "value_desc", label: "Stock value: high to low", column: "stock_value", ascending: false },
  { value: "newest", label: "Recently added", column: "created_at", ascending: false },
];

export const STOCK_FILTERS = [
  { value: "", label: "All" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
  { value: "archived", label: "Archived" },
];

export function parsePage(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function listProducts(supabase, { q, filter, category, supplier, sort, page }) {
  const sorting = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[0];
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase.from("product_overview").select("*", { count: "exact" });
  query = query.eq("is_active", filter !== "archived");
  if (filter === "low") query = query.eq("is_low", true);
  if (filter === "out") query = query.lte("current_stock", 0);
  if (category && UUID_RE.test(category)) query = query.eq("category_id", category);
  if (supplier && UUID_RE.test(supplier)) query = query.eq("supplier_id", supplier);

  const term = cleanSearch(q);
  if (term) {
    const like = `%${term}%`;
    query = query.or(
      ["sku", "name", "colour", "size", "category_name", "supplier_name"].map((c) => `${c}.ilike.${like}`).join(","),
    );
  }

  query = query.order(sorting.column, { ascending: sorting.ascending }).order("sku").range(from, from + PAGE_SIZE - 1);
  const { data, count, error } = await query;
  return { rows: data ?? [], count: count ?? 0, error };
}

export async function getProductStats(supabase) {
  const { data, error } = await fetchAll(() =>
    supabase.from("product_overview").select("id, current_stock, stock_value, is_low").eq("is_active", true).order("id"),
  );
  if (error) return { error };
  const stats = { products: data.length, units: 0, value: 0, low: 0 };
  for (const p of data) {
    stats.units += p.current_stock;
    stats.value += Number(p.stock_value);
    if (p.is_low) stats.low += 1;
  }
  return { stats };
}

export async function getFormOptions(supabase) {
  const [categories, suppliers] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);
  return { categories: categories.data ?? [], suppliers: suppliers.data ?? [] };
}

export async function getProduct(supabase, id) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await supabase.from("product_overview").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getProductLedger(supabase, id, page) {
  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await supabase
    .from("stock_ledger")
    .select("*", { count: "exact" })
    .eq("product_id", id)
    .order("movement_date", { ascending: false })
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  return { rows: data ?? [], count: count ?? 0 };
}
