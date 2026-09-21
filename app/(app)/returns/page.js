import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import Icon from "@/components/ui/Icon";
import { ChipGroup, DateRange, SearchInput } from "@/components/ui/ListControls";
import Pagination from "@/components/ui/Pagination";
import StatCard from "@/components/ui/StatCard";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { RETURN_REASONS, RETURN_REASON_LABEL } from "@/lib/constants";
import { parsePage } from "@/lib/data/products";
import { RETURN_PAGE_SIZE, getReturnTotals, listReturns } from "@/lib/data/returns";
import { formatDate, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Returns" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
const REASON_CHIPS = [{ value: "", label: "All" }, ...RETURN_REASONS];
const label = (r) => [r.name, r.colour, r.size].filter(Boolean).join(" · ");

function Impact({ ret }) {
  return ret.restock ? <Badge tone="success">+{ret.quantity} restocked</Badge> : <Badge tone="warn">Not restocked</Badge>;
}

export default async function ReturnsPage({ searchParams }) {
  const sp = await searchParams;
  const filters = { q: first(sp.q), reason: first(sp.reason), from: first(sp.from), to: first(sp.to) };
  const page = parsePage(first(sp.page));

  const supabase = await createClient();
  const [{ rows, count, error }, totals] = await Promise.all([listReturns(supabase, filters, page), getReturnTotals(supabase, filters)]);

  const pageCount = Math.max(1, Math.ceil(count / RETURN_PAGE_SIZE));
  const hasFilters = Object.values(filters).some(Boolean);
  const addButton = (
    <Button href="/returns/new" variant="gold" size="sm">
      <Icon name="plus" size={18} />
      Add return
    </Button>
  );

  const columns = [
    { key: "date", header: "Date", cell: (r) => <Link href={`/returns/${r.id}/edit`} className="font-semibold hover:underline">{formatDate(r.return_date)}</Link> },
    {
      key: "product",
      header: "Product",
      cell: (r) => (
        <Link href={`/products/${r.product_id}`} className="block">
          <span className="font-semibold hover:underline">{r.sku}</span>
          <span className="block text-muted">{label(r) || "-"}</span>
        </Link>
      ),
    },
    { key: "qty", header: "Qty", align: "right", cell: (r) => formatNumber(r.quantity) },
    { key: "reason", header: "Reason", cell: (r) => RETURN_REASON_LABEL[r.reason] },
    { key: "impact", header: "Stock impact", cell: (r) => <Impact ret={r} /> },
    { key: "notes", header: "Notes", cell: (r) => <span className="text-muted">{r.notes ?? "-"}</span> },
  ];

  return (
    <>
      <PageHeader title="Returns" description="Customer returns, RTO and damaged bags." actions={addButton} />

      <div className="-mx-4 mb-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 [&>*]:min-w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:min-w-0">
        <StatCard label="Returns" value={formatNumber(totals.count)} hint={hasFilters ? "Matching filters" : "All time"} />
        <StatCard label="Restocked" value={formatNumber(totals.restocked)} tone="success" hint="Units added back" />
        <StatCard label="Not restocked" value={formatNumber(totals.notRestocked)} tone={totals.notRestocked ? "warn" : "default"} hint="Recorded only" />
      </div>

      <div className="mb-4 space-y-3">
        <SearchInput placeholder="Search SKU, product, notes..." />
        <ChipGroup param="reason" label="Reason" options={REASON_CHIPS} />
        <DateRange />
      </div>

      {error ? (
        <ErrorState description="Returns could not be loaded. Please refresh." />
      ) : rows.length === 0 ? (
        hasFilters ? (
          <EmptyState icon="search" title="No returns match" description="Try different dates or clear the filters." action={<Button href="/returns" variant="outline">Clear filters</Button>} />
        ) : (
          <EmptyState icon="undo" title="No returns yet" description="Record bags that come back. You choose whether they go back into stock." action={addButton} />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            getKey={(r) => r.id}
            renderCard={(r) => (
              <Link href={`/returns/${r.id}/edit`} className="block rounded-2xl border border-line bg-surface p-4 shadow-card active:bg-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{r.sku}</p>
                    <p className="truncate text-sm text-muted">{label(r) || "-"}</p>
                  </div>
                  <p className="text-2xl font-bold leading-none">{formatNumber(r.quantity)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted">
                    {formatDate(r.return_date)} · {RETURN_REASON_LABEL[r.reason]}
                  </span>
                  <Impact ret={r} />
                </div>
                {r.notes && <p className="mt-2 truncate text-xs text-muted">{r.notes}</p>}
              </Link>
            )}
          />
          <Pagination page={page} pageCount={pageCount} total={count} pageSize={RETURN_PAGE_SIZE} basePath="/returns" params={filters} />
        </>
      )}
    </>
  );
}
