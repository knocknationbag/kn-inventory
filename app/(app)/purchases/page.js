import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import Icon from "@/components/ui/Icon";
import { DateRange, FilterSelect, SearchInput } from "@/components/ui/ListControls";
import Pagination from "@/components/ui/Pagination";
import StatCard from "@/components/ui/StatCard";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { getFormOptions, parsePage } from "@/lib/data/products";
import { PURCHASE_PAGE_SIZE, getPurchaseTotals, listPurchases } from "@/lib/data/purchases";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Purchases" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function PurchasesPage({ searchParams }) {
  const sp = await searchParams;
  const filters = { q: first(sp.q), supplier: first(sp.supplier), from: first(sp.from), to: first(sp.to) };
  const page = parsePage(first(sp.page));

  const supabase = await createClient();
  const [{ rows, count, error }, totals, { suppliers }] = await Promise.all([
    listPurchases(supabase, filters, page),
    getPurchaseTotals(supabase, filters),
    getFormOptions(supabase),
  ]);

  const pageCount = Math.max(1, Math.ceil(count / PURCHASE_PAGE_SIZE));
  const hasFilters = Object.values(filters).some(Boolean);
  const addButton = (
    <Button href="/purchases/new" variant="gold" size="sm">
      <Icon name="plus" size={18} />
      Add purchase
    </Button>
  );

  const columns = [
    { key: "date", header: "Date", cell: (p) => <Link href={`/purchases/${p.id}`} className="font-semibold hover:underline">{formatDate(p.purchase_date)}</Link> },
    { key: "supplier", header: "Supplier", cell: (p) => p.supplier_name ?? <span className="text-muted">-</span> },
    { key: "items", header: "Products", cell: (p) => <span className="text-muted">{p.item_count} · {p.skus.split(" ").slice(0, 3).join(", ")}{p.item_count > 3 ? "…" : ""}</span> },
    { key: "qty", header: "Units", align: "right", cell: (p) => formatNumber(p.total_qty) },
    { key: "items_total", header: "Products total", align: "right", cell: (p) => formatCurrency(p.items_total) },
    { key: "transport", header: "Transport", align: "right", cell: (p) => formatCurrency(p.transport_charges) },
    { key: "total", header: "Total", align: "right", cell: (p) => <span className="font-bold">{formatCurrency(p.grand_total)}</span> },
  ];

  return (
    <>
      <PageHeader title="Purchases" description="Stock coming in from your suppliers." actions={addButton} />

      <div className="-mx-4 mb-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 [&>*]:min-w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:min-w-0">
        <StatCard label="Purchases" value={formatNumber(totals.count)} hint={hasFilters ? "Matching filters" : "All time"} />
        <StatCard label="Units bought" value={formatNumber(totals.units)} />
        <StatCard label="Total spent" value={formatCurrency(totals.spend)} hint="Products + transport" />
      </div>

      <div className="mb-4 space-y-3">
        <SearchInput placeholder="Search supplier, product SKU, notes..." />
        <DateRange />
        <FilterSelect param="supplier" label="Supplier" allLabel="All suppliers" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
      </div>

      {error ? (
        <ErrorState description="Purchases could not be loaded. Please refresh." />
      ) : rows.length === 0 ? (
        hasFilters ? (
          <EmptyState icon="search" title="No purchases match" description="Try different dates or clear the filters." action={<Button href="/purchases" variant="outline">Clear filters</Button>} />
        ) : (
          <EmptyState icon="download" title="No purchases yet" description="Record stock you buy and it is added to inventory automatically." action={addButton} />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            getKey={(p) => p.id}
            renderCard={(p) => (
              <Link href={`/purchases/${p.id}`} className="block rounded-2xl border border-line bg-surface p-4 shadow-card active:bg-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{p.supplier_name ?? "No supplier"}</p>
                    <p className="text-sm text-muted">{formatDate(p.purchase_date)}</p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(p.grand_total)}</p>
                </div>
                <p className="mt-2 truncate text-sm text-muted">
                  {p.item_count} {p.item_count === 1 ? "product" : "products"} · {formatNumber(p.total_qty)} pcs
                  {p.transport_charges > 0 ? ` · transport ${formatCurrency(p.transport_charges)}` : ""}
                </p>
              </Link>
            )}
          />
          <Pagination page={page} pageCount={pageCount} total={count} pageSize={PURCHASE_PAGE_SIZE} basePath="/purchases" params={filters} />
        </>
      )}
    </>
  );
}
