"use server";

import { redirect } from "next/navigation";
import { friendlyError } from "@/lib/db";
import { GSTIN_RE, computeGstTotals, gstinStateCode, stateByCode, stateByName } from "@/lib/gst";
import { getGstInvoice } from "@/lib/data/gstInvoices";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, isValidDate, readNumber, readText } from "@/lib/validate";

function stockMessage(error) {
  const match = /INSUFFICIENT_STOCK: (.+) would go to (-?\d+)/.exec(String(error?.message ?? ""));
  if (!match) return "Not enough stock for one of the items.";
  return `Not enough stock for ${match[1]}: ${Math.abs(Number(match[2]))} short. Lower the quantity or record a purchase first.`;
}

// Lines left completely blank are ignored; a half-filled line is an error. Draft or final, the rules are
// the same, only "at least one item" is enforced later and only when finalizing.
function parseInvoiceLines(raw) {
  let list;
  try {
    list = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { error: "The items could not be read. Please try again." };
  }
  if (!Array.isArray(list)) return { error: "The items could not be read. Please try again." };
  if (list.length > 100) return { error: "An invoice can have at most 100 items." };

  const items = [];
  for (const [i, line] of list.entries()) {
    const n = i + 1;
    const stock = line.kind === "stock";
    const productId = stock && line.product_id ? String(line.product_id) : null;
    const name = String(line.product_name ?? "").trim().slice(0, 200);
    const hsn = String(line.hsn_code ?? "").trim().slice(0, 8);
    const itemNo = String(line.item_no ?? "").trim().slice(0, 40);
    const uom = String(line.uom ?? "").trim().slice(0, 10) || "Pcs";
    const blank = !productId && !name && !hsn && !itemNo && !String(line.rate ?? "").trim();
    if (blank) continue;

    const quantity = Number(line.quantity);
    const rate = line.rate === "" || line.rate == null ? 0 : Number(line.rate);
    if (stock && !(productId && UUID_RE.test(productId))) return { error: `Item ${n}: choose a product, or switch it to a custom item.` };
    if (!stock && !name) return { error: `Item ${n}: enter a product name.` };
    if (hsn && !/^\d{4,8}$/.test(hsn)) return { error: `Item ${n}: HSN/ACS code must be 4 to 8 digits.` };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1e6) return { error: `Item ${n}: quantity must be a whole number of 1 or more.` };
    if (!Number.isFinite(rate) || rate < 0 || rate > 1e7) return { error: `Item ${n}: rate must be 0 or more.` };

    items.push({ product_id: productId, product_name: name, item_no: itemNo, hsn_code: hsn, uom, quantity, rate });
  }
  return { items };
}

