import { addDays, eachDay } from "@/lib/dates";
import { fetchAll } from "@/lib/db";
import { getProductStats } from "@/lib/data/products";
import { todayISO } from "@/lib/format";
import { UUID_RE, cleanSearch, isValidDate } from "@/lib/validate";

const num = (v) => Number(v) || 0;

function inRange(query, column, { from, to }) {
  if (isValidDate(from)) query = query.gte(column, from);
  if (isValidDate(to)) query = query.lte(column, to);
  return query;
}

const label = (r) => [r.product_name ?? r.name, r.colour, r.size].filter(Boolean).join(" · ");

// ---------------------------------------------------------------- sales
export async function getSalesDaily(supabase, range) {
  const { data } = await fetchAll(() => inRange(supabase.from("sales_daily").select("*"), "sale_date", range).order("sale_date", { ascending: false }));
  return data ?? [];
}

export function sumSales(rows) {
  const t = { bills: 0, subtotal: 0, discount: 0, gst: 0, grand_total: 0, paid: 0, balance_due: 0 };
  for (const r of rows) for (const k of Object.keys(t)) t[k] += num(r[k]);
  return t;
}

export async function getSalesByProduct(supabase, range) {
  const { data } = await fetchAll(() =>
    inRange(supabase.from("sale_item_details").select("id, product_id, sku, product_name, colour, size, description, quantity, line_total"), "sale_date", range).order("id"),
  );
  const groups = new Map();
  for (const r of data ?? []) {
    const key = r.product_id ?? `custom:${r.description.toLowerCase()}`;
    const g = groups.get(key) ?? { key, sku: r.sku ?? "Custom item", name: r.product_id ? label(r) : r.description, quantity: 0, revenue: 0 };
    g.quantity += r.quantity;
    g.revenue += num(r.line_total);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ ...g, avg_rate: g.quantity ? g.revenue / g.quantity : 0 })).sort((a, b) => b.revenue - a.revenue);
}

export async function getSalesBills(supabase, range) {
  const { data } = await fetchAll(() =>
    inRange(
      supabase.from("sales").select("id, invoice_no, sale_date, customer_name, subtotal, discount_amount, gst_amount, grand_total, previous_due, amount_paid, balance_due, change_amount"),
      "sale_date",
      range,
    )
      .order("sale_date", { ascending: false })
      .order("id"),
  );
  return data ?? [];
}

// ---------------------------------------------------------------- purchases
export async function getPurchasesDaily(supabase, range) {
  const { data } = await fetchAll(() => inRange(supabase.from("purchases_daily").select("*"), "purchase_date", range).order("purchase_date", { ascending: false }));
  return data ?? [];
}

export function sumPurchases(rows) {
  const t = { purchases: 0, units: 0, items_total: 0, transport: 0, grand_total: 0 };
  for (const r of rows) for (const k of Object.keys(t)) t[k] += num(r[k]);
  return t;
}

export async function getPurchasesBySupplier(supabase, range) {
  const { data } = await fetchAll(() =>
    inRange(supabase.from("purchase_overview").select("id, supplier_name, total_qty, items_total, transport_charges, grand_total"), "purchase_date", range).order("id"),
  );
  const groups = new Map();
  for (const r of data ?? []) {
    const name = r.supplier_name ?? "No supplier";
    const g = groups.get(name) ?? { supplier: name, purchases: 0, units: 0, items_total: 0, transport: 0, grand_total: 0 };
    g.purchases += 1;
    g.units += r.total_qty;
    g.items_total += num(r.items_total);
    g.transport += num(r.transport_charges);
    g.grand_total += num(r.grand_total);
    groups.set(name, g);
  }
  return [...groups.values()].sort((a, b) => b.grand_total - a.grand_total);
}

export async function getPurchasesByProduct(supabase, range) {
  const { data } = await fetchAll(() =>
    inRange(supabase.from("purchase_item_details").select("id, product_id, sku, product_name, colour, size, quantity, line_total"), "purchase_date", range).order("id"),
  );
  const groups = new Map();
  for (const r of data ?? []) {
    const g = groups.get(r.product_id) ?? { key: r.product_id, sku: r.sku, name: label(r), quantity: 0, spend: 0 };
    g.quantity += r.quantity;
    g.spend += num(r.line_total);
    groups.set(r.product_id, g);
  }
  return [...groups.values()].map((g) => ({ ...g, avg_rate: g.quantity ? g.spend / g.quantity : 0 })).sort((a, b) => b.spend - a.spend);
}

