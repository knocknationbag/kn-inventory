import { UUID_RE } from "@/lib/validate";

// Suggests the next invoice number as the highest purely-numeric number so far plus one. Numbers stay
// editable because a GST bill book is often numbered by hand and reconciled outside this app.
export async function suggestGstInvoiceNo(supabase) {
  const { data } = await supabase.from("gst_invoices").select("invoice_no").order("created_at", { ascending: false }).limit(500);
  const numbers = (data ?? []).map((r) => (/^\d+$/.test(r.invoice_no) ? Number(r.invoice_no) : NaN)).filter(Number.isFinite);
  return String((numbers.length ? Math.max(...numbers) : 0) + 1);
}

export async function getGstCustomers(supabase) {
  const { data } = await supabase.from("customers").select("name, phone, gstin, address, state, state_code").order("name").limit(2000);
  return data ?? [];
}

export async function getGstInvoice(supabase, id) {
  if (!UUID_RE.test(id)) return null;
  const { data: invoice } = await supabase.from("gst_invoices").select("*").eq("id", id).maybeSingle();
  if (!invoice) return null;
  const { data: items } = await supabase
    .from("gst_invoice_items")
    .select("id, position, product_id, product_name, item_no, hsn_code, uom, quantity, rate, line_total")
    .eq("invoice_id", id)
    .order("position");
  return { invoice, items: items ?? [] };
}
