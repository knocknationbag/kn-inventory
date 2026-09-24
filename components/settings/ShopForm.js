"use client";

import { useActionState, useEffect } from "react";
import { TextField } from "@/components/ui/Field";
import FormActions from "@/components/ui/FormActions";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { updateShopSettings } from "@/lib/actions/settings";

export default function ShopForm({ settings }) {
  const [state, formAction] = useActionState(updateShopSettings, {});
  const toast = useToast();
  const v = state.values ?? settings;
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) toast.success("Shop details saved.");
  }, [state.success, toast]);

  return (
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <Icon name="alert" size={18} className="mt-0.5" />
          {state.error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-4 text-base font-semibold">Shop details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField label="Shop name" name="shop_name" required defaultValue={v.shop_name ?? ""} error={errors.shop_name} maxLength={120} />
          </div>
          <TextField label="Phone numbers" name="phones" defaultValue={v.phones ?? ""} error={errors.phones} placeholder="9321777582 | 8080828615" maxLength={100} />
          <TextField label="Email" name="email" type="email" defaultValue={v.email ?? ""} error={errors.email} placeholder="shop@example.com" maxLength={100} hint="Printed on GST Tax Invoices." />
          <TextField label="GSTIN" name="gst_number" defaultValue={v.gst_number ?? ""} error={errors.gst_number} placeholder="27ABCDE1234F1Z5" maxLength={15} hint="Printed on Normal Bills and GST Tax Invoices." />
          <div className="sm:col-span-2">
            <TextField label="Address" name="address" defaultValue={v.address ?? ""} error={errors.address} maxLength={500} hint="Printed on every bill." />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-1 text-base font-semibold">GST invoice details</h2>
        <p className="mb-4 text-sm text-muted">Printed on GST Tax Invoices only. All optional.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="PAN" name="pan" defaultValue={v.pan ?? ""} error={errors.pan} placeholder="ABCDE1234F" maxLength={10} />
          <TextField label="Bank name" name="bank_name" defaultValue={v.bank_name ?? ""} error={errors.bank_name} maxLength={120} />
          <TextField label="Bank account number" name="bank_account" inputMode="numeric" defaultValue={v.bank_account ?? ""} error={errors.bank_account} maxLength={40} />
          <TextField label="IFSC code" name="bank_ifsc" defaultValue={v.bank_ifsc ?? ""} error={errors.bank_ifsc} placeholder="HDFC0001234" maxLength={11} />
          <div className="sm:col-span-2">
            <TextField label="Bank branch" name="bank_branch" defaultValue={v.bank_branch ?? ""} error={errors.bank_branch} maxLength={120} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-4 text-base font-semibold">Billing defaults</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Default GST %" name="default_gst_rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" defaultValue={v.default_gst_rate ?? 0} error={errors.default_gst_rate} hint="Pre-filled on a new bill." />
          <TextField label="Low stock alert level" name="low_stock_threshold" type="number" inputMode="numeric" min="0" step="1" defaultValue={v.low_stock_threshold ?? 5} error={errors.low_stock_threshold} hint="Products at or below this count show as low stock." />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-1 text-base font-semibold">Invoice numbering</h2>
        <p className="mb-4 text-sm text-muted">Change these only if you know why. Existing bills keep their numbers either way.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Invoice prefix" name="invoice_prefix" required defaultValue={v.invoice_prefix ?? "KN-"} error={errors.invoice_prefix} maxLength={10} />
          <TextField label="Next bill number" name="next_invoice_no" type="number" inputMode="numeric" min="1" step="1" defaultValue={v.next_invoice_no ?? 1} error={errors.next_invoice_no} />
        </div>
      </section>

      <FormActions cancelHref="/settings" submitLabel="Save changes" />
    </form>
  );
}
