import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import ReturnForm from "@/components/returns/ReturnForm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { deleteReturn, saveReturn } from "@/lib/actions/returns";
import { getPickerProducts } from "@/lib/data/pickers";
import { getReturn } from "@/lib/data/returns";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit return" };

export default async function EditReturnPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const ret = await getReturn(supabase, id);
  if (!ret) notFound();
  const products = await getPickerProducts(supabase, [ret.product_id]);

  return (
    <>
      <PageHeader title="Edit return" description="Stock is recalculated automatically when you save." />
      <ReturnForm
        action={saveReturn}
        ret={{
          id: ret.id,
          return_date: ret.return_date,
          product_id: ret.product_id,
          quantity: ret.quantity,
          reason: ret.reason,
          restock: ret.restock,
          notes: ret.notes ?? "",
        }}
        products={products}
        submitLabel="Save changes"
        cancelHref="/returns"
      />

      <section className="mt-8 max-w-2xl rounded-2xl border border-line bg-surface p-4 shadow-card">
        <h2 className="text-base font-semibold">Delete this return</h2>
        <p className="mt-1 text-sm text-muted">If it was restocked, those units are removed from stock again.</p>
        <div className="mt-4">
          <ConfirmDialog
            action={deleteReturn}
            fields={{ id: ret.id }}
            triggerLabel="Delete return"
            title="Delete this return?"
            description="This can't be undone."
            confirmLabel="Delete return"
          />
        </div>
      </section>
    </>
  );
}
