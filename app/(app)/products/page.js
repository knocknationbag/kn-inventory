import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import StockBadge from "@/components/products/StockBadge";
import Button from "@/components/ui/Button";
import ManualSortTable from "@/components/products/ManualSortTable";
import DataTable from "@/components/ui/DataTable";
import Icon from "@/components/ui/Icon";
import { ChipGroup, FilterSelect, SearchInput } from "@/components/ui/ListControls";
import Pagination from "@/components/ui/Pagination";
import StatCard from "@/components/ui/StatCard";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PAGE_SIZE, SORT_OPTIONS, STOCK_FILTERS, getFormOptions, getProductStats, listProducts, parsePage } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Products" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";

function productLabel(p) {
  return [p.colour, p.size].filter(Boolean).join(" · ");
}

export default async function ProductsPage({ searchParams }) {
  const sp = await searchParams;
  const params = {
    q: first(sp.q),
    filter: first(sp.filter),
    category: first(sp.category),
    supplier: first(sp.supplier),
    sort: first(sp.sort),
  };
  const page = parsePage(first(sp.page));

  const supabase = await createClient();
  const [{ rows, count, error }, { stats }, { categories, suppliers }] = await Promise.all([
    listProducts(supabase, { ...params, page }),
    getProductStats(supabase),
    getFormOptions(supabase),
  ]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const hasFilters = Boolean(params.q || params.filter || params.category || params.supplier);
  const addButton = (
    <Button href="/products/new" variant="gold" size="sm">
      <Icon name="plus" size={18} />
      Add product
    </Button>
  );

  const columns = [
    {
      key: "product",
      header: "Product",
      cell: (p) => (
        <Link href={`/products/${p.id}`} className="block">
          <span className="font-semibold text-ink hover:underline">{p.sku}</span>
          <span className="block text-muted">{[p.name, productLabel(p)].filter(Boolean).join(" · ") || "-"}</span>
        </Link>
      ),
    },
    { key: "category", header: "Category", cell: (p) => p.category_name ?? <span className="text-muted">-</span> },
    { key: "supplier", header: "Supplier", cell: (p) => p.supplier_name ?? <span className="text-muted">-</span> },
    { key: "stock", header: "Stock", align: "right", cell: (p) => <span className="text-base font-bold">{formatNumber(p.current_stock)}</span> },
    { key: "status", header: "Status", cell: (p) => <StockBadge stock={p.current_stock} isLow={p.is_low} /> },
    { key: "rate", header: "Purchase rate", align: "right", cell: (p) => formatCurrency(p.purchase_rate) },
    { key: "value", header: "Stock value", align: "right", cell: (p) => <span className="font-medium">{formatCurrency(p.stock_value)}</span> },
  ];

  const renderCard = (p) => (
    <Link href={`/products/${p.id}`} className="block rounded-2xl border border-line bg-surface p-4 shadow-card active:bg-subtle">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">{p.sku}</p>
          <p className="truncate text-sm text-muted">{[p.name, productLabel(p)].filter(Boolean).join(" · ") || "-"}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold leading-none text-ink">{formatNumber(p.current_stock)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">in stock</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <StockBadge stock={p.current_stock} isLow={p.is_low} />
        <span className="text-muted">
          {formatCurrency(p.purchase_rate)} each · <span className="font-medium text-ink">{formatCurrency(p.stock_value)}</span>
        </span>
      </div>
      {(p.supplier_name || p.category_name) && (
        <p className="mt-2 truncate text-xs text-muted">{[p.category_name, p.supplier_name].filter(Boolean).join(" · ")}</p>
      )}
    </Link>
  );

  const manual = params.sort === "manual";

  return (
    <>
      <PageHeader
        title="Products"
        description="Every bag model with live stock, rates and value."
        actions={
          <>
            {addButton}
            <Button href="/products/categories" variant="outline" size="sm">
              Categories
            </Button>
            <Button href="/products/suppliers" variant="outline" size="sm">
              Suppliers
            </Button>
          </>
        }
      />

      {stats && (
        <div className="-mx-4 mb-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&>*]:min-w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:min-w-0">
          <StatCard label="Products" value={formatNumber(stats.products)} />
          <StatCard label="Units in stock" value={formatNumber(stats.units)} />
          <StatCard label="Stock value" value={formatCurrency(stats.value)} hint="At purchase rate" />
          <StatCard label="Low / out" value={formatNumber(stats.low)} tone={stats.low ? "warn" : "default"} hint="At or below alert level" />
        </div>
      )}

      <div className="mb-4 space-y-3">
        <SearchInput placeholder="Search SKU, name, colour, supplier..." />
        <ChipGroup param="filter" label="Stock filter" options={STOCK_FILTERS} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FilterSelect param="category" label="Category" allLabel="All categories" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect param="supplier" label="Supplier" allLabel="All suppliers" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
          <div className="col-span-2 sm:col-span-1">
            <FilterSelect param="sort" label="Sort" options={SORT_OPTIONS} />
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState description="Products could not be loaded. Please refresh." />
      ) : rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon="search"
            title="No products match"
            description="Try a different search or clear the filters."
            action={<Button href="/products" variant="outline">Clear filters</Button>}
          />
        ) : (
          <EmptyState icon="package" title="No products yet" description="Add your first bag model to start tracking stock." action={addButton} />
        )
      ) : (
        <>
          {manual ? (
            <ManualSortTable
              key={rows.map((p) => p.id).join(",")}
              columns={columns.map(({ key, header, align }) => ({ key, header, align }))}
              items={rows.map((p) => ({ id: p.id, label: p.sku, cells: columns.map((c) => c.cell(p)), card: renderCard(p) }))}
              note={pageCount > 1 || hasFilters ? "Only the products shown here move; the rest keep their places." : ""}
            />
          ) : (
            <DataTable columns={columns} rows={rows} getKey={(p) => p.id} renderCard={renderCard} />
          )}
          <Pagination page={page} pageCount={pageCount} total={count} pageSize={PAGE_SIZE} basePath="/products" params={params} />
        </>
      )}
    </>
  );
}
