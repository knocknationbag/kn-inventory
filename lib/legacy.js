import { isValidDate } from "@/lib/validate";

const RETURN_TYPE_MAP = {
  "Customer Return": "customer_return",
  "RTO / Delivery Failure": "rto",
  "Defective / Damaged": "defective",
};

const str = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const safeDate = (v) => {
  const s = str(v, 10);
  return isValidDate(s) ? s : null;
};

// The old inventory app's export: { products, purchases, sales, returns }.
export function parseInventoryBackup(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: "This file is not valid JSON." };
  }
  if (!data || !Array.isArray(data.products) || !Array.isArray(data.purchases) || !Array.isArray(data.sales) || !Array.isArray(data.returns)) {
    return { error: "This doesn't look like an inventory backup. It should have products, purchases, sales and returns lists." };
  }

  const products = data.products
    .filter((p) => str(p.sku))
    .map((p) => ({
      sku: str(p.sku, 60),
      name: str(p.name, 120),
      colour: str(p.color ?? p.colour, 40),
      size: str(p.size, 40),
      opening: Math.max(0, Math.trunc(num(p.opening))),
      rate: Math.max(0, num(p.rate)),
      gst: Math.min(100, Math.max(0, num(p.gst))),
      supplier: str(p.supplier, 80),
    }));

  const purchases = data.purchases
    .map((p) => ({ date: safeDate(p.date), sku: str(p.sku, 60), qty: Math.trunc(num(p.qty)), rate: Math.max(0, num(p.rate)), supplier: str(p.supplier, 80), transport: Math.max(0, num(p.transport)) }))
    .filter((p) => p.date && p.sku && p.qty > 0);

  const inventory_sales = data.sales
    .map((s) => ({ date: safeDate(s.date), sku: str(s.sku, 60), qty: Math.trunc(num(s.qty)), rate: Math.max(0, num(s.rate)), customer: str(s.customer, 100) }))
    .filter((s) => s.date && s.sku && s.qty > 0);

  const returns = data.returns
    .map((r) => ({ date: safeDate(r.date), sku: str(r.sku, 60), qty: Math.trunc(num(r.qty)), type: RETURN_TYPE_MAP[str(r.type)] }))
    .filter((r) => r.date && r.sku && r.qty > 0 && r.type);

  return {
    products,
    purchases,
    inventory_sales,
    returns,
    skipped: {
      purchases: data.purchases.length - purchases.length,
      sales: data.sales.length - inventory_sales.length,
      returns: data.returns.length - returns.length,
    },
  };
}

// The old billing app kept no export button; the settings page gives a snippet that downloads
// { bills, lastBillNo } in this shape.
export function parseBillsBackup(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: "This file is not valid JSON." };
  }
  const list = Array.isArray(data?.bills) ? data.bills : Array.isArray(data) ? data : null;
  if (!list) return { error: "This doesn't look like a bills backup. It should have a 'bills' list." };

  const bills = [];
  let skipped = 0;
  for (const b of list) {
    const bill_no = str(b.billNo, 40);
    const date = safeDate(b.date);
    if (!bill_no || !date) {
      skipped += 1;
      continue;
    }
    let lastDate = date;
    const items = (Array.isArray(b.items) ? b.items : [])
      .map((it) => {
        const qty = Math.trunc(num(it.qty));
        if (qty <= 0) return null;
        const itemDate = safeDate(it.date);
        if (itemDate) lastDate = itemDate;
        return { description: str(it.product, 200) || "Item", qty, rate: Math.max(0, num(it.rate)), date: lastDate === date ? null : lastDate };
      })
      .filter(Boolean);
    if (items.length === 0) {
      skipped += 1;
      continue;
    }
    bills.push({
      bill_no,
      date,
      customer: str(b.customer, 100),
      discount: Math.min(100, Math.max(0, num(b.discount))),
      gst: Math.min(100, Math.max(0, num(b.gst))),
      paid: Math.max(0, num(b.cashReceived)),
      previous_due: Math.max(0, num(b.previousBalanceDue)),
      items,
    });
  }
  return { bills, skipped };
}
