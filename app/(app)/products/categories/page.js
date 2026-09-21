import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ManageList from "@/components/products/ManageList";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name, products(count)").order("name");
  const items = (data ?? []).map((c) => ({ id: c.id, name: c.name, productCount: c.products?.[0]?.count ?? 0 }));

  return (
    <>
      <Link href="/products" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink">
        ← All products
      </Link>
      <PageHeader title="Categories" description="Group your bags, for example Backpacks or Travel." />
      <ManageList kind="categories" singular="category" basePath="/products/categories" items={items} editId={Array.isArray(sp.edit) ? sp.edit[0] : sp.edit} />
    </>
  );
}
