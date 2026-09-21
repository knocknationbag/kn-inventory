import { notFound } from "next/navigation";
import BillForm from "@/components/billing/BillForm";
import PageHeader from "@/components/layout/PageHeader";
import { saveSale } from "@/lib/actions/sales";
import { getPickerProducts } from "@/lib/data/pickers";
import { getCustomerNames, getSale } from "@/lib/data/sales";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit bill" };

export default async function EditBillPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const found = await getSale(supabase, id);
  if (!found) notFound();
  const { sale, items } = found;

  const [products, customerNames] = await Promise.all([
    getPickerProducts(supabase, items.map((i) => i.product_id).filter(Boolean)),
    getCustomerNames(supabase),
  ]);

  // This bill's own quantities are already deducted, so they count as available while editing it.
  const originalQty = {};
  for (const i of items) if (i.product_id) originalQty[i.product_id] = (originalQty[i.product_id] ?? 0) + i.quantity;

  return (
    <>
      <PageHeader title={`Edit ${sale.invoice_no}`} description="Stock is recalculated automatically when you save." />
      <BillForm
        action={saveSale}
        bill={{
          id: sale.id,
          sale_date: sale.sale_date,
          customer_name: sale.customer_name,
          discount_rate: sale.discount_rate,
          gst_rate: sale.gst_rate,
          previous_due: sale.previous_due,
          amount_paid: sale.amount_paid,
          notes: sale.notes ?? "",
          items,
        }}
        products={products}
        customerNames={customerNames}
        invoiceLabel={`Bill number ${sale.invoice_no} stays the same.`}
        originalQty={originalQty}
        submitLabel="Save changes"
        cancelHref={`/sales/${sale.id}`}
      />
    </>
  );
}
