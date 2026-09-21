import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import ProductForm from "@/components/products/ProductForm";
import { updateProduct } from "@/lib/actions/products";
import { getFormOptions, getProduct } from "@/lib/data/products";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const [product, { categories, suppliers }] = await Promise.all([getProduct(supabase, id), getFormOptions(supabase)]);
  if (!product) notFound();

  return (
    <>
      <PageHeader title={`Edit ${product.sku}`} description="Changes apply everywhere this product appears." />
      <ProductForm
        action={updateProduct}
        product={product}
        categories={categories}
        suppliers={suppliers}
        submitLabel="Save changes"
        cancelHref={`/products/${product.id}`}
      />
    </>
  );
}
