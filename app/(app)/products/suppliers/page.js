import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ManageList from "@/components/products/ManageList";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("id, name, phone, notes, products(count)").order("name");
  const items = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    notes: s.notes,
    productCount: s.products?.[0]?.count ?? 0,
  }));

  return (
    <>
      <Link href="/products" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink">
        ← All products
      </Link>
      <PageHeader title="Suppliers" description="Who you buy bags from." />
      <ManageList
        kind="suppliers"
        singular="supplier"
        basePath="/products/suppliers"
        items={items}
        editId={Array.isArray(sp.edit) ? sp.edit[0] : sp.edit}
        withContact
      />
    </>
  );
}
