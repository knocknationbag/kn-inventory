"use server";

import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { readNumber, readText } from "@/lib/validate";

export async function updateShopSettings(_prev, formData) {
  const fieldErrors = {};
  const values = {
    shop_name: readText(formData, "shop_name", 120),
    phones: readText(formData, "phones", 100),
    address: readText(formData, "address", 500),
    gst_number: readText(formData, "gst_number", 30),
    invoice_prefix: readText(formData, "invoice_prefix", 10),
    next_invoice_no: readNumber(formData, "next_invoice_no", { label: "Next bill number", min: 1, max: 999999, integer: true, fallback: 1 }, fieldErrors),
    default_gst_rate: readNumber(formData, "default_gst_rate", { label: "Default GST %", max: 100 }, fieldErrors),
    low_stock_threshold: readNumber(formData, "low_stock_threshold", { label: "Low stock alert level", integer: true, max: 100000 }, fieldErrors),
  };
  if (!values.shop_name) fieldErrors.shop_name = "Shop name is required.";
  if (!values.invoice_prefix) fieldErrors.invoice_prefix = "Invoice prefix is required.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const nextInvoiceNo = `${values.invoice_prefix}${String(values.next_invoice_no).padStart(4, "0")}`;
  const { count } = await supabase.from("sales").select("id", { count: "exact", head: true }).eq("invoice_no", nextInvoiceNo);
  if (count) {
    return { fieldErrors: { next_invoice_no: `Bill ${nextInvoiceNo} already exists. Choose a higher number.` }, values };
  }

  const { error } = await supabase.from("settings").update(values).eq("id", true);
  if (error) return { error: friendlyError(error), values };
  revalidatePath("/settings/shop");
  return { values, success: true };
}

export async function changePassword(_prev, formData) {
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current) return { error: "Enter your current password." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };
  if (next === current) return { error: "New password must be different from the current one." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Your session has expired. Please sign in again." };

  const check = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (check.error) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: "Could not change the password. Please try again." };
  return { success: true };
}
