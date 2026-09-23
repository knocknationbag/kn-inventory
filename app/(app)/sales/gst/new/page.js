import GstInvoiceForm from "@/components/billing/GstInvoiceForm";
import PageHeader from "@/components/layout/PageHeader";
import { saveGstInvoice } from "@/lib/actions/gstInvoices";
import { getGstCustomers, getGstInvoice, suggestGstInvoiceNo } from "@/lib/data/gstInvoices";
import { getPickerProducts } from "@/lib/data/pickers";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New GST Tax Invoice" };

export default async function NewGstInvoicePage({ searchParams }) {
  const sp = await searchParams;
  const copyFrom = Array.isArray(sp.from) ? sp.from[0] : sp.from;

  const supabase = await createClient();
  const source = copyFrom ? await getGstInvoice(supabase, copyFrom) : null;
  const [products, customers, suggestedNo] = await Promise.all([
    getPickerProducts(supabase, (source?.items ?? []).map((i) => i.product_id).filter(Boolean)),
    getGstCustomers(supabase),
    suggestGstInvoiceNo(supabase),
  ]);

  // Duplicating keeps the buyer, tax setup and items, but starts as a fresh unpaid draft dated today.
  const invoice = source
    ? {
        ...source.invoice,
        id: undefined,
        invoice_no: suggestedNo,
        status: "draft",
        invoice_date: todayISO(),
        date_of_supply: null,
        amount_paid: 0,
        items: source.items.map((i) => ({ ...i, id: undefined })),
      }
    : undefined;

  return (
    <>
      <PageHeader
        title="New GST Tax Invoice"
        description={source ? `Copied from invoice ${source.invoice.invoice_no}. Check the details, then save.` : "Uses the same products and stock as Normal bills. Save a draft any time; stock changes only when you finalize."}
      />
      <GstInvoiceForm action={saveGstInvoice} invoice={invoice} products={products} customers={customers} suggestedNo={suggestedNo} />
    </>
  );
}
