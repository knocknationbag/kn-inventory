import { escapeLike } from "@/lib/validate";

const FRIENDLY = {
  23505: "That name or SKU already exists.",
  23503: "This record is used elsewhere and can't be removed.",
};

// Turns a Supabase/Postgres error into a message that is safe to show to the owner.
export function friendlyError(error, fallback = "Could not save. Please try again.") {
  if (!error) return null;
  const message = String(error.message ?? "");
  if (message.includes("INSUFFICIENT_STOCK")) {
    return "That would take stock below zero. Check quantities that were already sold.";
  }
  console.error("db error", error.code, message);
  return FRIENDLY[error.code] ?? fallback;
}

// Finds a category/supplier/customer by name (case-insensitive) or creates it.
export async function resolveNamed(supabase, table, name) {
  const clean = String(name ?? "").trim();
  if (!clean) return { id: null };

  const find = () => supabase.from(table).select("id").ilike("name", escapeLike(clean)).limit(1).maybeSingle();

  const found = await find();
  if (found.error) return { error: found.error };
  if (found.data) return { id: found.data.id };

  const created = await supabase.from(table).insert({ name: clean }).select("id").single();
  if (created.error?.code === "23505") {
    const again = await find();
    if (again.data) return { id: again.data.id };
  }
  if (created.error) return { error: created.error };
  return { id: created.data.id };
}
