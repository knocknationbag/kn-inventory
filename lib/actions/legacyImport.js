"use server";

import { parseBillsBackup, parseInventoryBackup } from "@/lib/legacy";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 15 * 1024 * 1024;
const RESULT_RE = /^(DRY_RUN_RESULT|IMPORT_BLOCKED):([\s\S]*)$/;

async function readFile(formData, key) {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return { text: null };
  if (file.size > MAX_SIZE) return { error: "That file is too large (over 15 MB)." };
  return { text: await file.text() };
}

async function buildPayloadFromFiles(formData) {
  const inv = await readFile(formData, "inventory_file");
  if (inv.error) return { error: inv.error };
  const bills = await readFile(formData, "bills_file");
  if (bills.error) return { error: bills.error };
  if (!inv.text && !bills.text) return { error: "Choose at least one backup file to import." };

  let invParsed = { products: [], purchases: [], inventory_sales: [], returns: [], skipped: {} };
  if (inv.text) {
    const r = parseInventoryBackup(inv.text);
    if (r.error) return { error: `Inventory backup: ${r.error}` };
    invParsed = r;
  }
  let billsParsed = { bills: [], skipped: 0 };
  if (bills.text) {
    const r = parseBillsBackup(bills.text);
    if (r.error) return { error: `Bills backup: ${r.error}` };
    billsParsed = r;
  }

  const payload = { products: invParsed.products, purchases: invParsed.purchases, inventory_sales: invParsed.inventory_sales, returns: invParsed.returns, bills: billsParsed.bills };
  const counts = payload.products.length + payload.purchases.length + payload.inventory_sales.length + payload.returns.length + payload.bills.length;
  if (counts === 0) return { error: "No usable records were found in the file(s) you chose." };

  return {
    payload,
    preSkipped: { purchases: invParsed.skipped.purchases ?? 0, sales: invParsed.skipped.sales ?? 0, returns: invParsed.skipped.returns ?? 0, bills: billsParsed.skipped },
  };
}

async function callImport(supabase, payload, dryRun) {
  const { data, error } = await supabase.rpc("import_legacy_bundle", { p: payload, p_dry_run: dryRun });
  if (!dryRun && !error) return { result: data };

  const match = RESULT_RE.exec(error?.message ?? "");
  if (!match) return { error: error?.message || "The import could not run. Please try again." };
  let summary;
  try {
    summary = JSON.parse(match[2]);
  } catch {
    return { error: "Could not read the import result." };
  }
  return { preview: summary, blocked: match[1] === "IMPORT_BLOCKED" };
}

// One action for both buttons (name="intent" tells us which was clicked). The browser clears file
// inputs after the Preview submission completes, so Confirm carries the already-parsed payload
// forward in a hidden field instead of depending on the files still being selected.
export async function runLegacyImport(_prev, formData) {
  const intent = formData.get("intent");
  const supabase = await createClient();

  if (intent === "confirm") {
    const raw = formData.get("payload");
    if (typeof raw === "string" && raw) {
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return { error: "The import data was lost. Please preview again." };
      }
      const out = await callImport(supabase, payload, false);
      return out.result ? { result: out.result } : { error: out.error || "The import could not complete. Please preview again." };
    }
  }

  const built = await buildPayloadFromFiles(formData);
  if (built.error) return { error: built.error };

  const dryRun = intent !== "confirm";
  const out = await callImport(supabase, built.payload, dryRun);
  if (out.result) return { result: out.result };
  return { preview: out.preview, blocked: out.blocked, preSkipped: built.preSkipped, payloadJson: dryRun ? JSON.stringify(built.payload) : undefined };
}
