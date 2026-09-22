import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import StockBadge from "@/components/products/StockBadge";
import ExportButtons from "@/components/reports/ExportButtons";
import ReportBack from "@/components/reports/ReportBack";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import StatCard from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { getLowStock } from "@/lib/data/reports";
import { formatCurrency, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Low stock report" };

const name = (r) => [r.name, r.colour, r.size].filter(Boolean).join(" · ");

export default async function LowStockPage() {
  const supabase = await createClient();
  const { rows, threshold } = await getLowStock(supabase);
  const out = rows.filter((r) => r.current_stock <= 0).length;

  return (
    <>
      <ReportBack />
      <PageHeader title="Low stock" description={`Products with ${threshold} or fewer in stock, lowest first.`} actions={<ExportButtons report="low-stock" />} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Need attention" value={formatNumber(rows.length)} tone={rows.length ? "warn" : "default"} />
        <StatCard label="Out of stock" value={formatNumber(out)} tone={out ? "danger" : "default"} />
        <StatCard label="Alert level" value={`${threshold} or fewer`} hint="Set in Settings" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="package" title="All products have healthy stock" description="Nothing needs reordering right now." />
      ) : (
        <DataTable
          columns={[
            { key: "p", header: "Product", cell: (r) => <Link href={`/products/${r.id}`} className="block"><span className="font-semibold hover:underline">{r.sku}</span><span className="block text-muted">{name(r) || "-"}</span></Link> },
            { key: "su", header: "Supplier", cell: (r) => r.supplier_name ?? <span className="text-muted">-</span> },
            { key: "st", header: "In stock", align: "right", cell: (r) => <span className="text-base font-bold">{formatNumber(r.current_stock)}</span> },
            { key: "sb", header: "Status", cell: (r) => <StockBadge stock={r.current_stock} isLow /> },
            { key: "rt", header: "Purchase rate", align: "right", cell: (r) => formatCurrency(r.purchase_rate) },
            { key: "a", header: "", align: "right", cell: (r) => <Button href="/purchases/new" variant="outline" size="sm">Buy stock</Button> },
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
                <p className="text-2xl font-bold leading-none">{formatNumber(r.current_stock)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <StockBadge stock={r.current_stock} isLow />
                <span className="truncate text-muted">{r.supplier_name ?? "No supplier"}</span>
              </div>
            </Link>
          )}
        />
      )}
    </>
  );
}
