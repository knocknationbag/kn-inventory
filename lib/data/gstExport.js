import { fetchAll } from "@/lib/db";
import { isValidDate } from "@/lib/validate";

const COLUMNS = "id, invoice_no, invoice_date, customer_name, customer_gstin, taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total, balance_due";

function inRange(query, { from, to }) {
  if (isValidDate(from)) query = query.gte("invoice_date", from);
  if (isValidDate(to)) query = query.lte("invoice_date", to);
  return query;
}

// Strict ascending order for a return filing: date first, then invoice number (numeric where possible).
const byDateThenNumber = (a, b) => {
  if (a.invoice_date !== b.invoice_date) return a.invoice_date < b.invoice_date ? -1 : 1;
  return String(a.invoice_no).localeCompare(String(b.invoice_no), undefined, { numeric: true });
};

// Finalized invoices only: a draft is not a sale yet and must never reach the CA.
export async function listFinalGstInvoices(supabase, range) {
  const { data, error } = await fetchAll(() => inRange(supabase.from("gst_invoices").select(COLUMNS).eq("status", "final"), range).order("id"));
  return { rows: (data ?? []).sort(byDateThenNumber), error };
}

export async function countGstDrafts(supabase, range) {
  const { count } = await inRange(supabase.from("gst_invoices").select("id", { count: "exact", head: true }).eq("status", "draft"), range);
  return count ?? 0;
}

const paise = (n) => Math.round((Number(n) || 0) * 100);

export function exportTotals(rows) {
  const sum = (key) => rows.reduce((a, r) => a + paise(r[key]), 0) / 100;
  return {
    taxable: sum("taxable_amount"),
    cgst: sum("cgst_amount"),
    sgst: sum("sgst_amount"),
    igst: sum("igst_amount"),
    total: sum("grand_total"),
  };
}

// Every finalized invoice in the range with its lines, for the consolidated PDF.
export async function getFinalGstInvoicesWithItems(supabase, range) {
  const { data, error } = await fetchAll(() => inRange(supabase.from("gst_invoices").select("*").eq("status", "final"), range).order("id"));
  if (error) return { error };
  const invoices = data.sort(byDateThenNumber);

  const itemsByInvoice = new Map();
  for (let i = 0; i < invoices.length; i += 100) {
    const ids = invoices.slice(i, i + 100).map((inv) => inv.id);
    const { data: items, error: itemsError } = await fetchAll(() =>
      supabase.from("gst_invoice_items").select("id, invoice_id, position, product_id, product_name, item_no, hsn_code, uom, quantity, rate, line_total").in("invoice_id", ids).order("id"),
    );
    if (itemsError) return { error: itemsError };
    for (const item of items) {
      if (!itemsByInvoice.has(item.invoice_id)) itemsByInvoice.set(item.invoice_id, []);
      itemsByInvoice.get(item.invoice_id).push(item);
    }
  }
  return { invoices: invoices.map((inv) => ({ ...inv, items: (itemsByInvoice.get(inv.id) ?? []).sort((a, b) => a.position - b.position) })) };
}
