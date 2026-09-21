"use client";

import { useActionState } from "react";
import { ComboField, TextField } from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import Icon from "@/components/ui/Icon";

export default function ProductForm({ action, product, categories, suppliers, submitLabel, cancelHref }) {
  const [state, formAction] = useActionState(action, {});
  const v = state.values ?? product ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-3xl space-y-6" noValidate>
      {product?.id && <input type="hidden" name="id" value={product.id} />}

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <Icon name="alert" size={18} className="mt-0.5" />
          {state.error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-4 text-base font-semibold">Product details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Model / SKU" name="sku" required defaultValue={v.sku ?? ""} error={errors.sku} placeholder="e.g. KN-101" autoCapitalize="characters" maxLength={60} />
          <TextField label="Bag name" name="name" defaultValue={v.name ?? ""} error={errors.name} placeholder="e.g. College Backpack" maxLength={120} />
          <TextField label="Colour" name="colour" defaultValue={v.colour ?? ""} error={errors.colour} placeholder="Black / Navy" maxLength={40} />
          <TextField label="Size" name="size" defaultValue={v.size ?? ""} error={errors.size} placeholder="18 inch" maxLength={40} />
          <ComboField
            label="Category"
            name="category"
            defaultValue={v.category ?? v.category_name ?? ""}
            suggestions={categories.map((c) => c.name)}
            placeholder="Choose or type a new one"
            hint="Optional. Type a new name to create it."
          />
          <ComboField
            label="Supplier"
            name="supplier"
            defaultValue={v.supplier ?? v.supplier_name ?? ""}
            suggestions={suppliers.map((s) => s.name)}
            placeholder="Choose or type a new one"
            hint="Optional. Type a new name to create it."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-4 text-base font-semibold">Stock and pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Opening stock"
            name="opening_stock"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            defaultValue={v.opening_stock ?? 0}
            error={errors.opening_stock}
            hint={product ? `Stock you had before any purchases or sales. Current stock is ${product.current_stock}.` : "Bags you already have in hand right now."}
          />
          <TextField label="GST %" name="gst_rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" defaultValue={v.gst_rate ?? 0} error={errors.gst_rate} />
          <TextField label="Purchase rate (₹)" name="purchase_rate" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={v.purchase_rate ?? 0} error={errors.purchase_rate} hint="What you pay per bag. Used for stock value." />
          <TextField label="Selling rate (₹)" name="selling_rate" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={v.selling_rate ?? 0} error={errors.selling_rate} hint="Default price when billing." />
        </div>
      </section>

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
    </form>
  );
}
