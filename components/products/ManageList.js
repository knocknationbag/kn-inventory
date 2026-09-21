import Link from "next/link";
import ListItemForm from "@/components/products/ListItemForm";
import { buttonClass } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/States";
import { deleteListItem } from "@/lib/actions/lists";

// Shared add / rename / delete screen for categories and suppliers.
export default function ManageList({ kind, singular, basePath, items, editId, withContact }) {
  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Add {singular}</h2>
        <ListItemForm kind={kind} withContact={withContact} submitLabel={`Add ${singular}`} />
      </section>

      {items.length === 0 ? (
        <EmptyState icon="package" title={`No ${singular}s yet`} description={`Add one above, or type a new name while adding a product.`} />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              {editId === item.id ? (
                <ListItemForm kind={kind} item={item} withContact={withContact} cancelHref={basePath} submitLabel="Save changes" />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="text-sm text-muted">
                      {item.productCount} product{item.productCount === 1 ? "" : "s"}
                      {item.phone ? ` · ${item.phone}` : ""}
                    </p>
                    {item.notes && <p className="truncate text-sm text-muted">{item.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`${basePath}?edit=${item.id}`} className={buttonClass({ variant: "outline", size: "sm" })}>
                      Edit
                    </Link>
                    <ConfirmDialog
                      action={deleteListItem}
                      fields={{ kind, id: item.id }}
                      triggerLabel="Delete"
                      triggerSize="sm"
                      title={`Delete ${item.name}?`}
                      description={
                        item.productCount
                          ? `${item.productCount} product${item.productCount === 1 ? " uses" : "s use"} it. They will simply show no ${singular}.`
                          : "This can't be undone."
                      }
                      confirmLabel="Delete"
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
