"use server";

import { redirect } from "next/navigation";
import { friendlyError } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, parseLines, readDate, readNumber, readText } from "@/lib/validate";

const STOCK_CONFLICT =
  "Some of these bags have already been sold or returned out, so stock would go below zero. Adjust those first.";

export async function savePurchase(_prev, formData) {
  const fieldErrors = {};
  const id = readText(formData, "id", 40);
  if (id && !UUID_RE.test(id)) return { error: "Purchase not found." };

  const values = {
    purchase_date: readDate(formData, "purchase_date", fieldErrors),
    supplier_name: readText(formData, "supplier_name", 80),
    transport_charges: readNumber(formData, "transport_charges", { label: "Transport charges", max: 1e7 }, fieldErrors),
    notes: readText(formData, "notes", 500),
  };
  const updateRates = readText(formData, "update_rates", 5) === "on";
  const parsed = parseLines(formData.get("items"));
  if (parsed.error) fieldErrors.items = parsed.error;
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { data: savedId, error } = await supabase.rpc("save_purchase", {
    p: { id: id || null, ...values, items: parsed.items },
  });
  if (error) {
    if (String(error.message).includes("INSUFFICIENT_STOCK")) return { error: STOCK_CONFLICT, values };
    return { error: friendlyError(error), values };
  }

  if (updateRates) {
    const latest = new Map(parsed.items.map((i) => [i.product_id, i.rate]));
    await Promise.all([...latest].map(([productId, rate]) => supabase.from("products").update({ purchase_rate: rate }).eq("id", productId)));
  }

  redirect(`/purchases/${savedId}?notice=purchase_saved`);
}

export async function deletePurchase(_prev, formData) {
  const id = readText(formData, "id", 40);
  if (!UUID_RE.test(id)) return { error: "Purchase not found." };

  const supabase = await createClient();
  const { error } = await supabase.from("purchases").delete().eq("id", id);
  if (error) {
    if (String(error.message).includes("INSUFFICIENT_STOCK")) return { error: STOCK_CONFLICT };
    return { error: friendlyError(error, "Could not delete the purchase.") };
  }
  redirect("/purchases?notice=purchase_deleted");
}
