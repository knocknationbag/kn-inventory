import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import StockBadge from "@/components/products/StockBadge";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import StatCard from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";
import { deleteProduct, setProductActive } from "@/lib/actions/products";
import { PAGE_SIZE, getProduct, getProductLedger, parsePage } from "@/lib/data/products";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const KIND_LABEL = { purchase: "Purchase", sale: "Sale", return: "Return" };
const RETURN_REASON = { customer_return: "Customer return", rto: "RTO / delivery failure", defective: "Defective / damaged" };

function party(m) {
  if (m.kind === "return") return RETURN_REASON[m.party] ?? m.party;
  return m.party || "-";
}

const MOVEMENT_HREF = {
  purchase: (id) => `/purchases/${id}`,
  sale: (id) => `/sales/${id}`,
  return: (id) => `/returns/${id}/edit`,
};

function MovementLink({ m, children }) {
  const href = MOVEMENT_HREF[m.kind]?.(m.document_id);
  if (!href) return children;
  return (
    <Link href={href} className="underline decoration-line-strong underline-offset-4 hover:decoration-gold">
      {children}
    </Link>
  );
}

function Qty({ value }) {
  return <span className={`font-semibold ${value > 0 ? "text-success" : "text-danger"}`}>{value > 0 ? `+${value}` : value}</span>;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const product = await getProduct(supabase, id);
  return { title: product ? product.sku : "Product" };
}

export default async function ProductDetailPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const page = parsePage(Array.isArray(sp.page) ? sp.page[0] : sp.page);

  const supabase = await createClient();
  const product = await getProduct(supabase, id);
  if (!product) notFound();
  const ledger = await getProductLedger(supabase, id, page);
  const pageCount = Math.max(1, Math.ceil(ledger.count / PAGE_SIZE));

  const columns = [
    { key: "date", header: "Date", cell: (m) => formatDate(m.movement_date) },
    { key: "kind", header: "Type", cell: (m) => <MovementLink m={m}>{KIND_LABEL[m.kind]}</MovementLink> },
    { key: "party", header: "Supplier / customer / reason", cell: party },
    { key: "qty", header: "Qty", align: "right", cell: (m) => <Qty value={m.quantity} /> },
    { key: "balance", header: "Balance after", align: "right", cell: (m) => <span className="font-bold">{formatNumber(m.balance_after)}</span> },
  ];

  return (
    <>
      <Link href="/products" className="mb-3 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-ink">
        ← All products
      </Link>
      <PageHeader
        title={product.sku}
        description={[product.name, product.colour, product.size].filter(Boolean).join(" · ") || "No name yet"}
        actions={
          <Button href={`/products/${product.id}/edit`} variant="outline">
            Edit
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StockBadge stock={product.current_stock} isLow={product.is_low} />
        {!product.is_active && <Badge tone="neutral">Archived</Badge>}
        {product.category_name && <Badge tone="gold">{product.category_name}</Badge>}
        {product.supplier_name && <Badge>{product.supplier_name}</Badge>}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Current stock" value={formatNumber(product.current_stock)} tone={product.current_stock <= 0 ? "danger" : product.is_low ? "warn" : "default"} />
        <StatCard label="Stock value" value={formatCurrency(product.stock_value)} hint={`${formatCurrency(product.purchase_rate)} each`} />
        <StatCard label="Selling rate" value={formatCurrency(product.selling_rate)} hint={product.gst_rate ? `GST ${product.gst_rate}%` : "No GST"} />
        <StatCard label="Opening stock" value={formatNumber(product.opening_stock)} />
      </div>

      <section className="mb-6 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <h2 className="mb-3 text-base font-semibold">How the stock adds up</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-5">
          {[
            ["Opening", product.opening_stock],
            ["+ Purchased", product.purchased_qty],
            ["+ Returned (restocked)", product.returned_qty],
            ["− Sold", product.sold_qty],
            ["= Current", product.current_stock],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted">{label}</dt>
              <dd className="text-lg font-bold">{formatNumber(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <h2 className="mb-3 text-lg font-semibold">Stock movement</h2>
      {ledger.rows.length === 0 ? (
        <EmptyState icon="download" title="No movement yet" description="Purchases, bills and returns for this product will appear here." />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={ledger.rows}
            getKey={(m) => `${m.kind}-${m.source_id}`}
            renderCard={(m) => (
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      <MovementLink m={m}>{KIND_LABEL[m.kind]}</MovementLink>
                    </p>
                    <p className="text-sm text-muted">{formatDate(m.movement_date)}</p>
                  </div>
                  <p className="text-xl">
                    <Qty value={m.quantity} />
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-muted">
                  <span className="truncate">{party(m)}</span>
                  <span>
                    Balance <b className="text-ink">{formatNumber(m.balance_after)}</b>
                  </span>
                </div>
              </div>
            )}
          />
          <Pagination page={page} pageCount={pageCount} total={ledger.count} pageSize={PAGE_SIZE} basePath={`/products/${product.id}`} />
        </>
      )}

      <section className="mt-10 rounded-2xl border border-line bg-surface p-4 shadow-card">
        <h2 className="text-base font-semibold">Manage</h2>
        <p className="mt-1 text-sm text-muted">
          {product.has_transactions
            ? "This product has history, so it can be archived but not deleted. Archiving hides it from lists and pickers and keeps every record."
            : "This product has no purchases, bills or returns, so it can be deleted safely."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {product.is_active ? (
            <ConfirmDialog
              action={setProductActive}
              fields={{ id: product.id, active: "false" }}
              triggerLabel="Archive"
              title={`Archive ${product.sku}?`}
              description="It will be hidden from lists and can't be picked for new purchases or bills. History stays intact and you can restore it any time."
              confirmLabel="Archive"
              confirmVariant="primary"
            />
          ) : (
            <ConfirmDialog
              action={setProductActive}
              fields={{ id: product.id, active: "true" }}
              triggerLabel="Restore"
              title={`Restore ${product.sku}?`}
              description="It will show in lists again."
              confirmLabel="Restore"
              confirmVariant="primary"
            />
          )}
          {!product.has_transactions && (
            <ConfirmDialog
              action={deleteProduct}
              fields={{ id: product.id }}
              triggerLabel="Delete"
              title={`Delete ${product.sku}?`}
              description="This permanently removes the product. It can't be undone."
              confirmLabel="Delete product"
            />
          )}
        </div>
      </section>
    </>
  );
}
