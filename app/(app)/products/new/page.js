import PageHeader from "@/components/layout/PageHeader";
import ProductForm from "@/components/products/ProductForm";
import { createProduct } from "@/lib/actions/products";
import { getFormOptions } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const { categories, suppliers } = await getFormOptions(supabase);

  return (
    <>
      <PageHeader title="Add product" description="Add a new bag model." />
      <ProductForm action={createProduct} categories={categories} suppliers={suppliers} submitLabel="Add product" cancelHref="/products" />
    </>
  );
}
