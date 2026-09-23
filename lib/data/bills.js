import { fetchAll } from "@/lib/db";
import { cleanSearch, isValidDate } from "@/lib/validate";

export const BILL_PAGE_SIZE = 20;

export const TYPE_FILTERS = [
  { value: "", label: "All bills" },
  { value: "normal", label: "Normal" },
  { value: "gst", label: "GST invoices" },
];

export const BILL_STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "due", label: "Balance due" },
  { value: "paid", label: "Paid" },
  { value: "draft", label: "Drafts" },
];

export function billHref(bill) {
  return bill.bill_type === "gst" ? `/sales/gst/${bill.id}` : `/sales/${bill.id}`;
}

function applyFilters(query, { q, type, status, from, to }) {
  const term = cleanSearch(q);
  if (term) {
    const like = `%${term}%`;
    query = query.or(["bill_no", "customer_name"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  if (type === "normal" || type === "gst") query = query.eq("bill_type", type);
  if (status === "draft") query = query.eq("status", "draft");
  if (status === "due") query = query.eq("status", "final").gt("balance_due", 0);
  if (status === "paid") query = query.eq("status", "final").eq("balance_due", 0);
  if (isValidDate(from)) query = query.gte("bill_date", from);
  if (isValidDate(to)) query = query.lte("bill_date", to);
  return query;
}

const LIST_COLUMNS = "bill_type, id, bill_no, bill_date, customer_name, grand_total, amount_paid, balance_due, status, created_at";

export async function listBills(supabase, filters, page) {
  const start = (page - 1) * BILL_PAGE_SIZE;
  const { data, count, error } = await applyFilters(supabase.from("all_bills").select(LIST_COLUMNS, { count: "exact" }), filters)
    .order("bill_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(start, start + BILL_PAGE_SIZE - 1);
  return { rows: data ?? [], count: count ?? 0, error };
}

// Money totals never include drafts: a draft is not a sale yet.
export async function getBillTotals(supabase, filters) {
  const { data } = await fetchAll(() =>
    applyFilters(supabase.from("all_bills").select("id, grand_total, balance_due, status"), filters).order("id"),
  );
  const rows = data ?? [];
  const final = rows.filter((r) => r.status === "final");
  return {
    count: rows.length,
    drafts: rows.length - final.length,
    billed: final.reduce((a, r) => a + Number(r.grand_total), 0),
    outstanding: final.reduce((a, r) => a + Number(r.balance_due), 0),
  };
}
