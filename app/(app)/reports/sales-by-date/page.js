import BillTypeBadge from "@/components/billing/BillTypeBadge";
import PageHeader from "@/components/layout/PageHeader";
import DateField from "@/components/reports/DateField";
import ExportButtons from "@/components/reports/ExportButtons";
import ReportBack from "@/components/reports/ReportBack";
import DataTable from "@/components/ui/DataTable";
import StatCard from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { getSoldByDate, sumSoldItems } from "@/lib/data/reports";
import { formatCurrency, formatDate, formatNumber, todayISO } from "@/lib/format";
import { isValidDate } from "@/lib/validate";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sales by date" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
const productLabel = (r) => [r.product_name, r.colour, r.size].filter(Boolean).join(" · ") || r.description || "-";

export default async function SalesByDatePage({ searchParams }) {
  const sp = await searchParams;
  const requested = first(sp.date);
  const date = isValidDate(requested) ? requested : todayISO();

  const supabase = await createClient();
  const { rows, error } = await getSoldByDate(supabase, date);
  const totals = sumSoldItems(rows);

  return (
    <>
      <ReportBack />
      <PageHeader
        title="Sales by date"
        description="Every product that left inventory on a chosen date: who bought it, on which bill, and how much."
        actions={<ExportButtons report="sold:date" filters={{ date }} />}
      />

      <div className="mb-5">
        <DateField date={date} />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="Products sold" value={formatNumber(totals.products)} />
        <StatCard label="Total quantity" value={formatNumber(totals.quantity)} />
        <StatCard label="Total sales" value={formatCurrency(totals.total)} />
      </div>

      {error ? (
        <EmptyState icon="alert" title="Could not load this date" description="Please refresh and try again." />
      ) : rows.length === 0 ? (
        <EmptyState icon="receipt" title="No sales found for this date" description={`Nothing was sold on ${formatDate(date)}.`} />
      ) : (
        <DataTable
          columns={[
            {
              key: "product",
              header: "Product",
              cell: (r) => (
                <>
                  {r.sku && <span className="font-semibold">{r.sku}</span>}
                  <span className="block text-muted">{productLabel(r)}</span>
                </>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              cell: (r) => (
                <>
                  <span>{r.customer_name || "Walk-in customer"}</span>
                  {r.customer_mobile && <span className="block text-muted">{r.customer_mobile}</span>}
                </>
              ),
            },
            {
              key: "bill",
              header: "Bill no.",
              cell: (r) => (
                <>
                  <span className="font-medium">{r.bill_no}</span>
                  <span className="block">
                    <BillTypeBadge type={r.bill_type} />
                  </span>
                </>
              ),
            },
            { key: "qty", header: "Qty", align: "right", cell: (r) => <span className="font-bold">{formatNumber(r.quantity)}</span> },
            { key: "rate", header: "Rate", align: "right", cell: (r) => formatCurrency(r.rate) },
            { key: "total", header: "Total", align: "right", cell: (r) => <span className="font-bold">{formatCurrency(r.line_total)}</span> },
          ]}
          rows={rows}
          getKey={(r) => `${r.bill_type}-${r.id}`}
          renderCard={(r) => (
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {r.sku && <p className="truncate text-sm font-semibold">{r.sku}</p>}
                  <p className="truncate text-sm text-muted">{productLabel(r)}</p>
                </div>
                <p className="text-lg font-bold">{formatCurrency(r.line_total)}</p>
              </div>
              <p className="mt-2 text-sm">
                {r.customer_name || "Walk-in customer"}
                {r.customer_mobile && <span className="text-muted"> · {r.customer_mobile}</span>}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted">
                <span className="flex items-center gap-2">
                  <BillTypeBadge type={r.bill_type} />
                  {r.bill_no}
                </span>
                <span>
                  {formatNumber(r.quantity)} × {formatCurrency(r.rate)}
                </span>
              </div>
            </div>
          )}
        />
      )}
    </>
  );
}
