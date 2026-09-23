import Link from "next/link";
import BillStatusBadge from "@/components/billing/BillStatusBadge";
import BillTypeBadge from "@/components/billing/BillTypeBadge";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import Icon from "@/components/ui/Icon";
import { ChipGroup, DateRange, SearchInput } from "@/components/ui/ListControls";
import Pagination from "@/components/ui/Pagination";
import StatCard from "@/components/ui/StatCard";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { parsePage } from "@/lib/data/products";
import { BILL_PAGE_SIZE, BILL_STATUS_FILTERS, TYPE_FILTERS, billHref, getBillTotals, listBills } from "@/lib/data/bills";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Bills" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function BillsPage({ searchParams }) {
  const sp = await searchParams;
  const filters = { q: first(sp.q), type: first(sp.type), status: first(sp.status), from: first(sp.from), to: first(sp.to) };
  const page = parsePage(first(sp.page));

  const supabase = await createClient();
  const [{ rows, count, error }, totals] = await Promise.all([listBills(supabase, filters, page), getBillTotals(supabase, filters)]);

  const pageCount = Math.max(1, Math.ceil(count / BILL_PAGE_SIZE));
  const hasFilters = Object.values(filters).some(Boolean);
  const newButton = (
    <Button href="/sales/new-bill" variant="gold" size="sm">
      <Icon name="plus" size={18} />
      New bill
    </Button>
  );

  const headerActions = (
    <>
      {filters.type === "gst" && (
        <>
          <Button href="/sales/gst" variant="outline" size="sm">
            GST overview
          </Button>
          <Button href="/sales/gst/export" variant="outline" size="sm">
            Export for CA
          </Button>
        </>
      )}
      {newButton}
    </>
  );

  const columns = [
    { key: "no", header: "Bill no", cell: (s) => <Link href={billHref(s)} className="font-semibold hover:underline">{s.bill_no}</Link> },
    { key: "type", header: "Type", cell: (s) => <BillTypeBadge type={s.bill_type} /> },
    { key: "date", header: "Date", cell: (s) => formatDate(s.bill_date) },
    { key: "customer", header: "Customer", cell: (s) => s.customer_name || <span className="text-muted">Walk-in</span> },
    { key: "total", header: "Total", align: "right", cell: (s) => <span className="font-bold">{formatCurrency(s.grand_total)}</span> },
    { key: "paid", header: "Paid", align: "right", cell: (s) => formatCurrency(s.amount_paid) },
    { key: "due", header: "Balance due", align: "right", cell: (s) => (Number(s.balance_due) > 0 ? <span className="font-semibold text-danger">{formatCurrency(s.balance_due)}</span> : <span className="text-muted">-</span>) },
    { key: "status", header: "Status", cell: (s) => <BillStatusBadge bill={s} /> },
  ];

  return (
    <>
      <PageHeader title="Bills" description="Normal bills and GST Tax Invoices. Open one to print, share or edit." actions={headerActions} />

      <div className="-mx-4 mb-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 [&>*]:min-w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:min-w-0">
        <StatCard label="Bills" value={formatNumber(totals.count)} hint={totals.drafts ? `${totals.drafts} draft${totals.drafts === 1 ? "" : "s"} not in totals` : hasFilters ? "Matching filters" : "All time"} />
        <StatCard label="Billed" value={formatCurrency(totals.billed)} hint="Grand totals" />
        <StatCard label="Outstanding" value={formatCurrency(totals.outstanding)} tone={totals.outstanding ? "danger" : "default"} hint="Still to collect" />
      </div>

      <div className="mb-4 space-y-3">
        <SearchInput placeholder="Search bill no. or customer..." />
        <ChipGroup param="type" label="Bill type" options={TYPE_FILTERS} />
        <ChipGroup param="status" label="Payment status" options={BILL_STATUS_FILTERS} />
        <DateRange />
      </div>

      {error ? (
        <ErrorState description="Bills could not be loaded. Please refresh." />
      ) : rows.length === 0 ? (
        hasFilters ? (
          <EmptyState icon="search" title="No bills match" description="Try different dates or clear the filters." action={<Button href="/sales" variant="outline">Clear filters</Button>} />
        ) : (
          <EmptyState icon="receipt" title="No bills yet" description="Make your first bill. Stock is deducted automatically." action={newButton} />
        )
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            getKey={(s) => `${s.bill_type}-${s.id}`}
            renderCard={(s) => (
              <Link href={billHref(s)} className="block rounded-2xl border border-line bg-surface p-4 shadow-card active:bg-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{s.customer_name || "Walk-in customer"}</p>
                    <p className="text-sm text-muted">
                      {s.bill_no} · {formatDate(s.bill_date)}
                    </p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(s.grand_total)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <BillTypeBadge type={s.bill_type} />
                    <BillStatusBadge bill={s} />
                  </span>
                  {s.status === "final" && Number(s.balance_due) > 0 && <span className="font-semibold text-danger">Due {formatCurrency(s.balance_due)}</span>}
                </div>
              </Link>
            )}
          />
          <Pagination page={page} pageCount={pageCount} total={count} pageSize={BILL_PAGE_SIZE} basePath="/sales" params={filters} />
        </>
      )}
    </>
  );
}
