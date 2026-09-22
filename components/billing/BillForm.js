"use client";

import { useActionState, useMemo, useState } from "react";
import { ComboField, Field, TextField, inputClass } from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import Icon from "@/components/ui/Icon";
import ProductSelector from "@/components/ui/ProductSelector";
import { computeTotals, lineTotal } from "@/lib/billing";
import { formatCurrency, todayISO } from "@/lib/format";

let sequence = 0;
const blankLine = (key) => ({ key, kind: "stock", product_id: "", description: "", quantity: "1", rate: "", line_date: "", showDate: false, descEdited: false, rateEdited: false });
const nextLine = () => blankLine(`new-${++sequence}`);

const productLabel = (p) => [p.name || p.sku, p.colour, p.size].filter(Boolean).join(" ");

function Row({ label, value, strong, tone }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${strong ? "border-t border-line pt-2.5 text-base" : "text-sm"}`}>
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={`${strong ? "text-lg font-bold" : "font-medium"} ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

export default function BillForm({ action, bill, products, customerNames, invoiceLabel, defaultGst = 0, originalQty = {}, cancelHref, submitLabel }) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values ?? bill ?? {};
  const errors = state.fieldErrors ?? {};
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [lines, setLines] = useState(() =>
    bill?.items?.length
      ? bill.items.map((i, index) => ({
          key: `init-${index}`,
          kind: i.product_id ? "stock" : "custom",
          product_id: i.product_id ?? "",
          description: i.description,
          quantity: String(i.quantity),
          rate: String(i.rate),
          line_date: i.line_date ?? "",
          showDate: Boolean(i.line_date),
          descEdited: true,
          rateEdited: true,
        }))
      : [blankLine("init-0")],
  );
  const [discount, setDiscount] = useState(String(v.discount_rate ?? 0));
  const [gst, setGst] = useState(String(v.gst_rate ?? defaultGst));
  const [previousDue, setPreviousDue] = useState(String(v.previous_due ?? 0));
  const [paid, setPaid] = useState(String(v.amount_paid ?? 0));

  const [dismissedFor, setDismissedFor] = useState(null);
  const itemsError = dismissedFor === state ? null : errors.items;
  const editLines = (updater) => {
    setDismissedFor(state);
    setLines(updater);
  };
  const patch = (key, changes) => editLines((list) => list.map((l) => (l.key === key ? { ...l, ...changes } : l)));

  const pick = (key, product) =>
    editLines((list) =>
      list.map((l) =>
        l.key === key
          ? {
              ...l,
              product_id: product.id,
              description: l.descEdited ? l.description : productLabel(product),
              rate: l.rateEdited ? l.rate : String(product.selling_rate),
            }
          : l,
      ),
    );

  const setKind = (key, kind) =>
    patch(key, kind === "custom" ? { kind, product_id: "" } : { kind });

  const totals = computeTotals({ lines, discountRate: discount, gstRate: gst, previousDue, paid });

  // How many of each product are being billed vs what could still be sold (this bill's own stock is added back).
  const billedByProduct = new Map();
  for (const l of lines) {
    if (l.kind === "stock" && l.product_id) billedByProduct.set(l.product_id, (billedByProduct.get(l.product_id) ?? 0) + (Number(l.quantity) || 0));
  }
  const availableFor = (id) => (byId.get(id)?.current_stock ?? 0) + (originalQty[id] ?? 0);

  const payload = JSON.stringify(
    lines.map((l) => ({ kind: l.kind, product_id: l.kind === "stock" ? l.product_id : "", description: l.description, quantity: l.quantity, rate: l.rate, line_date: l.showDate ? l.line_date : "" })),
  );

  const summary = (
    <p className="flex items-baseline justify-between text-sm">
      <span className="text-muted">{totals.balance > 0 ? "Balance due" : "Total payable"}</span>
      <span className="text-lg font-bold">{formatCurrency(totals.balance > 0 ? totals.balance : totals.payable)}</span>
    </p>
  );

  return (
    <form action={formAction} className="max-w-3xl space-y-6" noValidate>
      {bill?.id && <input type="hidden" name="id" value={bill.id} />}
      <input type="hidden" name="items" value={payload} />

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <Icon name="alert" size={18} className="mt-0.5" />
          {state.error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <ComboField label="Customer name" name="customer_name" defaultValue={v.customer_name ?? ""} suggestions={customerNames} placeholder="Walk-in customer" maxLength={100} />
          <TextField label="Bill date" name="sale_date" type="date" required defaultValue={v.sale_date ?? todayISO()} error={errors.sale_date} />
        </div>
        <p className="mt-3 text-xs text-muted">{invoiceLabel}</p>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Items</h2>
        {itemsError && (
          <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {itemsError}
          </p>
        )}
        <div className="space-y-3">
          {lines.map((line, index) => {
            const product = byId.get(line.product_id);
            const short = product && (billedByProduct.get(line.product_id) ?? 0) > availableFor(line.product_id);
            return (
              <div key={line.key} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div role="radiogroup" aria-label={`Item ${index + 1} type`} className="grid grid-cols-2 gap-1 rounded-full bg-subtle p-1 text-sm font-medium">
                    {[["stock", "Stock item"], ["custom", "Custom"]].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={line.kind === value}
                        onClick={() => setKind(line.key, value)}
                        className={`min-h-10 rounded-full px-4 transition ${line.kind === value ? "bg-surface text-ink shadow-card" : "text-muted"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => editLines((list) => list.filter((l) => l.key !== line.key))}
                      aria-label={`Remove item ${index + 1}`}
                      className="-m-1 flex size-10 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-danger"
                    >
                      <Icon name="x" size={20} />
                    </button>
                  )}
                </div>

                {line.kind === "stock" && (
                  <div className="mb-3">
                    <ProductSelector id={`product-${line.key}`} products={products} value={line.product_id} onChange={(p) => pick(line.key, p)} />
                    {product && (
                      <p className={`mt-1.5 text-xs ${short ? "font-semibold text-danger" : "text-muted"}`}>
                        {short ? `Only ${availableFor(line.product_id)} available for ${product.sku}.` : `${availableFor(line.product_id)} available`}
                      </p>
                    )}
                  </div>
                )}

                <Field label={line.kind === "stock" ? "Description on bill" : "Description"} id={`desc-${line.key}`}>
                  <input
                    id={`desc-${line.key}`}
                    value={line.description}
                    onChange={(e) => patch(line.key, { description: e.target.value, descEdited: true })}
                    placeholder={line.kind === "custom" ? "e.g. Delivery charge" : "Shown on the printed bill"}
                    maxLength={200}
                    className={inputClass}
                  />
                </Field>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Field label="Qty" id={`qty-${line.key}`}>
                    <input id={`qty-${line.key}`} type="number" inputMode="numeric" min="1" step="1" value={line.quantity} onChange={(e) => patch(line.key, { quantity: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Rate (₹)" id={`rate-${line.key}`}>
                    <input id={`rate-${line.key}`} type="number" inputMode="decimal" min="0" step="0.01" value={line.rate} onChange={(e) => patch(line.key, { rate: e.target.value, rateEdited: true })} className={inputClass} />
                  </Field>
                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-ink">Total</span>
                    <p className="flex h-12 items-center text-base font-bold">{formatCurrency(lineTotal(line.quantity, line.rate))}</p>
                  </div>
                </div>

                {line.showDate ? (
                  <div className="mt-3 flex items-end gap-2">
                    <div className="flex-1">
                      <Field label="Item date" id={`date-${line.key}`}>
                        <input id={`date-${line.key}`} type="date" value={line.line_date} onChange={(e) => patch(line.key, { line_date: e.target.value })} className={inputClass} />
                      </Field>
                    </div>
                    <button type="button" onClick={() => patch(line.key, { showDate: false, line_date: "" })} className="min-h-12 px-3 text-sm font-medium text-muted hover:text-ink">
                      Remove date
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => patch(line.key, { showDate: true, line_date: todayISO() })} className="mt-3 text-sm font-medium text-gold-text hover:underline">
                    + Add an item date
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => editLines((list) => [...list, nextLine()])}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm font-semibold text-ink hover:bg-subtle"
        >
          <Icon name="plus" size={18} />
          Add another item
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-4 text-base font-semibold">Totals and payment</h2>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Discount %" name="discount_rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} error={errors.discount_rate} />
          <TextField label="GST %" name="gst_rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={gst} onChange={(e) => setGst(e.target.value)} error={errors.gst_rate} />
          <TextField label="Previous due (₹)" name="previous_due" type="number" inputMode="decimal" min="0" step="0.01" value={previousDue} onChange={(e) => setPreviousDue(e.target.value)} error={errors.previous_due} hint="Old balance the customer still owes." />
          <div>
            <TextField label="Amount paid (₹)" name="amount_paid" type="number" inputMode="decimal" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} error={errors.amount_paid} />
            <button type="button" onClick={() => setPaid(String(totals.payable))} className="mt-1.5 text-sm font-medium text-gold-text hover:underline">
              Mark fully paid
            </button>
          </div>
        </div>

        <dl className="mt-5 border-t border-line pt-3">
          <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
          {totals.discount > 0 && <Row label={`Discount (${Number(discount)}%)`} value={`- ${formatCurrency(totals.discount)}`} />}
          {totals.gst > 0 && <Row label={`GST (${Number(gst)}%)`} value={formatCurrency(totals.gst)} />}
          <Row label="Grand total" value={formatCurrency(totals.grand)} strong />
          {totals.previous > 0 && <Row label="Previous due" value={formatCurrency(totals.previous)} />}
          {totals.previous > 0 && <Row label="Total payable" value={formatCurrency(totals.payable)} />}
          <Row label="Paid" value={formatCurrency(totals.paid)} />
          <Row label="Balance due" value={formatCurrency(totals.balance)} strong tone={totals.balance > 0 ? "text-danger" : "text-success"} />
          {totals.change > 0 && <Row label="Change to return" value={formatCurrency(totals.change)} tone="text-warn" />}
        </dl>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <TextField label="Notes (printed on the bill)" name="notes" defaultValue={v.notes ?? ""} maxLength={500} placeholder="Optional" />
      </section>

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} summary={summary} />
    </form>
  );
}
