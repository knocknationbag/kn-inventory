import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ExportButtons from "@/components/reports/ExportButtons";
import ReportBack from "@/components/reports/ReportBack";
import DataTable from "@/components/ui/DataTable";
import { ChipGroup, DateRange, PeriodPresets } from "@/components/ui/ListControls";
import Pagination from "@/components/ui/Pagination";
import StatCard from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { parsePage } from "@/lib/data/products";
import { getSalesBills, getSalesByProduct, getSalesDaily, sumSales } from "@/lib/data/reports";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sales report" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
const VIEWS = [
  { value: "", label: "By day" },
  { value: "product", label: "By product" },
  { value: "bills", label: "Bills" },
];
const PAGE_SIZE = 25;

export default async function SalesReportPage({ searchParams }) {
  const sp = await searchParams;
  const range = { from: first(sp.from), to: first(sp.to) };
  const view = ["product", "bills"].includes(first(sp.view)) ? first(sp.view) : "";
  const page = parsePage(first(sp.page));

  const supabase = await createClient();
  const daily = await getSalesDaily(supabase, range);
  const totals = sumSales(daily);
  const hasRange = Boolean(range.from || range.to);

  let content;
  if (view === "product") {
    const rows = await getSalesByProduct(supabase, range);
    content = rows.length === 0 ? <EmptyState icon="receipt" title="No sales in this period" /> : (
      <DataTable
        columns={[
          { key: "p", header: "Product", cell: (r) => <><span className="font-semibold">{r.sku}</span><span className="block text-muted">{r.name}</span></> },
          { key: "q", header: "Units sold", align: "right", cell: (r) => formatNumber(r.quantity) },
          { key: "rate", header: "Average rate", align: "right", cell: (r) => formatCurrency(r.avg_rate) },
          { key: "rev", header: "Sales value", align: "right", cell: (r) => <span className="font-bold">{formatCurrency(r.revenue)}</span> },
        ]}
        rows={rows}
        getKey={(r) => r.key}
        renderCard={(r) => (
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{r.sku}</p>
                <p className="truncate text-sm text-muted">{r.name}</p>
              </div>
              <p className="font-bold">{formatCurrency(r.revenue)}</p>
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatNumber(r.quantity)} sold at {formatCurrency(r.avg_rate)} average
            </p>
          </div>
        )}
      />
    );
  } else if (view === "bills") {
    const all = await getSalesBills(supabase, range);
    const rows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    content = all.length === 0 ? <EmptyState icon="receipt" title="No bills in this period" /> : (
      <>
        <DataTable
          columns={[
            { key: "no", header: "Bill no", cell: (b) => <Link href={`/sales/${b.id}`} className="font-semibold hover:underline">{b.invoice_no}</Link> },
            { key: "date", header: "Date", cell: (b) => formatDate(b.sale_date) },
            { key: "cust", header: "Customer", cell: (b) => b.customer_name || <span className="text-muted">Walk-in</span> },
            { key: "total", header: "Total", align: "right", cell: (b) => <span className="font-bold">{formatCurrency(b.grand_total)}</span> },
            { key: "paid", header: "Paid", align: "right", cell: (b) => formatCurrency(b.amount_paid) },
            { key: "due", header: "Balance due", align: "right", cell: (b) => (Number(b.balance_due) > 0 ? <span className="font-semibold text-danger">{formatCurrency(b.balance_due)}</span> : "-") },
          ]}
          rows={rows}
          getKey={(b) => b.id}
          renderCard={(b) => (
            <Link href={`/sales/${b.id}`} className="block rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{b.customer_name || "Walk-in customer"}</p>
                  <p className="text-sm text-muted">{b.invoice_no} · {formatDate(b.sale_date)}</p>
                </div>
                <p className="font-bold">{formatCurrency(b.grand_total)}</p>
              </div>
              {Number(b.balance_due) > 0 && <p className="mt-2 text-sm font-semibold text-danger">Due {formatCurrency(b.balance_due)}</p>}
            </Link>
          )}
        />
        <Pagination page={page} pageCount={Math.max(1, Math.ceil(all.length / PAGE_SIZE))} total={all.length} pageSize={PAGE_SIZE} basePath="/reports/sales" params={{ ...range, view }} />
      </>
    );
  } else {
    content = daily.length === 0 ? <EmptyState icon="receipt" title="No sales in this period" /> : (
      <DataTable
        columns={[
          { key: "d", header: "Date", cell: (r) => <span className="font-semibold">{formatDate(r.sale_date)}</span> },
          { key: "b", header: "Bills", align: "right", cell: (r) => r.bills },
          { key: "s", header: "Subtotal", align: "right", cell: (r) => formatCurrency(r.subtotal) },
          { key: "disc", header: "Discount", align: "right", cell: (r) => formatCurrency(r.discount) },
          { key: "gst", header: "GST", align: "right", cell: (r) => formatCurrency(r.gst) },
          { key: "t", header: "Total sales", align: "right", cell: (r) => <span className="font-bold">{formatCurrency(r.grand_total)}</span> },
          { key: "due", header: "Balance due", align: "right", cell: (r) => (Number(r.balance_due) > 0 ? <span className="text-danger">{formatCurrency(r.balance_due)}</span> : "-") },
        ]}
        rows={daily}
        getKey={(r) => r.sale_date}
        renderCard={(r) => (
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{formatDate(r.sale_date)}</p>
                <p className="text-sm text-muted">{r.bills} {r.bills === 1 ? "bill" : "bills"}</p>
              </div>
              <p className="text-lg font-bold">{formatCurrency(r.grand_total)}</p>
            </div>
            {(Number(r.discount) > 0 || Number(r.gst) > 0 || Number(r.balance_due) > 0) && (
              <p className="mt-2 text-sm text-muted">
                {Number(r.discount) > 0 && <>Discount {formatCurrency(r.discount)} · </>}
                {Number(r.gst) > 0 && <>GST {formatCurrency(r.gst)} · </>}
                {Number(r.balance_due) > 0 && <span className="font-semibold text-danger">Due {formatCurrency(r.balance_due)}</span>}
              </p>
            )}
          </div>
        )}
      />
    );
  }

  const exportKey = `sales:${view || "day"}`;

  return (
    <>
      <ReportBack />
      <PageHeader title="Sales report" description="Totals come from your saved bills." actions={<ExportButtons report={exportKey} filters={range} />} />

      <div className="mb-4 space-y-3">
        <PeriodPresets />
        <DateRange />
      </div>

      <div className="-mx-4 mb-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6 [&>*]:min-w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:min-w-0">
        <StatCard label="Bills" value={formatNumber(totals.bills)} hint={hasRange ? "In this period" : "All time"} />
        <StatCard label="Total sales" value={formatCurrency(totals.grand_total)} hint="Grand totals" />
        <StatCard label="Discounts" value={formatCurrency(totals.discount)} />
        <StatCard label="GST charged" value={formatCurrency(totals.gst)} />
        <StatCard label="Collected" value={formatCurrency(totals.paid)} tone="success" />
        <StatCard label="Outstanding" value={formatCurrency(totals.balance_due)} tone={totals.balance_due ? "danger" : "default"} />
      </div>

      <div className="mb-4">
        <ChipGroup param="view" label="Report view" options={VIEWS} />
      </div>

      {content}
    </>
  );
}
