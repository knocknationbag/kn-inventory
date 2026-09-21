import PageHeader from "@/components/layout/PageHeader";
import ReturnForm from "@/components/returns/ReturnForm";
import { saveReturn } from "@/lib/actions/returns";
import { getPickerProducts } from "@/lib/data/pickers";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Add return" };

export default async function NewReturnPage() {
  const supabase = await createClient();
  const products = await getPickerProducts(supabase);

  return (
    <>
      <PageHeader title="Add return" description="Record bags that came back and choose whether they return to stock." />
      <ReturnForm action={saveReturn} products={products} submitLabel="Save return" cancelHref="/returns" />
    </>
  );
}
