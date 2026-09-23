import { countGstDrafts, exportTotals, listFinalGstInvoices } from "@/lib/data/gstExport";

const paise = (n) => Math.round((Number(n) || 0) * 100);

// Everything the GST overview shows, for finalized invoices in a date range. Drafts are counted, never summed.
export async function getGstOverview(supabase, range) {
  const [{ rows, error }, drafts] = await Promise.all([listFinalGstInvoices(supabase, range), countGstDrafts(supabase, range)]);
  if (error) return { error };

  const totals = exportTotals(rows);
  const outstanding = rows.reduce((a, r) => a + paise(r.balance_due), 0) / 100;
  const unpaid = rows.filter((r) => Number(r.balance_due) > 0).length;

  const byBuyer = new Map();
  for (const r of rows) {
    const name = (r.customer_name || "").trim() || "Unnamed buyer";
    const key = name.toLowerCase();
    const entry = byBuyer.get(key) ?? { name, invoices: 0, total: 0 };
    entry.invoices += 1;
    entry.total += paise(r.grand_total);
    byBuyer.set(key, entry);
  }
  const topBuyers = [...byBuyer.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((b) => ({ ...b, total: b.total / 100 }));

  // Rows come back oldest first; the newest few are the "recent" list.
  const recent = rows.slice(-5).reverse();

  return { count: rows.length, drafts, totals, outstanding, unpaid, topBuyers, recent };
}
