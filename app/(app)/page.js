import Link from "next/link";
import StatusBadge from "@/components/billing/StatusBadge";
import PageHeader from "@/components/layout/PageHeader";
import StockBadge from "@/components/products/StockBadge";
import BarChart from "@/components/ui/BarChart";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import StatCard from "@/components/ui/StatCard";
import { getDashboard } from "@/lib/data/reports";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

function Section({ title, href, linkLabel = "View all", children }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-medium text-gold-text hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }) => <p className="py-6 text-center text-sm text-muted">{children}</p>;

export default async function DashboardPage() {
  const supabase = await createClient();
  const d = await getDashboard(supabase);
  const isNew = d.stats.products === 0 && d.billCount === 0;

  return (
    <>
      <PageHeader title="Dashboard" description={formatDate(d.today)} />

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <Button href="/sales/new" variant="gold" size="sm" className="shrink-0">
          <Icon name="plus" size={18} />
          New bill
        </Button>
        <Button href="/purchases/new" variant="outline" size="sm" className="shrink-0">
          Add purchase
        </Button>
        <Button href="/products/new" variant="outline" size="sm" className="shrink-0">
          Add product
        </Button>
        <Button href="/returns/new" variant="outline" size="sm" className="shrink-0">
          Add return
        </Button>
      </div>

      {isNew && (
        <section className="mb-5 rounded-2xl border border-line bg-gold-soft p-5">
          <h2 className="text-lg font-semibold">Welcome. Let&rsquo;s set up your shop.</h2>
          <ol className="mt-3 space-y-2 text-sm text-ink">
            <li>
              <b>1.</b> <Link href="/products/new" className="font-semibold underline">Add your products</Link> with their opening stock.
            </li>
            <li>
              <b>2.</b> Record stock you buy under <Link href="/purchases/new" className="font-semibold underline">Purchases</Link>.
            </li>
            <li>
              <b>3.</b> Make your first <Link href="/sales/new" className="font-semibold underline">bill</Link>. Stock is deducted automatically.
            </li>
          </ol>
        </section>
      )}

      <section className="mb-3 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Today&rsquo;s sales</p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-ink">{formatCurrency(d.todaySales)}</p>
        <p className="mt-1 text-sm text-muted">
          {d.todayBills} {d.todayBills === 1 ? "bill" : "bills"} today
        </p>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Today's purchases" value={formatCurrency(d.todayPurchases)} hint={`${d.todayPurchaseCount} today`} />
        <StatCard label="Stock value" value={formatCurrency(d.stats.value)} hint="At purchase rate" />
        <StatCard label="Units in stock" value={formatNumber(d.stats.units)} hint={`${formatNumber(d.stats.products)} products`} />
        <StatCard label="Low / out of stock" value={formatNumber(d.stats.low)} tone={d.stats.low ? "warn" : "default"} hint={`${d.threshold} or fewer`} />
        <StatCard label="Total sales" value={formatCurrency(d.totalSales)} hint={`${formatNumber(d.billCount)} bills`} />
        <StatCard label="Outstanding" value={formatCurrency(d.outstanding)} tone={d.outstanding ? "danger" : "default"} hint="Still to collect" />
      </div>

      <div className="mb-5">
        <BarChart title="Sales, last 14 days" subtitle="Bill totals per day" data={d.chart} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Recent bills" href="/sales">
          {d.recentBills.length === 0 ? (
            <Empty>No bills yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.recentBills.map((b) => (
                <li key={b.id}>
                  <Link href={`/sales/${b.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{b.customer_name || "Walk-in customer"}</span>
                      <span className="block text-sm text-muted">
                        {b.invoice_no} · {formatDate(b.sale_date)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="font-bold">{formatCurrency(b.grand_total)}</span>
                      <StatusBadge sale={b} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent purchases" href="/purchases">
          {d.recentPurchases.length === 0 ? (
            <Empty>No purchases yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.recentPurchases.map((p) => (
                <li key={p.id}>
                  <Link href={`/purchases/${p.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{p.supplier_name ?? "No supplier"}</span>
                      <span className="block text-sm text-muted">
                        {formatDate(p.purchase_date)} · {formatNumber(p.total_qty)} pcs
                      </span>
                    </span>
                    <span className="font-bold">{formatCurrency(p.grand_total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="lg:col-span-2">
          <Section title="Low stock" href="/reports/low-stock" linkLabel="Full report">
            {d.lowStock.length === 0 ? (
              <Empty>All products have healthy stock.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {d.lowStock.map((p) => (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{p.sku}</span>
                        <span className="block truncate text-sm text-muted">{[p.name, p.colour, p.size].filter(Boolean).join(" · ") || "-"}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <StockBadge stock={p.current_stock} isLow />
                        <span className="w-8 text-right text-lg font-bold">{p.current_stock}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