export async function saveGstInvoice(_prev, formData) {
  const fieldErrors = {};
  const id = readText(formData, "id", 40);
  if (id && !UUID_RE.test(id)) return { error: "Invoice not found." };
  const finalize = readText(formData, "intent", 10) === "final";

  const invoiceDate = readText(formData, "invoice_date", 10);
  const dateOfSupply = readText(formData, "date_of_supply", 10);
  const supplyState = stateByName(readText(formData, "supply_state", 60));
  const customerState = stateByName(readText(formData, "customer_state", 60));
  const placeState = stateByCode(readText(formData, "place_of_supply_state_code", 2));
  const taxType = readText(formData, "tax_type", 5) === "inter" ? "inter" : "intra";

  const values = {
    id: id || null,
    invoice_no: readText(formData, "invoice_no", 30),
    status: finalize ? "final" : "draft",
    invoice_date: invoiceDate,
    reverse_charge: readText(formData, "reverse_charge", 3) === "Yes",
    supply_state: supplyState?.name ?? "",
    supply_state_code: supplyState?.code ?? "",
    transport_mode: readText(formData, "transport_mode", 40),
    vehicle_number: readText(formData, "vehicle_number", 20).toUpperCase(),
    date_of_supply: dateOfSupply,
    place_of_supply: readText(formData, "place_of_supply", 100),
    place_of_supply_state_code: placeState?.code ?? "",
    customer_name: readText(formData, "customer_name", 120),
    customer_gstin: readText(formData, "customer_gstin", 15).toUpperCase(),
    customer_mobile: readText(formData, "customer_mobile", 20),
    customer_address: readText(formData, "customer_address", 500),
    customer_state: customerState?.name ?? "",
    customer_state_code: customerState?.code ?? "",
    tax_type: taxType,
    cgst_rate: readNumber(formData, "cgst_rate", { label: "CGST %", max: 100, fallback: 0 }, fieldErrors),
    sgst_rate: readNumber(formData, "sgst_rate", { label: "SGST %", max: 100, fallback: 0 }, fieldErrors),
    igst_rate: readNumber(formData, "igst_rate", { label: "IGST %", max: 100, fallback: 0 }, fieldErrors),
    amount_paid: readNumber(formData, "amount_paid", { label: "Amount paid", max: 1e9 }, fieldErrors),
    notes: readText(formData, "notes", 500),
  };

  if (!values.invoice_no) fieldErrors.invoice_no = "Invoice number is required.";
  if (invoiceDate && !isValidDate(invoiceDate)) fieldErrors.invoice_date = "Enter a valid invoice date.";
  if (dateOfSupply && !isValidDate(dateOfSupply)) fieldErrors.date_of_supply = "Enter a valid date of supply.";
  if (!supplyState) fieldErrors.supply_state = "Choose the supplier state.";
  if (!customerState) fieldErrors.customer_state = "Choose the buyer state.";
  if (values.customer_gstin && !GSTIN_RE.test(values.customer_gstin)) fieldErrors.customer_gstin = "Enter a valid 15-character GSTIN, e.g. 27ABCDE1234F1Z5.";
  else if (values.customer_gstin && customerState && gstinStateCode(values.customer_gstin) !== customerState.code) {
    fieldErrors.customer_gstin = `This GSTIN starts with ${gstinStateCode(values.customer_gstin)}, which is not ${customerState.name} (${customerState.code}).`;
  }

  const parsed = parseInvoiceLines(formData.get("items"));
  if (parsed.error) fieldErrors.items = parsed.error;

  if (finalize) {
    if (!invoiceDate) fieldErrors.invoice_date = "Invoice date is required to finalize.";
    if (!values.customer_name) fieldErrors.customer_name = "Buyer name is required to finalize.";
    if (parsed.items && parsed.items.length === 0) fieldErrors.items = "Add at least one item before finalizing.";
    if (parsed.items?.length) {
      const totals = computeGstTotals({ lines: parsed.items, taxType, cgstRate: values.cgst_rate, sgstRate: values.sgst_rate, igstRate: values.igst_rate, paid: values.amount_paid });
      if (values.amount_paid > totals.grand) fieldErrors.amount_paid = "Amount paid cannot be more than the invoice total.";
    }
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { data: savedId, error } = await supabase.rpc("save_gst_invoice", { p: { ...values, items: parsed.items } });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { invoice_no: `Invoice number ${values.invoice_no} already exists. Use a different number.` }, values };
    if (String(error.message).includes("INSUFFICIENT_STOCK")) return { error: stockMessage(error), values };
    return { error: friendlyError(error, "Could not save the invoice. Please try again."), values };
  }
  redirect(`/sales/gst/${savedId}?notice=${finalize ? "gst_saved" : "gst_draft_saved"}`);
}

export async function finalizeGstInvoice(_prev, formData) {
  const id = readText(formData, "id", 40);
  if (!UUID_RE.test(id)) return { error: "Invoice not found." };

  const supabase = await createClient();
  const found = await getGstInvoice(supabase, id);
  if (!found) return { error: "Invoice not found." };
  const { invoice, items } = found;
  if (invoice.status === "final") redirect(`/sales/gst/${id}`);

  if (!invoice.customer_name) return { error: "Add the buyer's name first. Use Edit." };
  if (items.length === 0) return { error: "Add at least one item first. Use Edit." };
  if (invoice.customer_gstin && !GSTIN_RE.test(invoice.customer_gstin)) return { error: "The buyer GSTIN is not valid. Use Edit." };
  if (invoice.customer_gstin && gstinStateCode(invoice.customer_gstin) !== invoice.customer_state_code) return { error: "The buyer GSTIN does not match the buyer state. Use Edit." };
  if (Number(invoice.amount_paid) > Number(invoice.grand_total)) return { error: "Amount paid is more than the invoice total. Use Edit." };

  const payload = {
    ...invoice,
    status: "final",
    items: items.map((i) => ({ product_id: i.product_id, product_name: i.product_name, item_no: i.item_no, hsn_code: i.hsn_code, uom: i.uom, quantity: i.quantity, rate: i.rate })),
  };
  const { error } = await supabase.rpc("save_gst_invoice", { p: payload });
  if (error) {
    if (String(error.message).includes("INSUFFICIENT_STOCK")) return { error: stockMessage(error) };
    return { error: friendlyError(error, "Could not finalize the invoice. Please try again.") };
  }
  redirect(`/sales/gst/${id}?notice=gst_saved`);
}

export async function deleteGstInvoice(_prev, formData) {
  const id = readText(formData, "id", 40);
  if (!UUID_RE.test(id)) return { error: "Invoice not found." };

  const supabase = await createClient();
  const { error } = await supabase.from("gst_invoices").delete().eq("id", id);
  if (error) return { error: friendlyError(error, "Could not delete the invoice.") };
  redirect("/sales?type=gst&notice=gst_deleted");
}
