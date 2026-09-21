"use server";

import { redirect } from "next/navigation";
import { RETURN_REASONS } from "@/lib/constants";
import { friendlyError } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, readDate, readNumber, readText } from "@/lib/validate";

const STOCK_CONFLICT =
  "That would take stock below zero: those bags have already been sold again. Adjust the later sales first.";

export async function saveReturn(_prev, formData) {
  const fieldErrors = {};
  const id = readText(formData, "id", 40);
  if (id && !UUID_RE.test(id)) return { error: "Return not found." };

  const values = {
    return_date: readDate(formData, "return_date", fieldErrors),
    product_id: readText(formData, "product_id", 40),
    quantity: readNumber(formData, "quantity", { label: "Quantity", min: 1, max: 1e6, integer: true, fallback: 0 }, fieldErrors),
    reason: readText(formData, "reason", 30),
    restock: readText(formData, "restock", 5) === "on",
    notes: readText(formData, "notes", 500),
  };
  if (!UUID_RE.test(values.product_id)) fieldErrors.product_id = "Choose a product.";
  if (!values.quantity && !fieldErrors.quantity) fieldErrors.quantity = "Enter how many came back.";
  if (!RETURN_REASONS.some((r) => r.value === values.reason)) fieldErrors.reason = "Choose a reason.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_return", { p: { id: id || null, ...values } });
  if (error) {
    if (String(error.message).includes("INSUFFICIENT_STOCK")) return { error: STOCK_CONFLICT, values };
    return { error: friendlyError(error), values };
  }
  redirect("/returns?notice=return_saved");
}

export async function deleteReturn(_prev, formData) {
  const id = readText(formData, "id", 40);
  if (!UUID_RE.test(id)) return { error: "Return not found." };

  const supabase = await createClient();
  const { error } = await supabase.from("returns").delete().eq("id", id);
  if (error) {
    if (String(error.message).includes("INSUFFICIENT_STOCK")) return { error: STOCK_CONFLICT };
    return { error: friendlyError(error, "Could not delete the return.") };
  }
  redirect("/returns?notice=return_deleted");
}
