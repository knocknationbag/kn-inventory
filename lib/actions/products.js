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
  };
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
