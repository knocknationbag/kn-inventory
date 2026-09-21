"use client";

import { useActionState, useState } from "react";
import { Field, SelectField, TextField } from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import Icon from "@/components/ui/Icon";
import ProductSelector from "@/components/ui/ProductSelector";
import Toggle from "@/components/ui/Toggle";
import { RETURN_REASONS, defaultRestock } from "@/lib/constants";
import { todayISO } from "@/lib/format";

export default function ReturnForm({ action, ret, products, cancelHref, submitLabel }) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values ?? ret ?? {};
  const errors = state.fieldErrors ?? {};

  const [productId, setProductId] = useState(v.product_id ?? "");
  const [quantity, setQuantity] = useState(String(v.quantity ?? ""));
  const [reason, setReason] = useState(v.reason ?? "customer_return");
  const [restock, setRestock] = useState(v.restock ?? defaultRestock(v.reason ?? "customer_return"));

  const product = products.find((p) => p.id === productId);
  const qty = Number(quantity) || 0;

  const changeReason = (value) => {
    setReason(value);
    setRestock(defaultRestock(value));
  };

  return (
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      {ret?.id && <input type="hidden" name="id" value={ret.id} />}
      <input type="hidden" name="product_id" value={productId} />

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <Icon name="alert" size={18} className="mt-0.5" />
          {state.error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Date" name="return_date" type="date" required defaultValue={v.return_date ?? todayISO()} error={errors.return_date} />
          <SelectField label="Reason" name="reason" required value={reason} onChange={(e) => changeReason(e.target.value)} options={RETURN_REASONS} error={errors.reason} />
          <div className="sm:col-span-2">
            <Field label="Product" id="product-picker" required error={errors.product_id}>
              <ProductSelector id="product-picker" products={products} value={productId} onChange={(p) => setProductId(p.id)} invalid={Boolean(errors.product_id)} />
            </Field>
            {product && <p className="mt-1.5 text-xs text-muted">Current stock: {product.current_stock}</p>}
          </div>
          <TextField
            label="Quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={errors.quantity}
          />
          <TextField label="Notes" name="notes" defaultValue={v.notes ?? ""} maxLength={500} placeholder="Optional" />
        </div>
      </section>

      <div className="space-y-3">
        <Toggle
          name="restock"
          label="Add back to stock (restock)"
          description={reason === "defective" ? "Off by default for defective / damaged bags. Turn on if they are fine to sell again." : "On by default: these bags are sellable again."}
          checked={restock}
          onChange={setRestock}
        />
        <p
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${restock ? "bg-success-soft text-success" : "bg-warn-soft text-warn"}`}
          role="status"
        >
          <Icon name={restock ? "check" : "info"} size={18} className="mt-0.5" />
          {restock
            ? `Stock impact: adds ${qty || "the returned"} ${qty === 1 ? "bag" : "bags"} back${product ? ` to ${product.sku}` : ""}.`
            : "Stock impact: none. This return is recorded but the stock count does not change."}
        </p>
      </div>

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
    </form>
  );
}
