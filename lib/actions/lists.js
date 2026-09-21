"use server";

import { redirect } from "next/navigation";
import { friendlyError } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { UUID_RE, readText } from "@/lib/validate";

const KINDS = {
  categories: { path: "/products/categories", label: "Category", fields: ["name"] },
  suppliers: { path: "/products/suppliers", label: "Supplier", fields: ["name", "phone", "notes"] },
};

export async function saveListItem(_prev, formData) {
  const kind = readText(formData, "kind", 20);
  const config = KINDS[kind];
  if (!config) return { error: "Unknown list." };

  const id = readText(formData, "id", 40);
  const values = {
    name: readText(formData, "name", 80),
    ...(kind === "suppliers" ? { phone: readText(formData, "phone", 30) || null, notes: readText(formData, "notes", 300) || null } : {}),
  };
  if (!values.name) return { error: `${config.label} name is required.`, values };

  const supabase = await createClient();
  const result = id
    ? UUID_RE.test(id)
      ? await supabase.from(kind).update(values).eq("id", id).select("id")
      : { error: { message: "bad id" } }
    : await supabase.from(kind).insert(values).select("id");

  if (result.error) {
    if (result.error.code === "23505") return { error: `A ${config.label.toLowerCase()} named "${values.name}" already exists.`, values };
    return { error: friendlyError(result.error), values };
  }
  redirect(`${config.path}?notice=list_saved`);
}

export async function deleteListItem(_prev, formData) {
  const kind = readText(formData, "kind", 20);
  const config = KINDS[kind];
  const id = readText(formData, "id", 40);
  if (!config || !UUID_RE.test(id)) return { error: "Item not found." };

  const supabase = await createClient();

  // Purchases keep only a link to the supplier, so a supplier with purchases must stay.
  if (kind === "suppliers") {
    const { count } = await supabase.from("purchases").select("id", { count: "exact", head: true }).eq("supplier_id", id);
    if (count) return { error: `This supplier has ${count} purchase${count === 1 ? "" : "s"} on record, so it can't be deleted.` };
  }

  const { error } = await supabase.from(kind).delete().eq("id", id);
  if (error) return { error: friendlyError(error, "Could not delete.") };
  redirect(`${config.path}?notice=list_deleted`);
}
