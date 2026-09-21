import BillForm from "@/components/billing/BillForm";
import PageHeader from "@/components/layout/PageHeader";
import { saveSale } from "@/lib/actions/sales";
import { getPickerProducts } from "@/lib/data/pickers";
import { getCustomerNames, getSale, getSettings } from "@/lib/data/sales";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New bill" };

export default async function NewBillPage({ searchParams }) {
  const sp = await searchParams;
  const copyFrom = Array.isArray(sp.from) ? sp.from[0] : sp.from;

  const supabase = await createClient();
  const source = copyFrom ? await getSale(supabase, copyFrom) : null;
  const [products, customerNames, settings] = await Promise.all([
    getPickerProducts(supabase, (source?.items ?? []).map((i) => i.product_id).filter(Boolean)),
    getCustomerNames(supabase),
    getSettings(supabase),
  ]);

  // Duplicating reuses customer, items and rates, but starts unpaid with today's date.
  const bill = source
    ? {
        sale_date: todayISO(),
        customer_name: source.sale.customer_name,
        discount_rate: source.sale.discount_rate,
        gst_rate: source.sale.gst_rate,
        previous_due: 0,
        amount_paid: 0,
        notes: source.sale.notes ?? "",
        items: source.items.map((i) => ({ product_id: i.product_id, description: i.description, quantity: i.quantity, rate: i.rate, line_date: null })),
      }
    : undefined;

  const next = `${settings.invoice_prefix}${String(settings.next_invoice_no).padStart(4, "0")}`;

  return (
    <>
      <PageHeader title="New bill" description={source ? `Copied from ${source.sale.invoice_no}. Check the details, then save.` : "Stock is deducted when you save."} />
      <BillForm
        action={saveSale}
        bill={bill}
        products={products}
        customerNames={customerNames}
        invoiceLabel={`Bill number ${next} is assigned when you save.`}
        defaultGst={Number(settings.default_gst_rate)}
        submitLabel="Save bill"
        cancelHref="/sales"
      />
    </>
  );
}
