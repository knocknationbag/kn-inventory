import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { DateRange, PeriodPresets } from "@/components/ui/ListControls";
import StatCard from "@/components/ui/StatCard";
import { ErrorState } from "@/components/ui/States";
import { getGstOverview } from "@/lib/data/gstOverview";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { isValidDate } from "@/lib/validate";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "GST overview" };

const first = (v) => (Array.isArray(v) ? v[0] : v) ?? "";

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

export default async function GstOverviewPage({ searchParams }) {
  const sp = await searchParams;
  const from = isValidDate(first(sp.from)) ? first(sp.from) : "";
  const to = isValidDate(first(sp.to)) ? first(sp.to) : "";

  const supabase = await createClient();
  const overview = await getGstOverview(supabase, { from, to });
  const money = (v) => formatCurrency(v);

  const actions = (
    <>
      <Button href="/sales/gst/export" variant="outline" size="sm">
        Export for CA
      </Button>
      <Button href="/sales/gst/new" variant="gold" size="sm">
        <Icon name="plus" size={18} />
        New GST invoice
      </Button>
    </>
  );

  return (
    <>
      <Link href="/sales?type=gst" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink">
        ← All GST invoices
      </Link>
      <PageHeader title="GST overview" description="Finalized GST Tax Invoices. Drafts are never counted." actions={actions} />

      <div className="mb-4 space-y-3">
        <PeriodPresets />
        <DateRange />
      </div>

      {overview.error ? (
        <ErrorState description="The overview could not be loaded. Please refresh." />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Invoices" value={formatNumber(overview.count)} hint={overview.drafts ? `${overview.drafts} draft${overview.drafts === 1 ? "" : "s"} not counted` : "Finalized only"} />
            <StatCard label="Taxable value" value={money(overview.totals.taxable)} />
            <StatCard
              label="Tax collected"
              value={money(overview.totals.cgst + overview.totals.sgst + overview.totals.igst)}
              hint={`CGST ${money(overview.totals.cgst)} · SGST ${money(overview.totals.sgst)} · IGST ${money(overview.totals.igst)}`}
            />
            <StatCard label="Invoice value" value={money(overview.totals.total)} />
            <StatCard label="Outstanding" value={money(overview.outstanding)} tone={overview.outstanding ? "danger" : "default"} hint={overview.unpaid ? `${overview.unpaid} unpaid invoice${overview.unpaid === 1 ? "" : "s"}` : "All paid"} />
            <StatCard label="Drafts" value={formatNumber(overview.drafts)} tone={overview.drafts ? "warn" : "default"} hint="Waiting to be finalized" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Top buyers">
              {overview.topBuyers.length === 0 ? (
                <p className="text-sm text-muted">No finalized invoices in this period.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {overview.topBuyers.map((b) => (
                    <li key={b.name} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{b.name}</p>
                        <p className="text-xs text-muted">
                          {b.invoices} invoice{b.invoices === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="text-sm font-bold">{money(b.total)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Recent invoices" href="/sales?type=gst">
              {overview.recent.length === 0 ? (
                <p className="text-sm text-muted">No finalized invoices in this period.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {overview.recent.map((r) => (
                    <li key={r.id}>
                      <Link href={`/sales/gst/${r.id}`} className="flex min-h-12 items-center justify-between gap-3 py-2.5 hover:bg-subtle">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{r.customer_name}</p>
                          <p className="text-xs text-muted">
                            {r.invoice_no} · {formatDate(r.invoice_date)}
                          </p>
                        </div>
                        <p className="text-sm font-bold">{money(r.grand_total)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}
    </>
  );
}
