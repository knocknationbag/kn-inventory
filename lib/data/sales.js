import { UUID_RE, cleanSearch, isValidDate } from "@/lib/validate";

export const SALE_PAGE_SIZE = 20;

export const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "due", label: "Balance due" },
  { value: "paid", label: "Paid" },
];

function applyFilters(query, { q, status, from, to }) {
  const term = cleanSearch(q);
  if (term) {
    const like = `%${term}%`;
    query = query.or(["invoice_no", "customer_name"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  if (status === "due") query = query.gt("balance_due", 0);
  if (status === "paid") query = query.eq("balance_due", 0);
  if (isValidDate(from)) query = query.gte("sale_date", from);
  if (isValidDate(to)) query = query.lte("sale_date", to);
  return query;
}

const LIST_COLUMNS = "id, invoice_no, sale_date, customer_name, grand_total, amount_paid, balance_due, change_amount, created_at";

export async function listSales(supabase, filters, page) {
  const start = (page - 1) * SALE_PAGE_SIZE;
  const { data, count, error } = await applyFilters(supabase.from("sales").select(LIST_COLUMNS, { count: "exact" }), filters)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(start, start + SALE_PAGE_SIZE - 1);
  return { rows: data ?? [], count: count ?? 0, error };
}

export async function getSaleTotals(supabase, filters) {
  const { data } = await applyFilters(supabase.from("sales").select("grand_total, balance_due").limit(10000), filters);
  const rows = data ?? [];
  return {
    count: rows.length,
    billed: rows.reduce((a, r) => a + Number(r.grand_total), 0),
    outstanding: rows.reduce((a, r) => a + Number(r.balance_due), 0),
  };
}

export async function getSale(supabase, id) {
  if (!UUID_RE.test(id)) return null;
  const { data: sale } = await supabase.from("sales").select("*").eq("id", id).maybeSingle();
  if (!sale) return null;
  const { data: items } = await supabase
    .from("sale_items")
    .select("id, position, line_date, product_id, description, quantity, rate, line_total")
    .eq("sale_id", id)
    .order("position");
  return { sale, items: items ?? [] };
}

export async function getSettings(supabase) {
  const { data } = await supabase.from("settings").select("*").maybeSingle();
  return data;
}

export async function getCustomerNames(supabase) {
  const { data } = await supabase.from("customers").select("name").order("name").limit(2000);
  return (data ?? []).map((c) => c.name);
}
