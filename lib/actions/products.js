"use server";

import { redirect } from "next/navigation";
import { friendlyError, resolveNamed } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, readNumber, readText } from "@/lib/validate";

function parseProduct(formData) {
  const fieldErrors = {};
  const values = {
    sku: readText(formData, "sku", 60),
    name: readText(formData, "name", 120),
    colour: readText(formData, "colour", 40),
    size: readText(formData, "size", 40),
    category: readText(formData, "category", 60),
    supplier: readText(formData, "supplier", 80),
    opening_stock: readNumber(formData, "opening_stock", { label: "Opening stock", integer: true, max: 1e7 }, fieldErrors),
    purchase_rate: readNumber(formData, "purchase_rate", { label: "Purchase rate", max: 1e7 }, fieldErrors),
    selling_rate: readNumber(formData, "selling_rate", { label: "Selling rate", max: 1e7 }, fieldErrors),
    gst_rate: readNumber(formData, "gst_rate", { label: "GST %", max: 100 }, fieldErrors),
    hsn_code: readText(formData, "hsn_code", 20),
  };
  if (values.hsn_code && !/^\d{4,8}$/.test(values.hsn_code)) fieldErrors.hsn_code = "HSN code is 4 to 8 digits, e.g. 4202.";
  if (!values.sku) fieldErrors.sku = "SKU / model is required.";
  return { values, fieldErrors };
}

async function buildRow(supabase, values) {
  const category = await resolveNamed(supabase, "categories", values.category);
  if (category.error) return { error: category.error };
  const supplier = await resolveNamed(supabase, "suppliers", values.supplier);
  if (supplier.error) return { error: supplier.error };

  return {
    row: {
      sku: values.sku,
      name: values.name,
      colour: values.colour,
      size: values.size,
      category_id: category.id,
      supplier_id: supplier.id,
      opening_stock: values.opening_stock,
      purchase_rate: values.purchase_rate,
      selling_rate: values.selling_rate,
      gst_rate: values.gst_rate,
      hsn_code: values.hsn_code || null,
    },
  };
}

export async function createProduct(_prev, formData) {
  const { values, fieldErrors } = parseProduct(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const built = await buildRow(supabase, values);
  if (built.error) return { error: friendlyError(built.error), values };

  const { error } = await supabase.from("products").insert(built.row);
  if (error) {
    if (error.code === "23505") return { fieldErrors: { sku: `SKU "${values.sku}" already exists.` }, values };
    return { error: friendlyError(error), values };
  }
  redirect("/products?notice=product_created");
}

export async function updateProduct(_prev, formData) {
  const id = readText(formData, "id", 40);
  if (!UUID_RE.test(id)) return { error: "Product not found." };

  const { values, fieldErrors } = parseProduct(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const built = await buildRow(supabase, values);
  if (built.error) return { error: friendlyError(built.error), values };

  const { data, error } = await supabase.from("products").update(built.row).eq("id", id).select("id");
  if (error) {
    if (error.code === "23505") return { fieldErrors: { sku: `SKU "${values.sku}" already exists.` }, values };
    if (String(error.message).includes("INSUFFICIENT_STOCK")) {
      return {
        fieldErrors: { opening_stock: "Opening stock is too low: more has already been sold than this allows." },
        values,
      };
    }
    return { error: friendlyError(error), values };
  }
  if (!data?.length) return { error: "Product not found.", values };
  redirect(`/products/${id}?notice=product_updated`);
}

export async function setProductActive(_prev, formData) {
  const id = readText(formData, "id", 40);
  const active = readText(formData, "active", 5) === "true";
  if (!UUID_RE.test(id)) return { error: "Product not found." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").update({ is_active: active }).eq("id", id).select("id");
  if (error || !data?.length) return { error: friendlyError(error, "Could not update the product.") };
  redirect(active ? `/products/${id}?notice=product_restored` : "/products?notice=product_archived");
}

// Saves a new top-to-bottom order for the products on screen. The database swaps them among the positions
// they already hold, so products that are hidden (other pages, filters) keep their exact place.
export async function reorderProducts(ids) {
  const valid = Array.isArray(ids) && ids.length > 0 && ids.length <= 500 && ids.every((id) => typeof id === "string" && UUID_RE.test(id)) && new Set(ids).size === ids.length;
  if (!valid) return { error: "Could not save the order. Please refresh the page and try again." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_products", { p_ids: ids });
  if (error) {
    if (String(error.message).includes("PRODUCT_NOT_FOUND")) return { error: "A product on this page was removed. Please refresh the page." };
    return { error: friendlyError(error, "Could not save the new order. Please try again.") };
  }
  return { ok: true };
}

export async function deleteProduct(_prev, formData) {
  const id = readText(formData, "id", 40);
  if (!UUID_RE.test(id)) return { error: "Product not found." };

  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return { error: "This product has purchases, bills or returns, so it can't be deleted. Archive it instead." };
    }
    return { error: friendlyError(error, "Could not delete the product.") };
  }
  redirect("/products?notice=product_deleted");
}
