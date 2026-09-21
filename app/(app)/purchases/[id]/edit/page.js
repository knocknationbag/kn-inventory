import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import PurchaseForm from "@/components/purchases/PurchaseForm";
import { savePurchase } from "@/lib/actions/purchases";
import { getPickerProducts } from "@/lib/data/pickers";
import { getFormOptions } from "@/lib/data/products";
import { getPurchase } from "@/lib/data/purchases";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit purchase" };

export default async function EditPurchasePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const found = await getPurchase(supabase, id);
  if (!found) notFound();

  const [products, { suppliers }] = await Promise.all([
    getPickerProducts(supabase, found.items.map((i) => i.product_id)),
    getFormOptions(supabase),
  ]);
  const { purchase, items } = found;

  return (
    <>
      <PageHeader title="Edit purchase" description="Stock is recalculated automatically when you save." />
      <PurchaseForm
        action={savePurchase}
        purchase={{
          id: purchase.id,
          purchase_date: purchase.purchase_date,
          supplier_name: purchase.supplier_name ?? "",
          transport_charges: purchase.transport_charges,
          notes: purchase.notes ?? "",
          items,
        }}
        products={products}
        suppliers={suppliers}
        submitLabel="Save changes"
        cancelHref={`/purchases/${purchase.id}`}
      />
    </>
  );
}
