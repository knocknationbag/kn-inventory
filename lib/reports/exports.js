import {
  getInventory,
  getLedgerAll,
  getLowStock,
  getMovementDaily,
  getPurchasesByProduct,
  getPurchasesBySupplier,
  getPurchasesDaily,
  getSalesBills,
  getSalesByProduct,
  getSalesDaily,
  getStockSummary,
} from "@/lib/data/reports";
import { RETURN_REASON_LABEL } from "@/lib/constants";

const col = (key, header) => ({ key, header });

// Every downloadable report: what it is called, its columns, and how to load the full (unpaginated) rows.
export const EXPORTS = {
  "sales:day": {
    filename: "sales-by-day",
    columns: [col("sale_date", "Date"), col("bills", "Bills"), col("subtotal", "Subtotal"), col("discount", "Discount"), col("gst", "GST"), col("grand_total", "Total sales"), col("paid", "Paid"), col("balance_due", "Balance due")],
    load: (s, f) => getSalesDaily(s, f),
  },
  "sales:product": {
    filename: "sales-by-product",
    columns: [col("sku", "SKU"), col("name", "Product"), col("quantity", "Units sold"), col("revenue", "Sales value"), col("avg_rate", "Average rate")],
    load: (s, f) => getSalesByProduct(s, f),
  },
  "sales:bills": {
    filename: "bills",
    columns: [col("invoice_no", "Bill no"), col("sale_date", "Date"), col("customer_name", "Customer"), col("subtotal", "Subtotal"), col("discount_amount", "Discount"), col("gst_amount", "GST"), col("grand_total", "Grand total"), col("previous_due", "Previous due"), col("amount_paid", "Paid"), col("balance_due", "Balance due"), col("change_amount", "Change")],
    load: (s, f) => getSalesBills(s, f),
  },
  "purchases:day": {
    filename: "purchases-by-day",
    columns: [col("purchase_date", "Date"), col("purchases", "Purchases"), col("units", "Units"), col("items_total", "Products total"), col("transport", "Transport"), col("grand_total", "Total")],
    load: (s, f) => getPurchasesDaily(s, f),
  },
  "purchases:supplier": {
    filename: "purchases-by-supplier",
    columns: [col("supplier", "Supplier"), col("purchases", "Purchases"), col("units", "Units"), col("items_total", "Products total"), col("transport", "Transport"), col("grand_total", "Total")],
    load: (s, f) => getPurchasesBySupplier(s, f),
  },
  "purchases:product": {
    filename: "purchases-by-product",
    columns: [col("sku", "SKU"), col("name", "Product"), col("quantity", "Units bought"), col("spend", "Spend"), col("avg_rate", "Average rate")],
    load: (s, f) => getPurchasesByProduct(s, f),
  },
  inventory: {
    filename: "inventory",
    columns: [col("sku", "SKU"), col("name", "Name"), col("colour", "Colour"), col("size", "Size"), col("category", "Category"), col("supplier", "Supplier"), col("opening", "Opening stock"), col("purchased", "Purchased"), col("returned", "Returned (restocked)"), col("sold", "Sold"), col("stock", "In stock"), col("purchase_rate", "Purchase rate"), col("stock_value", "Stock value"), col("sales_value", "Sales value")],
    load: async (s, f) => (await getInventory(s, f)).rows,
  },
  "movement:ledger": {
    filename: "stock-movement",
    columns: [col("movement_date", "Date"), col("sku", "SKU"), col("name", "Product"), col("type", "Type"), col("party", "Supplier / customer / reason"), col("quantity", "Quantity (+in / -out)"), col("balance_after", "Balance after")],
    load: async (s, f) =>
      (await getLedgerAll(s, f)).map((r) => ({ ...r, type: r.kind === "purchase" ? "Purchase" : r.kind === "sale" ? "Sale" : "Return", party: r.kind === "return" ? RETURN_REASON_LABEL[r.party] ?? r.party : r.party })),
  },
  "movement:date": {
    filename: "stock-movement-by-date",
    columns: [col("date", "Date"), col("stock_in", "Stock in"), col("returned", "Returns restocked"), col("stock_out", "Stock out"), col("net", "Net change")],
    load: (s, f) => getMovementDaily(s, f),
  },
  "movement:product": {
    filename: "product-balance",
    columns: [col("sku", "SKU"), col("label", "Product"), col("opening_balance", "Opening balance"), col("stock_in", "Stock in"), col("returned", "Returns restocked"), col("stock_out", "Stock out"), col("closing_balance", "Closing balance")],
    load: (s, f) => getStockSummary(s, f),
  },
  "low-stock": {
    filename: "low-stock",
    columns: [col("sku", "SKU"), col("name", "Name"), col("colour", "Colour"), col("size", "Size"), col("supplier_name", "Supplier"), col("current_stock", "In stock"), col("purchase_rate", "Purchase rate")],
    load: async (s) => (await getLowStock(s)).rows,
  },
};

// Link used by the Export buttons on each report page.
export function exportHref(key, filters, format = "csv") {
  const params = new URLSearchParams({ report: key, format });
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  return `/reports/export?${params}`;
}
