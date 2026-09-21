"use client";

import { useActionState, useMemo, useState } from "react";
import { ComboField, Field, TextField, inputClass } from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import Icon from "@/components/ui/Icon";
import ProductSelector from "@/components/ui/ProductSelector";
import Toggle from "@/components/ui/Toggle";
import { formatCurrency, todayISO } from "@/lib/format";

// Initial lines get fixed keys so server and browser render identical ids; lines added later are browser-only.
let sequence = 0;
const newLine = (line = {}) => ({ key: `new-${++sequence}`, product_id: "", quantity: "", rate: "", ...line });

const money = (q, r) => (Number(q) || 0) * (Number(r) || 0);

export default function PurchaseForm({ action, purchase, products, suppliers, cancelHref, submitLabel }) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values ?? purchase ?? {};
  const errors = state.fieldErrors ?? {};
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [lines, setLines] = useState(() =>
    purchase?.items?.length
      ? purchase.items.map((i, index) => ({ key: `init-${index}`, product_id: i.product_id, quantity: String(i.quantity), rate: String(i.rate) }))
      : [{ key: "init-0", product_id: "", quantity: "", rate: "" }],
  );
  const [transport, setTransport] = useState(String(v.transport_charges ?? 0));
  const [updateRates, setUpdateRates] = useState(false);

  // A server error about the lines goes away as soon as the owner changes them.
  const [dismissedFor, setDismissedFor] = useState(null);
  const itemsError = dismissedFor === state ? null : errors.items;
  const editLines = (updater) => {
    setDismissedFor(state);
    setLines(updater);
  };

  const patch = (key, changes) => editLines((list) => list.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  const pick = (key, product) =>
    editLines((list) =>
      list.map((l) => (l.key === key ? { ...l, product_id: product.id, rate: !l.rate || Number(l.rate) === 0 ? String(product.purchase_rate) : l.rate } : l)),
    );

  const itemsTotal = lines.reduce((a, l) => a + money(l.quantity, l.rate), 0);
  const units = lines.reduce((a, l) => a + (Number(l.quantity) || 0), 0);
  const total = itemsTotal + (Number(transport) || 0);
  const payload = JSON.stringify(lines.map(({ product_id, quantity, rate }) => ({ product_id, quantity, rate })));

  return (
    <form action={formAction} className="max-w-3xl space-y-6" noValidate>
      {purchase?.id && <input type="hidden" name="id" value={purchase.id} />}
      <input type="hidden" name="items" value={payload} />

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <Icon name="alert" size={18} className="mt-0.5" />
          {state.error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Date" name="purchase_date" type="date" required defaultValue={v.purchase_date ?? todayISO()} error={errors.purchase_date} />
          <ComboField
            label="Supplier"
            name="supplier_name"
            defaultValue={v.supplier_name ?? ""}
            suggestions={suppliers.map((s) => s.name)}
            placeholder="Choose or type a new one"
            maxLength={80}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Products bought</h2>
        {itemsError && (
          <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {itemsError}
          </p>
        )}
        <div className="space-y-3">
          {lines.map((line, index) => {
            const product = byId.get(line.product_id);
            return (
              <div key={line.key} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted">Product {index + 1}</span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => editLines((list) => list.filter((l) => l.key !== line.key))}
                      aria-label={`Remove product ${index + 1}`}
                      className="-m-2 flex size-10 items-center justify-center rounded-full text-muted hover:bg-subtle hover:text-danger"
                    >
                      <Icon name="x" size={20} />
                    </button>
                  )}
                </div>
                <ProductSelector id={`product-${line.key}`} products={products} value={line.product_id} onChange={(p) => pick(line.key, p)} />
                {product && <p className="mt-1.5 text-xs text-muted">Current stock: {product.current_stock}</p>}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Field label="Qty" id={`qty-${line.key}`}>
                    <input
                      id={`qty-${line.key}`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(e) => patch(line.key, { quantity: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Rate (₹)" id={`rate-${line.key}`}>
                    <input
                      id={`rate-${line.key}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={line.rate}
                      onChange={(e) => patch(line.key, { rate: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-ink">Total</span>
                    <p className="flex h-12 items-center text-base font-bold">{formatCurrency(money(line.quantity, line.rate))}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => editLines((list) => [...list, newLine()])}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm font-semibold text-ink hover:bg-subtle"
        >
          <Icon name="plus" size={18} />
          Add another product
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Transport charges (₹)"
            name="transport_charges"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
            error={errors.transport_charges}
          />
          <TextField label="Notes" name="notes" defaultValue={v.notes ?? ""} maxLength={500} placeholder="Optional" />
        </div>
        <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Products ({units} pcs)</dt>
            <dd className="font-medium">{formatCurrency(itemsTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Transport</dt>
            <dd className="font-medium">{formatCurrency(Number(transport) || 0)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="text-lg font-bold">{formatCurrency(total)}</dd>
          </div>
        </dl>
      </section>

      <Toggle
        name="update_rates"
        label="Update product purchase rates"
        description="Use this purchase's rates as each product's purchase rate, so stock value follows your latest price."
        checked={updateRates}
        onChange={setUpdateRates}
      />

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
    </form>
  );
}
