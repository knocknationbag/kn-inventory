import Link from "next/link";
import { notFound } from "next/navigation";
import InvoiceActions from "@/components/billing/InvoiceActions";
import InvoicePreview from "@/components/billing/InvoicePreview";
import StatusBadge from "@/components/billing/StatusBadge";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deleteSale } from "@/lib/actions/sales";
import { getSale, getSettings } from "@/lib/data/sales";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Bill" };

export default async function BillDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const found = await getSale(supabase, id);
  if (!found) notFound();
  const { sale, items } = found;
  const settings = await getSettings(supabase);

  return (
    <>
      <div className="print:hidden">
        <Link href="/sales" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink">
          ← All bills
        </Link>
        <PageHeader
          title={sale.invoice_no}
          description={`${sale.customer_name || "Walk-in customer"} · ${formatDate(sale.sale_date)}`}
          actions={
            <>
              <Button href={`/sales/${sale.id}/edit`} variant="outline" size="sm">
                Edit
              </Button>
              <Button href={`/sales/new?from=${sale.id}`} variant="outline" size="sm">
                Duplicate
              </Button>
            </>
          }
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusBadge sale={sale} />
          <InvoiceActions sale={sale} items={items} settings={settings} />
        </div>
      </div>

      <InvoicePreview sale={sale} items={items} settings={settings} />

      <section className="mt-8 rounded-2xl border border-line bg-surface p-4 shadow-card print:hidden">
        <h2 className="text-base font-semibold">Delete this bill</h2>
        <p className="mt-1 text-sm text-muted">The items go back into stock. This can&rsquo;t be undone.</p>
        <div className="mt-4">
          <ConfirmDialog
            action={deleteSale}
            fields={{ id: sale.id }}
            triggerLabel="Delete bill"
            title={`Delete ${sale.invoice_no}?`}
            description="The stock items on this bill are added back to inventory."
            confirmLabel="Delete bill"
          />
        </div>
      </section>
    </>
  );
}
