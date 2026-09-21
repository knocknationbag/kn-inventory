import PageHeader from "@/components/layout/PageHeader";
import PurchaseForm from "@/components/purchases/PurchaseForm";
import { savePurchase } from "@/lib/actions/purchases";
import { getPickerProducts } from "@/lib/data/pickers";
import { getFormOptions } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Add purchase" };

export default async function NewPurchasePage() {
  const supabase = await createClient();
  const [products, { suppliers }] = await Promise.all([getPickerProducts(supabase), getFormOptions(supabase)]);

  return (
    <>
      <PageHeader title="Add purchase" description="Stock you bought. It is added to inventory when you save." />
      <PurchaseForm action={savePurchase} products={products} suppliers={suppliers} submitLabel="Save purchase" cancelHref="/purchases" />
    </>
  );
}
