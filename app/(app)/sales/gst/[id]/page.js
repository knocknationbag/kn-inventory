import Link from "next/link";
import { notFound } from "next/navigation";
import BillStatusBadge from "@/components/billing/BillStatusBadge";
import BillTypeBadge from "@/components/billing/BillTypeBadge";
import GstInvoiceSheet from "@/components/billing/GstInvoiceSheet";
import InvoiceActions from "@/components/billing/InvoiceActions";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deleteGstInvoice, finalizeGstInvoice } from "@/lib/actions/gstInvoices";
import { getGstInvoice } from "@/lib/data/gstInvoices";
import { getSettings } from "@/lib/data/sales";
import { formatDate } from "@/lib/format";
import { buildUpiQrDataUrl } from "@/lib/upiQr";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "GST invoice" };

export default async function GstInvoiceDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const found = await getGstInvoice(supabase, id);
  if (!found) notFound();
  const { invoice, items } = found;
  const settings = await getSettings(supabase);
  const qrDataUrl = await buildUpiQrDataUrl({ upiId: settings.upi_id, payeeName: settings.upi_payee_name || settings.shop_name, amount: invoice.grand_total });

  return (
    <>
      <div className="print:hidden">
        <Link href="/sales?type=gst" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink">
          ← All GST invoices
        </Link>
        <PageHeader
          title={`Invoice ${invoice.invoice_no}`}
          description={`${invoice.customer_name || "No buyer yet"} · ${formatDate(invoice.invoice_date)}`}
          actions={
            <>
              <Button href={`/sales/gst/${invoice.id}/edit`} variant="outline" size="sm">
                Edit
              </Button>
              <Button href={`/sales/gst/new?from=${invoice.id}`} variant="outline" size="sm">
                Duplicate
              </Button>
            </>
          }
        />
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <BillTypeBadge type="gst" />
          <BillStatusBadge bill={invoice} />
          <InvoiceActions invoice={invoice} items={items} settings={settings} />
        </div>
        {invoice.status === "draft" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            <p>This is a draft. Stock has not been deducted, and it prints as a draft until it is finalized.</p>
            <ConfirmDialog
              action={finalizeGstInvoice}
              fields={{ id: invoice.id }}
              triggerLabel="Finalize invoice"
              triggerVariant="primary"
              triggerSize="sm"
              title={`Finalize invoice ${invoice.invoice_no}?`}
              description="Stock is deducted for the inventory items on this invoice. You can still edit it afterwards."
              confirmLabel="Finalize"
              confirmVariant="primary"
            />
          </div>
        )}
      </div>

      <GstInvoiceSheet invoice={invoice} items={items} settings={settings} qrDataUrl={qrDataUrl} />

      <section className="mt-8 rounded-2xl border border-line bg-surface p-4 shadow-card print:hidden">
        <h2 className="text-base font-semibold">Delete this invoice</h2>
        <p className="mt-1 text-sm text-muted">
          {invoice.status === "final" ? "The items go back into stock. This can’t be undone." : "This draft is removed. Stock is not affected. This can’t be undone."}
        </p>
        <div className="mt-4">
          <ConfirmDialog
            action={deleteGstInvoice}
            fields={{ id: invoice.id }}
            triggerLabel="Delete invoice"
            title={`Delete invoice ${invoice.invoice_no}?`}
            description={invoice.status === "final" ? "The stock items on this invoice are added back to inventory." : "The draft is removed. Stock is not affected."}
            confirmLabel="Delete invoice"
          />
        </div>
      </section>
    </>
  );
}