// ---------------------------------------------------------------- inventory
export async function getInventory(supabase, { q, category, supplier, filter }) {
  const term = cleanSearch(q);
  const { data: products, error } = await fetchAll(() => {
    let query = supabase.from("product_overview").select("*").eq("is_active", filter !== "archived");
    if (filter === "low") query = query.eq("is_low", true);
    if (filter === "out") query = query.lte("current_stock", 0);
    if (category && UUID_RE.test(category)) query = query.eq("category_id", category);
    if (supplier && UUID_RE.test(supplier)) query = query.eq("supplier_id", supplier);
    if (term) {
      const like = `%${term}%`;
      query = query.or(["sku", "name", "colour", "size", "category_name", "supplier_name"].map((c) => `${c}.ilike.${like}`).join(","));
    }
    return query.order("sku").order("id");
  });

  const { data: lines } = await fetchAll(() => supabase.from("sale_item_details").select("id, product_id, quantity, line_total").not("product_id", "is", null).order("id"));
  const sold = new Map();
  for (const l of lines ?? []) {
    const s = sold.get(l.product_id) ?? { qty: 0, value: 0 };
    s.qty += l.quantity;
    s.value += num(l.line_total);
    sold.set(l.product_id, s);
  }

  const rows = (products ?? []).map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    colour: p.colour,
    size: p.size,
    category: p.category_name ?? "",
    supplier: p.supplier_name ?? "",
    opening: p.opening_stock,
    purchased: p.purchased_qty,
    returned: p.returned_qty,
    sold: p.sold_qty,
    stock: p.current_stock,
    purchase_rate: num(p.purchase_rate),
    stock_value: num(p.stock_value),
    sales_value: sold.get(p.id)?.value ?? 0,
    is_low: p.is_low,
  }));
  return { rows, error };
}

export async function getLowStock(supabase) {
  const { data } = await fetchAll(() =>
    supabase.from("product_overview").select("id, sku, name, colour, size, supplier_name, category_name, current_stock, purchase_rate, stock_value").eq("is_active", true).eq("is_low", true).order("current_stock").order("sku"),
  );
  const { data: settings } = await supabase.from("settings").select("low_stock_threshold").maybeSingle();
  return { rows: data ?? [], threshold: settings?.low_stock_threshold ?? 5 };
}

// ---------------------------------------------------------------- stock movement
async function matchProductIds(supabase, q) {
  const term = cleanSearch(q);
  if (!term) return null;
  const like = `%${term}%`;
  const { data } = await supabase.from("products").select("id").or(["sku", "name", "colour", "size"].map((c) => `${c}.ilike.${like}`).join(",")).limit(1000);
  return (data ?? []).map((p) => p.id);
}

const LEDGER_COLUMNS = "source_id, kind, product_id, movement_date, quantity, party, rate, document_id, balance_after, sku, name, colour, size";

