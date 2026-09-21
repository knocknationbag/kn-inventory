import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataTable from "@/components/ui/DataTable";
import StatCard from "@/components/ui/StatCard";
import { deletePurchase } from "@/lib/actions/purchases";
import { getPurchase } from "@/lib/data/purchases";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Purchase" };

const label = (p) => [p.name, p.colour, p.size].filter(Boolean).join(" · ");

export default async function PurchaseDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const found = await getPurchase(supabase, id);
  if (!found) notFound();
  const { purchase, items } = found;

  const columns = [
    {
      key: "product",
      header: "Product",
      cell: (i) => (
        <Link href={`/products/${i.product_id}`} className="block">
          <span className="font-semibold hover:underline">{i.products.sku}</span>
          <span className="block text-muted">{label(i.products) || "-"}</span>
        </Link>
      ),
    },
    { key: "qty", header: "Qty", align: "right", cell: (i) => formatNumber(i.quantity) },
    { key: "rate", header: "Rate", align: "right", cell: (i) => formatCurrency(i.rate) },
    { key: "total", header: "Total", align: "right", cell: (i) => <span className="font-bold">{formatCurrency(i.line_total)}</span> },
  ];

  return (
    <>
      <Link href="/purchases" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink">
        ← All purchases
      </Link>
      <PageHeader
        title={purchase.supplier_name ?? "Purchase"}
        description={formatDate(purchase.purchase_date)}
        actions={
          <Button href={`/purchases/${purchase.id}/edit`} variant="outline">
            Edit
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={formatCurrency(purchase.grand_total)} />
        <StatCard label="Products" value={formatCurrency(purchase.items_total)} />
        <StatCard label="Transport" value={formatCurrency(purchase.transport_charges)} />
        <StatCard label="Units" value={formatNumber(purchase.total_qty)} />
      </div>

      <DataTable
        columns={columns}
        rows={items}
        getKey={(i) => i.id}
        renderCard={(i) => (
          <Link href={`/products/${i.product_id}`} className="block rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{i.products.sku}</p>
                <p className="truncate text-sm text-muted">{label(i.products) || "-"}</p>
              </div>
              <p className="font-bold">{formatCurrency(i.line_total)}</p>
            </div>
            <p className="mt-2 text-sm text-muted">
              {formatNumber(i.quantity)} × {formatCurrency(i.rate)}
            </p>
          </Link>
        )}
      />

      {purchase.notes && (
        <section className="mt-5 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <h2 className="text-sm font-semibold text-muted">Notes</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{purchase.notes}</p>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <h2 className="text-base font-semibold">Delete this purchase</h2>
        <p className="mt-1 text-sm text-muted">Stock is reduced by these units. It is blocked if those bags have already been sold.</p>
        <div className="mt-4">
          <ConfirmDialog
            action={deletePurchase}
            fields={{ id: purchase.id }}
            triggerLabel="Delete purchase"
            title="Delete this purchase?"
            description="The units bought will be removed from stock. This can't be undone."
            confirmLabel="Delete purchase"
          />
        </div>
      </section>
    </>
  );
}
