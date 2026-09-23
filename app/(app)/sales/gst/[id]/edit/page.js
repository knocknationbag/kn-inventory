import { notFound } from "next/navigation";
import GstInvoiceForm from "@/components/billing/GstInvoiceForm";
import PageHeader from "@/components/layout/PageHeader";
import { saveGstInvoice } from "@/lib/actions/gstInvoices";
import { getGstCustomers, getGstInvoice } from "@/lib/data/gstInvoices";
import { getPickerProducts } from "@/lib/data/pickers";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit GST invoice" };

export default async function EditGstInvoicePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const found = await getGstInvoice(supabase, id);
  if (!found) notFound();
  const { invoice, items } = found;

  const [products, customers] = await Promise.all([
    getPickerProducts(supabase, items.map((i) => i.product_id).filter(Boolean)),
    getGstCustomers(supabase),
  ]);

  // A finalized invoice's own quantities are already deducted, so they count as available while editing it.
  const originalQty = {};
  if (invoice.status === "final") for (const i of items) if (i.product_id) originalQty[i.product_id] = (originalQty[i.product_id] ?? 0) + i.quantity;

  return (
    <>
      <PageHeader
        title={`Edit invoice ${invoice.invoice_no}`}
        description={invoice.status === "draft" ? "Still a draft. Stock changes only when you finalize it." : "Stock is recalculated automatically when you save."}
      />
      <GstInvoiceForm action={saveGstInvoice} invoice={{ ...invoice, items }} products={products} customers={customers} originalQty={originalQty} cancelHref={`/sales/gst/${invoice.id}`} />
    </>
  );
}
