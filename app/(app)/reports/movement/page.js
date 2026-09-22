import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ExportButtons from "@/components/reports/ExportButtons";
import ReportBack from "@/components/reports/ReportBack";
import DataTable from "@/components/ui/DataTable";
import { ChipGroup, DateRange, PeriodPresets, SearchInput } from "@/components/ui/ListControls";
import Pagination from "@/components/ui/Pagination";
import StatCard from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { RETURN_REASON_LABEL } from "@/lib/constants";
import { parsePage } from "@/lib/data/products";
import { LEDGER_PAGE_SIZE, getLedger, getMovementDaily, getStockSummary } from "@/lib/data/reports";
import { formatDate, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Stock movement" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
const VIEWS = [
  { value: "", label: "Ledger" },
  { value: "date", label: "By date" },
  { value: "product", label: "Product balance" },
];
const KINDS = [
  { value: "", label: "All" },
  { value: "purchase", label: "Stock in" },
  { value: "return", label: "Returns" },
  { value: "sale", label: "Stock out" },
];
const KIND_LABEL = { purchase: "Purchase", sale: "Sale", return: "Return" };
const HREF = { purchase: (id) => `/purchases/${id}`, sale: (id) => `/sales/${id}`, return: (id) => `/returns/${id}/edit` };
const party = (m) => (m.kind === "return" ? RETURN_REASON_LABEL[m.party] ?? m.party : m.party) || "-";
const productName = (r) => [r.name, r.colour, r.size].filter(Boolean).join(" · ");

function Qty({ value }) {
  return <span className={`font-semibold tabular-nums ${value > 0 ? "text-success" : "text-danger"}`}>{value > 0 ? `+${value}` : value}</span>;
}

export default async function MovementPage({ searchParams }) {
  const sp = await searchParams;
  const range = { from: first(sp.from), to: first(sp.to), q: first(sp.q) };
  const view = ["date", "product"].includes(first(sp.view)) ? first(sp.view) : "";
  const kind = first(sp.kind);
  const page = parsePage(first(sp.page));

  const supabase = await createClient();
  const daily = await getMovementDaily(supabase, range);
  const t = daily.reduce((a, d) => ({ in: a.in + d.stock_in, ret: a.ret + d.returned, out: a.out + d.stock_out }), { in: 0, ret: 0, out: 0 });
  const filters = view === "" ? { ...range, kind } : range;
  const exportKey = `movement:${view === "" ? "ledger" : view}`;

  let content;
  if (view === "date") {
    content = daily.length === 0 ? <EmptyState icon="undo" title="No movement in this period" /> : (
      <DataTable
        columns={[
          { key: "d", header: "Date", cell: (r) => <span className="font-semibold">{formatDate(r.date)}</span> },
          { key: "i", header: "Stock in", align: "right", cell: (r) => formatNumber(r.stock_in) },
          { key: "r", header: "Returns restocked", align: "right", cell: (r) => formatNumber(r.returned) },
          { key: "o", header: "Stock out", align: "right", cell: (r) => formatNumber(r.stock_out) },
          { key: "n", header: "Net change", align: "right", cell: (r) => <Qty value={r.net} /> },
        ]}
        rows={daily}
        getKey={(r) => r.date}
        renderCard={(r) => (
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{formatDate(r.date)}</p>
              <p className="text-xl"><Qty value={r.net} /></p>
            </div>
            <p className="mt-2 text-sm text-muted">In {formatNumber(r.stock_in)} · Returns {formatNumber(r.returned)} · Out {formatNumber(r.stock_out)}</p>
          </div>
        )}
      />
    );
  } else if (view === "product") {
    const summary = await getStockSummary(supabase, range);
    const rows = summary.slice((page - 1) * 25, page * 25);
    const total = summary.length;
    content = total === 0 ? <EmptyState icon="package" title="No products to show" /> : (
      <>
        <DataTable
          columns={[
            { key: "p", header: "Product", cell: (r) => <Link href={`/products/${r.product_id}`} className="block"><span className="font-semibold hover:underline">{r.sku}</span><span className="block text-muted">{r.label || "-"}</span></Link> },
            { key: "o", header: "Opening", align: "right", cell: (r) => formatNumber(r.opening_balance) },
            { key: "i", header: "In", align: "right", cell: (r) => formatNumber(r.stock_in) },
            { key: "r", header: "Returns", align: "right", cell: (r) => formatNumber(r.returned) },
            { key: "out", header: "Out", align: "right", cell: (r) => formatNumber(r.stock_out) },
            { key: "c", header: "Closing balance", align: "right", cell: (r) => <span className="text-base font-bold">{formatNumber(r.closing_balance)}</span> },
          ]}
          rows={rows}
          getKey={(r) => r.product_id}
          renderCard={(r) => (
            <Link href={`/products/${r.product_id}`} className="block rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.sku}</p>
                  <p className="truncate text-sm text-muted">{r.label || "-"}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold leading-none">{formatNumber(r.closing_balance)}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">closing</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted">
                Opening {formatNumber(r.opening_balance)} · In {formatNumber(r.stock_in)} · Returns {formatNumber(r.returned)} · Out {formatNumber(r.stock_out)}
              </p>
            </Link>
          )}
        />
        <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / 25))} total={total} pageSize={25} basePath="/reports/movement" params={{ ...range, view }} />
      </>
    );
  } else {
    const { rows, count } = await getLedger(supabase, { ...range, kind }, page);
    content = count === 0 ? <EmptyState icon="undo" title="No movement in this period" description="Purchases, bills and restocked returns appear here." /> : (
      <>
        <DataTable
          columns={[
            { key: "d", header: "Date", cell: (m) => formatDate(m.movement_date) },
            { key: "p", header: "Product", cell: (m) => <Link href={`/products/${m.product_id}`} className="block"><span className="font-semibold hover:underline">{m.sku}</span><span className="block text-muted">{productName(m) || "-"}</span></Link> },
            { key: "t", header: "Type", cell: (m) => <Link href={HREF[m.kind](m.document_id)} className="underline decoration-line-strong underline-offset-4 hover:decoration-gold">{KIND_LABEL[m.kind]}</Link> },
            { key: "w", header: "Supplier / customer / reason", cell: (m) => party(m) },
            { key: "q", header: "Qty", align: "right", cell: (m) => <Qty value={m.quantity} /> },
            { key: "b", header: "Balance after", align: "right", cell: (m) => <span className="font-bold">{formatNumber(m.balance_after)}</span> },
          ]}
          rows={rows}
          getKey={(m) => `${m.kind}-${m.source_id}`}
          renderCard={(m) => (
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/products/${m.product_id}`} className="block truncate font-semibold">{m.sku}</Link>
                  <p className="truncate text-sm text-muted">{productName(m) || "-"}</p>
                </div>
                <p className="text-xl"><Qty value={m.quantity} /></p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted">
                <span className="truncate">
                  <Link href={HREF[m.kind](m.document_id)} className="underline decoration-line-strong underline-offset-4">{KIND_LABEL[m.kind]}</Link> · {formatDate(m.movement_date)} · {party(m)}
                </span>
                <span className="shrink-0">Balance <b className="text-ink">{formatNumber(m.balance_after)}</b></span>
              </div>
            </div>
          )}
        />
        <Pagination page={page} pageCount={Math.max(1, Math.ceil(count / LEDGER_PAGE_SIZE))} total={count} pageSize={LEDGER_PAGE_SIZE} basePath="/reports/movement" params={{ ...range, kind }} />
      </>
    );
  }

  return (
    <>
      <ReportBack />
      <PageHeader title="Stock movement" description="Balances always include everything before the period, so they are never wrong when you filter dates." actions={<ExportButtons report={exportKey} filters={filters} />} />

      <div className="mb-4 space-y-3">
        <SearchInput placeholder="Search SKU, product, name..." />
        <PeriodPresets />
        <DateRange />
      </div>

      <div className="-mx-4 mb-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 [&>*]:min-w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:min-w-0">
        <StatCard label="Stock in" value={formatNumber(t.in)} tone="success" hint="Purchases" />
        <StatCard label="Returns" value={formatNumber(t.ret)} hint="Restocked" />
        <StatCard label="Stock out" value={formatNumber(t.out)} hint="Sold" />
        <StatCard label="Net change" value={`${t.in + t.ret - t.out >= 0 ? "+" : ""}${formatNumber(t.in + t.ret - t.out)}`} />
      </div>

      <div className="mb-4 space-y-3">
        <ChipGroup param="view" label="Report view" options={VIEWS} />
        {view === "" && <ChipGroup param="kind" label="Movement type" options={KINDS} />}
      </div>

      {content}
    </>
  );
}