function ledgerQuery(supabase, { from, to, q, kind }, options) {
  let query = supabase.from("stock_ledger_details").select(LEDGER_COLUMNS, options);
  query = inRange(query, "movement_date", { from, to });
  if (kind === "sale") query = query.in("kind", ["sale", "gst_sale"]);
  else if (["purchase", "return"].includes(kind)) query = query.eq("kind", kind);
  const term = cleanSearch(q);
  if (term) {
    const like = `%${term}%`;
    query = query.or(["sku", "name", "colour", "party"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  return query;
}

export const LEDGER_PAGE_SIZE = 30;

export async function getLedger(supabase, filters, page) {
  const start = (page - 1) * LEDGER_PAGE_SIZE;
  const { data, count, error } = await ledgerQuery(supabase, filters, { count: "exact" })
    .order("movement_date", { ascending: false })
    .order("sort_order", { ascending: false })
    .order("source_id")
    .range(start, start + LEDGER_PAGE_SIZE - 1);
  return { rows: data ?? [], count: count ?? 0, error };
}

export async function getLedgerAll(supabase, filters) {
  const { data } = await fetchAll(() => ledgerQuery(supabase, filters).order("movement_date", { ascending: false }).order("sort_order", { ascending: false }).order("source_id"));
  return data ?? [];
}

export async function getMovementDaily(supabase, { from, to, q }) {
  const ids = await matchProductIds(supabase, q);
  if (ids && ids.length === 0) return [];
  const { data } = await fetchAll(() => {
    let query = inRange(supabase.from("stock_daily").select("movement_date, product_id, stock_in, stock_out, returned"), "movement_date", { from, to });
    if (ids) query = query.in("product_id", ids);
    return query.order("movement_date", { ascending: false }).order("product_id");
  });
  const days = new Map();
  for (const r of data ?? []) {
    const d = days.get(r.movement_date) ?? { date: r.movement_date, stock_in: 0, returned: 0, stock_out: 0 };
    d.stock_in += r.stock_in;
    d.returned += r.returned;
    d.stock_out += r.stock_out;
    days.set(r.movement_date, d);
  }
  return [...days.values()].map((d) => ({ ...d, net: d.stock_in + d.returned - d.stock_out })).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getStockSummary(supabase, { from, to, q }) {
  const { data } = await supabase.rpc("stock_summary", { p_from: isValidDate(from) ? from : null, p_to: isValidDate(to) ? to : null });
  const term = cleanSearch(q).toLowerCase();
  return (data ?? [])
    .filter((r) => r.is_active || r.stock_in || r.stock_out || r.returned || r.closing_balance)
    .filter((r) => !term || `${r.sku} ${r.name} ${r.colour} ${r.size}`.toLowerCase().includes(term))
    .map((r) => ({ ...r, label: [r.name, r.colour, r.size].filter(Boolean).join(" · ") }))
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

// ---------------------------------------------------------------- dashboard
export async function getDashboard(supabase) {
  const today = todayISO();
  const from = addDays(today, -13);

  const [{ stats }, salesDaily, purchasesToday, recentBills, recentPurchases, lowStock, settings] = await Promise.all([
    getProductStats(supabase),
    fetchAll(() => supabase.from("sales_daily").select("sale_date, bills, grand_total, balance_due").order("sale_date")),
    supabase.from("purchases_daily").select("purchases, units, grand_total").eq("purchase_date", today).maybeSingle(),
    supabase.from("sales").select("id, invoice_no, sale_date, customer_name, grand_total, amount_paid, balance_due").order("sale_date", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    supabase.from("purchase_overview").select("id, purchase_date, supplier_name, item_count, total_qty, grand_total").order("purchase_date", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    supabase.from("product_overview").select("id, sku, name, colour, size, current_stock, supplier_name").eq("is_active", true).eq("is_low", true).order("current_stock").order("sku").limit(6),
    supabase.from("settings").select("low_stock_threshold").maybeSingle(),
  ]);

  const rows = salesDaily.data ?? [];
  const byDay = new Map(rows.map((r) => [r.sale_date, r]));
  const totals = rows.reduce((a, r) => ({ sales: a.sales + num(r.grand_total), outstanding: a.outstanding + num(r.balance_due), bills: a.bills + r.bills }), { sales: 0, outstanding: 0, bills: 0 });

  return {
    today,
    stats: stats ?? { products: 0, units: 0, value: 0, low: 0 },
    totalSales: totals.sales,
    outstanding: totals.outstanding,
    billCount: totals.bills,
    todaySales: num(byDay.get(today)?.grand_total),
    todayBills: byDay.get(today)?.bills ?? 0,
    todayPurchases: num(purchasesToday.data?.grand_total),
    todayPurchaseCount: purchasesToday.data?.purchases ?? 0,
    chart: eachDay(from, today).map((date) => ({ date, value: num(byDay.get(date)?.grand_total), bills: byDay.get(date)?.bills ?? 0 })),
    recentBills: recentBills.data ?? [],
    recentPurchases: recentPurchases.data ?? [],
    lowStock: lowStock.data ?? [],
    threshold: settings.data?.low_stock_threshold ?? 5,
  };
}

// ---------------------------------------------------------------- sold items by date
const SOLD_COLUMNS =
  "id, bill_type, sold_on, bill_id, bill_no, customer_name, customer_mobile, product_id, sku, product_name, colour, size, description, quantity, rate, line_total";

// What sold on one exact date, Normal Bills and finalized GST invoices together. Never a draft.
export async function getSoldByDate(supabase, date) {
  if (!isValidDate(date)) return { rows: [] };
  const { data, error } = await fetchAll(() =>
    supabase.from("sold_items_by_date").select(SOLD_COLUMNS).eq("sold_on", date).order("bill_no").order("id"),
  );
  return { rows: data ?? [], error };
}

export function sumSoldItems(rows) {
  const bills = new Set(rows.map((r) => `${r.bill_type}:${r.bill_id}`));
  return {
    products: new Set(rows.map((r) => r.product_id ?? r.description)).size,
    bills: bills.size,
    quantity: rows.reduce((a, r) => a + num(r.quantity), 0),
    total: rows.reduce((a, r) => a + num(r.line_total), 0),
  };
}
