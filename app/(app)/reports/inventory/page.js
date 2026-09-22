import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import StockBadge from "@/components/products/StockBadge";
import ExportButtons from "@/components/reports/ExportButtons";
import ReportBack from "@/components/reports/ReportBack";
import DataTable from "@/components/ui/DataTable";
import { ChipGroup, FilterSelect, SearchInput } from "@/components/ui/ListControls";
import Pagination from "@/components/ui/Pagination";
import StatCard from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { getFormOptions, parsePage } from "@/lib/data/products";
import { getInventory } from "@/lib/data/reports";
import { formatCurrency, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Inventory report" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
const PAGE_SIZE = 25;
const FILTERS = [
  { value: "", label: "All" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];
const name = (r) => [r.name, r.colour, r.size].filter(Boolean).join(" · ");

export default async function InventoryReportPage({ searchParams }) {
  const sp = await searchParams;
  const filters = { q: first(sp.q), category: first(sp.category), supplier: first(sp.supplier), filter: first(sp.filter) };
  const page = parsePage(first(sp.page));

  const supabase = await createClient();
  const [{ rows: all }, { categories, suppliers }] = await Promise.all([getInventory(supabase, filters), getFormOptions(supabase)]);
  const rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const t = all.reduce((a, r) => ({ units: a.units + r.stock, value: a.value + r.stock_value, sold: a.sold + r.sold, sales: a.sales + r.sales_value }), { units: 0, value: 0, sold: 0, sales: 0 });

  return (
    <>
      <ReportBack />
      <PageHeader title="Inventory and stock value" description="A snapshot of stock right now. Value is stock × purchase rate." actions={<ExportButtons report="inventory" filters={filters} />} />

      <div className="-mx-4 mb-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 [&>*]:min-w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:min-w-0">
        <StatCard label="Products" value={formatNumber(all.length)} />
        <StatCard label="Units in stock" value={formatNumber(t.units)} />
        <StatCard label="Stock value" value={formatCurrency(t.value)} hint="At purchase rate" />
        <StatCard label="Units sold" value={formatNumber(t.sold)} hint="All time" />
        <StatCard label="Sales value" value={formatCurrency(t.sales)} hint="Before discount and GST" />
      </div>

      <div className="mb-4 space-y-3">
        <SearchInput placeholder="Search SKU, name, colour, supplier..." />
        <ChipGroup param="filter" label="Stock filter" options={FILTERS} />
        <div className="grid grid-cols-2 gap-2">
          <FilterSelect param="category" label="Category" allLabel="All categories" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect param="supplier" label="Supplier" allLabel="All suppliers" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
      </div>

      {all.length === 0 ? (
        <EmptyState icon="package" title="No products to show" description="Add products, or clear the filters." />
      ) : (
        <>
          <DataTable
            columns={[
              { key: "p", header: "Product", cell: (r) => <Link href={`/products/${r.id}`} className="block"><span className="font-semibold hover:underline">{r.sku}</span><span className="block text-muted">{name(r) || "-"}</span></Link> },
              { key: "o", header: "Opening", align: "right", cell: (r) => formatNumber(r.opening) },
              { key: "b", header: "Bought", align: "right", cell: (r) => formatNumber(r.purchased) },
              { key: "r", header: "Returned", align: "right", cell: (r) => formatNumber(r.returned) },
              { key: "s", header: "Sold", align: "right", cell: (r) => formatNumber(r.sold) },
              { key: "st", header: "In stock", align: "right", cell: (r) => <span className="text-base font-bold">{formatNumber(r.stock)}</span> },
              { key: "sb", header: "Status", cell: (r) => <StockBadge stock={r.stock} isLow={r.is_low} /> },
              { key: "rt", header: "Rate", align: "right", cell: (r) => formatCurrency(r.purchase_rate) },
              { key: "v", header: "Stock value", align: "right", cell: (r) => <span className="font-medium">{formatCurrency(r.stock_value)}</span> },
              { key: "sv", header: "Sales value", align: "right", cell: (r) => formatCurrency(r.sales_value) },
            ]}
            rows={rows}
            getKey={(r) => r.id}
            renderCard={(r) => (
              <Link href={`/products/${r.id}`} className="block rounded-2xl border border-line bg-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.sku}</p>
                    <p className="truncate text-sm text-muted">{name(r) || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold leading-none">{formatNumber(r.stock)}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">in stock</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  {[["Opening", r.opening], ["Bought", r.purchased], ["Returned", r.returned], ["Sold", r.sold]].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-subtle py-1.5">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-sm font-semibold">{formatNumber(v)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <StockBadge stock={r.stock} isLow={r.is_low} />
                  <span className="text-muted">Value <b className="text-ink">{formatCurrency(r.stock_value)}</b></span>
                </div>
              </Link>
            )}
          />
          <Pagination page={page} pageCount={Math.max(1, Math.ceil(all.length / PAGE_SIZE))} total={all.length} pageSize={PAGE_SIZE} basePath="/reports/inventory" params={filters} />
        </>
      )}
    </>
  );
}
