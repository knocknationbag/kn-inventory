import PageHeader from "@/components/layout/PageHeader";
import ExportButtons from "@/components/reports/ExportButtons";
import ReportBack from "@/components/reports/ReportBack";
import DataTable from "@/components/ui/DataTable";
import { ChipGroup, DateRange, PeriodPresets } from "@/components/ui/ListControls";
import StatCard from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { getPurchasesByProduct, getPurchasesBySupplier, getPurchasesDaily, sumPurchases } from "@/lib/data/reports";
import { formatCurrency, formatDate, formatNumber, plural } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Purchase report" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
const VIEWS = [
  { value: "", label: "By day" },
  { value: "supplier", label: "By supplier" },
  { value: "product", label: "By product" },
];

function Card({ title, sub, total, note }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          {sub && <p className="truncate text-sm text-muted">{sub}</p>}
        </div>
        <p className="font-bold">{total}</p>
      </div>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
    </div>
  );
}

export default async function PurchaseReportPage({ searchParams }) {
  const sp = await searchParams;
  const range = { from: first(sp.from), to: first(sp.to) };
  const view = ["supplier", "product"].includes(first(sp.view)) ? first(sp.view) : "";

  const supabase = await createClient();
  const daily = await getPurchasesDaily(supabase, range);
  const totals = sumPurchases(daily);
  const hasRange = Boolean(range.from || range.to);

  let content;
  if (view === "supplier") {
    const rows = await getPurchasesBySupplier(supabase, range);
    content = rows.length === 0 ? <EmptyState icon="download" title="No purchases in this period" /> : (
      <DataTable
        columns={[
          { key: "s", header: "Supplier", cell: (r) => <span className="font-semibold">{r.supplier}</span> },
          { key: "n", header: "Purchases", align: "right", cell: (r) => r.purchases },
          { key: "u", header: "Units", align: "right", cell: (r) => formatNumber(r.units) },
          { key: "i", header: "Products", align: "right", cell: (r) => formatCurrency(r.items_total) },
          { key: "t", header: "Transport", align: "right", cell: (r) => formatCurrency(r.transport) },
          { key: "g", header: "Total", align: "right", cell: (r) => <span className="font-bold">{formatCurrency(r.grand_total)}</span> },
        ]}
        rows={rows}
        getKey={(r) => r.supplier}
        renderCard={(r) => <Card title={r.supplier} total={formatCurrency(r.grand_total)} note={`${r.purchases} ${plural(r.purchases, "purchase")} · ${formatNumber(r.units)} pcs`} />}
      />
    );
  } else if (view === "product") {
    const rows = await getPurchasesByProduct(supabase, range);
    content = rows.length === 0 ? <EmptyState icon="download" title="No purchases in this period" /> : (
      <DataTable
        columns={[
          { key: "p", header: "Product", cell: (r) => <><span className="font-semibold">{r.sku}</span><span className="block text-muted">{r.name}</span></> },
          { key: "q", header: "Units bought", align: "right", cell: (r) => formatNumber(r.quantity) },
          { key: "a", header: "Average rate", align: "right", cell: (r) => formatCurrency(r.avg_rate) },
          { key: "s", header: "Spend", align: "right", cell: (r) => <span className="font-bold">{formatCurrency(r.spend)}</span> },
        ]}
        rows={rows}
        getKey={(r) => r.key}
        renderCard={(r) => <Card title={r.sku} sub={r.name} total={formatCurrency(r.spend)} note={`${formatNumber(r.quantity)} bought at ${formatCurrency(r.avg_rate)} average`} />}
      />
    );
  } else {
    content = daily.length === 0 ? <EmptyState icon="download" title="No purchases in this period" /> : (
      <DataTable
        columns={[
          { key: "d", header: "Date", cell: (r) => <span className="font-semibold">{formatDate(r.purchase_date)}</span> },
          { key: "n", header: "Purchases", align: "right", cell: (r) => r.purchases },
          { key: "u", header: "Units", align: "right", cell: (r) => formatNumber(r.units) },
          { key: "i", header: "Products", align: "right", cell: (r) => formatCurrency(r.items_total) },
          { key: "t", header: "Transport", align: "right", cell: (r) => formatCurrency(r.transport) },
          { key: "g", header: "Total", align: "right", cell: (r) => <span className="font-bold">{formatCurrency(r.grand_total)}</span> },
        ]}
        rows={daily}
        getKey={(r) => r.purchase_date}
        renderCard={(r) => <Card title={formatDate(r.purchase_date)} total={formatCurrency(r.grand_total)} note={`${r.purchases} ${plural(r.purchases, "purchase")} · ${formatNumber(r.units)} pcs${Number(r.transport) > 0 ? ` · transport ${formatCurrency(r.transport)}` : ""}`} />}
      />
    );
  }

  return (
    <>
      <ReportBack />
      <PageHeader title="Purchase report" description="Stock bought, including transport." actions={<ExportButtons report={`purchases:${view || "day"}`} filters={range} />} />

      <div className="mb-4 space-y-3">
        <PeriodPresets />
        <DateRange />
      </div>

      <div className="-mx-4 mb-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 [&>*]:min-w-36 [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:min-w-0">
        <StatCard label="Purchases" value={formatNumber(totals.purchases)} hint={hasRange ? "In this period" : "All time"} />
        <StatCard label="Units bought" value={formatNumber(totals.units)} />
        <StatCard label="Products cost" value={formatCurrency(totals.items_total)} />
        <StatCard label="Total spent" value={formatCurrency(totals.grand_total)} hint={`Incl. ${formatCurrency(totals.transport)} transport`} />
      </div>

      <div className="mb-4">
        <ChipGroup param="view" label="Report view" options={VIEWS} />
      </div>

      {content}
    </>
  );
}
