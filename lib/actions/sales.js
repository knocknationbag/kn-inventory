"use server";

import { redirect } from "next/navigation";
import { friendlyError } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, isValidDate, readDate, readNumber, readText } from "@/lib/validate";

// "INSUFFICIENT_STOCK: KN-101 would go to -3"  ->  "Not enough stock for KN-101: 3 short."
function stockMessage(error) {
  const match = /INSUFFICIENT_STOCK: (.+) would go to (-?\d+)/.exec(String(error?.message ?? ""));
  if (!match) return "Not enough stock for one of the items.";
  return `Not enough stock for ${match[1]}: ${Math.abs(Number(match[2]))} short. Lower the quantity or record a purchase first.`;
}

function parseBillLines(raw) {
  let list;
  try {
    list = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { error: "The items could not be read. Please try again." };
  }
  if (!Array.isArray(list) || list.length === 0) return { error: "Add at least one item to the bill." };
  if (list.length > 100) return { error: "A bill can have at most 100 items." };

  const items = [];
  for (const [i, line] of list.entries()) {
    const n = i + 1;
    const description = String(line.description ?? "").trim().slice(0, 200);
    const quantity = Number(line.quantity);
    const rate = line.rate === "" || line.rate == null ? 0 : Number(line.rate);
    const productId = line.product_id ? String(line.product_id) : null;
    const lineDate = line.line_date ? String(line.line_date) : null;

    if (line.kind === "stock" && !(productId && UUID_RE.test(productId))) return { error: `Item ${n}: choose a product, or switch it to a custom item.` };
    if (!description) return { error: `Item ${n}: enter a description.` };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1e6) return { error: `Item ${n}: quantity must be a whole number of 1 or more.` };
    if (!Number.isFinite(rate) || rate < 0 || rate > 1e7) return { error: `Item ${n}: rate must be 0 or more.` };
    if (lineDate && !isValidDate(lineDate)) return { error: `Item ${n}: the item date is not valid.` };

    items.push({
      product_id: line.kind === "stock" ? productId : null,
      description,
      quantity,
      rate,
      line_date: lineDate,
    });
  }
  return { items };
}

export async function saveSale(_prev, formData) {
  const fieldErrors = {};
  const id = readText(formData, "id", 40);
  if (id && !UUID_RE.test(id)) return { error: "Bill not found." };

  const values = {
    sale_date: readDate(formData, "sale_date", fieldErrors, "Bill date"),
    customer_name: readText(formData, "customer_name", 100),
    discount_rate: readNumber(formData, "discount_rate", { label: "Discount %", max: 100 }, fieldErrors),
    gst_rate: readNumber(formData, "gst_rate", { label: "GST %", max: 100 }, fieldErrors),
    previous_due: readNumber(formData, "previous_due", { label: "Previous due", max: 1e9 }, fieldErrors),
    amount_paid: readNumber(formData, "amount_paid", { label: "Amount paid", max: 1e9 }, fieldErrors),
    notes: readText(formData, "notes", 500),
  };
  const parsed = parseBillLines(formData.get("items"));
  if (parsed.error) fieldErrors.items = parsed.error;
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { data: savedId, error } = await supabase.rpc("save_sale", { p: { id: id || null, ...values, items: parsed.items } });
  if (error) {
    if (String(error.message).includes("INSUFFICIENT_STOCK")) return { error: stockMessage(error), values };
    return { error: friendlyError(error, "Could not save the bill. Please try again."), values };
  }
  redirect(`/sales/${savedId}?notice=bill_saved`);
}

export async function deleteSale(_prev, formData) {
  const id = readText(formData, "id", 40);
  if (!UUID_RE.test(id)) return { error: "Bill not found." };

  const supabase = await createClient();
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) return { error: friendlyError(error, "Could not delete the bill.") };
  redirect("/sales?notice=bill_deleted");
}
