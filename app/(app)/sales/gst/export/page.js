import Link from "next/link";
import GstReportActions from "@/components/billing/GstReportActions";
import PageHeader from "@/components/layout/PageHeader";
import DataTable from "@/components/ui/DataTable";
import { DateRange, PeriodPresets } from "@/components/ui/ListControls";
import StatCard from "@/components/ui/StatCard";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { countGstDrafts, exportTotals, listFinalGstInvoices } from "@/lib/data/gstExport";
import { getSettings } from "@/lib/data/sales";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { isValidDate } from "@/lib/validate";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Export for CA" };

const PREVIEW_LIMIT = 200;
const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function GstExportPage({ searchParams }) {
  const sp = await searchParams;
  const from = isValidDate(first(sp.from)) ? first(sp.from) : "";
  const to = isValidDate(first(sp.to)) ? first(sp.to) : "";

  const supabase = await createClient();
  const [{ rows, error }, drafts, settings] = await Promise.all([
    listFinalGstInvoices(supabase, { from, to }),
    countGstDrafts(supabase, { from, to }),
    getSettings(supabase),
  ]);
  const totals = exportTotals(rows);
  const shown = rows.slice(0, PREVIEW_LIMIT);
  const money = (v) => formatCurrency(v);

  const columns = [
    { key: "date", header: "Date", cell: (r) => formatDate(r.invoice_date) },
    { key: "no", header: "Invoice", cell: (r) => <Link href={`/sales/gst/${r.id}`} className="font-semibold hover:underline">{r.invoice_no}</Link> },
    { key: "customer", header: "Customer", cell: (r) => r.customer_name },
    { key: "gstin", header: "GSTIN", cell: (r) => r.customer_gstin || <span className="text-muted">-</span> },
    { key: "taxable", header: "Taxable", align: "right", cell: (r) => money(r.taxable_amount) },
    { key: "cgst", header: "CGST", align: "right", cell: (r) => money(r.cgst_amount) },
    { key: "sgst", header: "SGST", align: "right", cell: (r) => money(r.sgst_amount) },
    { key: "igst", header: "IGST", align: "right", cell: (r) => money(r.igst_amount) },
    { key: "total", header: "Total", align: "right", cell: (r) => <span className="font-bold">{money(r.grand_total)}</span> },
  ];

  return (
    <>
      <Link href="/sales?type=gst" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink">
        ← All GST invoices
      </Link>
      <PageHeader title="Export for CA" description="Monthly GST report of finalized invoices, for return filing. Drafts are never included." />

      <div className="mb-4 space-y-3">
        <PeriodPresets />
        <DateRange />
      </div>

      <div className="-mx-4 mb-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 [&>*]:min-w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:min-w-0">
        <StatCard label="Invoices" value={formatNumber(rows.length)} hint={drafts ? `${drafts} draft${drafts === 1 ? "" : "s"} left out` : "Finalized only"} />
        <StatCard label="Taxable value" value={money(totals.taxable)} />
        <StatCard label="Total tax" value={money(totals.cgst + totals.sgst + totals.igst)} hint={`CGST ${money(totals.cgst)} · SGST ${money(totals.sgst)} · IGST ${money(totals.igst)}`} />
        <StatCard label="Invoice value" value={money(totals.total)} />
      </div>

      <div className="mb-5">
        <GstReportActions from={from} to={to} settings={settings} count={rows.length} />
        {rows.length > 500 && <p className="mt-2 text-sm text-warn">The PDF holds up to 500 invoices. Choose a shorter range for it. Excel has no limit.</p>}
      </div>

      {error ? (
        <ErrorState description="Invoices could not be loaded. Please refresh." />
      ) : rows.length === 0 ? (
        <EmptyState icon="file" title="No finalized invoices" description="Nothing in this date range yet. Try another range." />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={shown}
            getKey={(r) => r.id}
            renderCard={(r) => (
              <Link href={`/sales/gst/${r.id}`} className="block rounded-2xl border border-line bg-surface p-4 shadow-card active:bg-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{r.customer_name}</p>
                    <p className="text-sm text-muted">
                      {r.invoice_no} · {formatDate(r.invoice_date)}
                    </p>
                    {r.customer_gstin && <p className="text-xs text-muted">{r.customer_gstin}</p>}
                  </div>
                  <p className="text-lg font-bold">{money(r.grand_total)}</p>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Taxable {money(r.taxable_amount)} · Tax {money(Number(r.cgst_amount) + Number(r.sgst_amount) + Number(r.igst_amount))}
                </p>
              </Link>
            )}
          />
          {rows.length > PREVIEW_LIMIT && (
            <p className="mt-3 text-sm text-muted">
              Showing the first {PREVIEW_LIMIT} of {formatNumber(rows.length)} invoices. The Excel file has all of them.
            </p>
          )}
        </>
      )}
    </>
  );
}
