"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import { Field, TextField, inputClass } from "@/components/ui/Field";
import Icon from "@/components/ui/Icon";
import ProductSelector from "@/components/ui/ProductSelector";
import { INDIAN_STATES, GSTIN_RE, computeGstTotals, stateByCode, stateByName } from "@/lib/gst";
import { formatCurrency, todayISO } from "@/lib/format";
import { lineTotal } from "@/lib/billing";
import { amountInWords } from "@/lib/numberToWords";

let sequence = 0;
const blankLine = (key) => ({ key, kind: "stock", product_id: "", product_name: "", item_no: "", hsn_code: "", uom: "Pcs", quantity: "1", rate: "", nameEdited: false, rateEdited: false, hsnEdited: false });
const nextLine = () => blankLine(`new-${++sequence}`);
const productLabel = (p) => [p.name || p.sku, p.colour, p.size].filter(Boolean).join(" ");
const autoTaxType = (supplyState, customerState) => (stateByName(supplyState)?.code === stateByName(customerState)?.code ? "intra" : "inter");

function Row({ label, value, strong, tone }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${strong ? "border-t border-line pt-2.5 text-base" : "text-sm"}`}>
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={`${strong ? "text-lg font-bold" : "font-medium"} ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

function StateSelect({ label, name, value, onChange, error }) {
  return (
    <Field label={label} id={name} error={error}>
      <select id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? "true" : undefined} className={inputClass}>
        {INDIAN_STATES.map((s) => (
          <option key={s.code} value={s.name}>
            {s.name} ({s.code})
          </option>
        ))}
      </select>
    </Field>
  );
}

function Actions({ cancelHref, summary, finalOnly }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-line bg-canvas px-4 pb-9 pt-3 sm:mx-0 md:static md:border-0 md:bg-transparent md:p-0">
      {summary && <div className="mb-2 md:hidden">{summary}</div>}
      <div className="flex flex-wrap gap-3">
        <Button href={cancelHref} variant="outline" size="lg" className="md:flex-none">
          Cancel
        </Button>
        {!finalOnly && (
          <Button type="submit" name="intent" value="draft" variant="outline" size="lg" className="flex-1 md:flex-none" disabled={pending}>
            Save draft
          </Button>
        )}
        <Button type="submit" name="intent" value="final" variant="primary" size="lg" className="flex-1 md:min-w-44 md:flex-none" disabled={pending}>
          {pending ? "Saving..." : finalOnly ? "Save changes" : "Finalize invoice"}
        </Button>
      </div>
      <p className="mt-2 hidden text-xs text-muted md:block">
        {finalOnly ? "Stock is recalculated automatically when you save." : "A draft can be edited freely and never changes stock. Finalizing deducts stock for the inventory items."}
      </p>
    </div>
  );
}

export default function GstInvoiceForm({ action, invoice, products, customers, suggestedNo, originalQty = {}, cancelHref = "/sales?type=gst" }) {
  const [state, formAction] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const customerByName = useMemo(() => new Map(customers.map((c) => [c.name.trim().toLowerCase(), c])), [customers]);

  const [f, setF] = useState(() => ({
    invoice_no: invoice?.invoice_no ?? suggestedNo ?? "",
    invoice_date: invoice?.invoice_date ?? todayISO(),
    reverse_charge: invoice?.reverse_charge ? "Yes" : "No",
    supply_state: invoice?.supply_state ?? "Maharashtra",
    transport_mode: invoice?.transport_mode ?? "",
    vehicle_number: invoice?.vehicle_number ?? "",
    date_of_supply: invoice?.date_of_supply ?? "",
    place_of_supply: invoice?.place_of_supply ?? "",
    place_of_supply_state_code: invoice?.place_of_supply_state_code ?? "27",
    customer_name: invoice?.customer_name ?? "",
    customer_gstin: invoice?.customer_gstin ?? "",
    customer_mobile: invoice?.customer_mobile ?? "",
    customer_address: invoice?.customer_address ?? "",
    customer_state: invoice?.customer_state ?? "Maharashtra",
    tax_type: invoice?.tax_type ?? "intra",
    cgst_rate: String(invoice?.cgst_rate ?? 9),
    sgst_rate: String(invoice?.sgst_rate ?? 9),
    igst_rate: String(invoice?.igst_rate ?? 18),
    amount_paid: String(invoice?.amount_paid ?? 0),
    notes: invoice?.notes ?? "",
  }));
  const [placeTouched, setPlaceTouched] = useState(Boolean(invoice?.place_of_supply_state_code));
  const set = (changes) => setF((cur) => ({ ...cur, ...changes }));
  const input = (name) => ({ name, value: f[name], onChange: (e) => set({ [name]: e.target.value }) });

  const changeStates = ({ supply = f.supply_state, buyer = f.customer_state }) => {
    const changes = { supply_state: supply, customer_state: buyer, tax_type: autoTaxType(supply, buyer) };
    if (!placeTouched) changes.place_of_supply_state_code = stateByName(buyer)?.code ?? f.place_of_supply_state_code;
    set(changes);
  };

  const changeCustomerName = (value) => {
    const match = customerByName.get(value.trim().toLowerCase());
    if (!match) return set({ customer_name: value });
    const buyer = stateByName(match.state)?.name ?? f.customer_state;
    const changes = {
      customer_name: value,
      customer_gstin: match.gstin ?? "",
      customer_mobile: match.phone ?? "",
      customer_address: match.address ?? "",
      customer_state: buyer,
      tax_type: autoTaxType(f.supply_state, buyer),
    };
    if (!placeTouched) changes.place_of_supply_state_code = stateByName(buyer)?.code ?? f.place_of_supply_state_code;
    set(changes);
  };

  const changeGstin = (raw) => {
    const value = raw.toUpperCase();
    const fromGstin = GSTIN_RE.test(value) ? stateByCode(value.slice(0, 2)) : null;
    if (fromGstin && fromGstin.name !== f.customer_state) {
      changeStates({ buyer: fromGstin.name });
      setF((cur) => ({ ...cur, customer_gstin: value }));
    } else {
      set({ customer_gstin: value });
    }
  };

  const [lines, setLines] = useState(() =>
    invoice?.items?.length
      ? invoice.items.map((i, index) => ({
          key: `init-${index}`,
          kind: i.product_id ? "stock" : "custom",
          product_id: i.product_id ?? "",
          product_name: i.product_name,
          item_no: i.item_no ?? "",
          hsn_code: i.hsn_code ?? "",
          uom: i.uom ?? "Pcs",
          quantity: String(i.quantity),
          rate: String(i.rate),
          nameEdited: true,
          rateEdited: true,
          hsnEdited: true,
        }))
      : [blankLine("init-0")],
  );
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
              product_name: l.nameEdited ? l.product_name : productLabel(product),
              rate: l.rateEdited ? l.rate : String(product.selling_rate),
              hsn_code: l.hsnEdited ? l.hsn_code : (product.hsn_code ?? ""),
            }
          : l,
      ),
    );

  const totals = computeGstTotals({ lines, taxType: f.tax_type, cgstRate: f.cgst_rate, sgstRate: f.sgst_rate, igstRate: f.igst_rate, paid: f.amount_paid });
  const inter = f.tax_type === "inter";

  const billedByProduct = new Map();
  for (const l of lines) {
    if (l.kind === "stock" && l.product_id) billedByProduct.set(l.product_id, (billedByProduct.get(l.product_id) ?? 0) + (Number(l.quantity) || 0));
  }
  const availableFor = (id) => (byId.get(id)?.current_stock ?? 0) + (originalQty[id] ?? 0);

  const payload = JSON.stringify(
    lines.map((l) => ({ kind: l.kind, product_id: l.kind === "stock" ? l.product_id : "", product_name: l.product_name, item_no: l.item_no, hsn_code: l.hsn_code, uom: l.uom, quantity: l.quantity, rate: l.rate })),
  );

  const summary = (
    <p className="flex items-baseline justify-between text-sm">
      <span className="text-muted">Invoice total</span>
      <span className="text-lg font-bold">{formatCurrency(totals.grand)}</span>
    </p>
  );

  return (
    <form action={formAction} className="max-w-3xl space-y-6" noValidate>
      {invoice?.id && <input type="hidden" name="id" value={invoice.id} />}
      <input type="hidden" name="items" value={payload} />
      <input type="hidden" name="tax_type" value={f.tax_type} />

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <Icon name="alert" size={18} className="mt-0.5" />
          {state.error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-4 text-base font-semibold">Invoice details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Invoice number" required {...input("invoice_no")} error={errors.invoice_no} maxLength={30} hint="Suggested from your last invoice. You can change it." />
          <TextField label="Invoice date" type="date" {...input("invoice_date")} error={errors.invoice_date} />
          <Field label="Reverse charge" id="reverse_charge">
            <select id="reverse_charge" {...input("reverse_charge")} className={inputClass}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </Field>
          <StateSelect label="Supplier state" name="supply_state" value={f.supply_state} onChange={(v) => changeStates({ supply: v })} error={errors.supply_state} />
          <TextField label="Transportation mode" {...input("transport_mode")} maxLength={40} placeholder="e.g. By Road" />
          <TextField label="Vehicle number" {...input("vehicle_number")} maxLength={20} placeholder="MH01AB1234" />
          <TextField label="Date of supply" type="date" {...input("date_of_supply")} error={errors.date_of_supply} />
          <TextField label="Place of supply" {...input("place_of_supply")} maxLength={100} placeholder="e.g. Mumbai" />
          <Field label="Place of supply state" id="place_of_supply_state_code">
            <select
              id="place_of_supply_state_code"
              name="place_of_supply_state_code"
              value={f.place_of_supply_state_code}
              onChange={(e) => {
                setPlaceTouched(true);
                set({ place_of_supply_state_code: e.target.value });
              }}
              className={inputClass}
            >
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-1 text-base font-semibold">Buyer (bill to)</h2>
        <p className="mb-4 text-sm text-muted">Pick an existing customer by name to fill the rest, or type a new one.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Buyer name" id="customer_name" error={errors.customer_name}>
              <input
                id="customer_name"
                name="customer_name"
                list="gst-customer-list"
                autoComplete="off"
                value={f.customer_name}
                onChange={(e) => changeCustomerName(e.target.value)}
                aria-invalid={errors.customer_name ? "true" : undefined}
                maxLength={120}
                className={inputClass}
              />
              <datalist id="gst-customer-list">
                {customers.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </Field>
          </div>
          <TextField label="Buyer GSTIN" name="customer_gstin" value={f.customer_gstin} onChange={(e) => changeGstin(e.target.value)} error={errors.customer_gstin} maxLength={15} placeholder="27ABCDE1234F1Z5" hint="Leave empty for an unregistered buyer." />
          <TextField label="Mobile number" {...input("customer_mobile")} inputMode="tel" maxLength={20} />
          <div className="sm:col-span-2">
            <Field label="Address" id="customer_address">
              <textarea id="customer_address" {...input("customer_address")} rows={2} maxLength={500} className={`${inputClass} h-auto py-3`} />
            </Field>
          </div>
          <StateSelect label="Buyer state" name="customer_state" value={f.customer_state} onChange={(v) => changeStates({ buyer: v })} error={errors.customer_state} />
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">Tax type</legend>
          <div role="radiogroup" aria-label="Tax type" className="grid gap-2 sm:grid-cols-2">
            {[
              ["intra", "Intra-state", "CGST + SGST"],
              ["inter", "Inter-state", "IGST"],
            ].map(([value, title, sub]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={f.tax_type === value}
                onClick={() => set({ tax_type: value })}
                className={`min-h-12 rounded-xl border px-4 py-2 text-left transition ${f.tax_type === value ? "border-primary bg-primary text-on-primary" : "border-line-strong bg-surface text-ink hover:bg-subtle"}`}
              >
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs opacity-80">{sub}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Chosen automatically from the two states. You can override it.</p>
        </fieldset>
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
                        onClick={() => patch(line.key, value === "custom" ? { kind: value, product_id: "" } : { kind: value })}
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

                <Field label="Name of product" id={`name-${line.key}`}>
                  <input
                    id={`name-${line.key}`}
                    value={line.product_name}
                    onChange={(e) => patch(line.key, { product_name: e.target.value, nameEdited: true })}
                    placeholder={line.kind === "custom" ? "e.g. Stitching charge" : "Shown on the invoice"}
                    maxLength={200}
                    className={inputClass}
                  />
                </Field>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Item no." id={`itemno-${line.key}`}>
                    <input id={`itemno-${line.key}`} value={line.item_no} onChange={(e) => patch(line.key, { item_no: e.target.value })} maxLength={40} className={inputClass} />
                  </Field>
                  <Field label="HSN / ACS" id={`hsn-${line.key}`}>
                    <input id={`hsn-${line.key}`} inputMode="numeric" value={line.hsn_code} onChange={(e) => patch(line.key, { hsn_code: e.target.value, hsnEdited: true })} maxLength={8} placeholder="4202" className={inputClass} />
                  </Field>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Field label="UOM" id={`uom-${line.key}`}>
                    <input id={`uom-${line.key}`} value={line.uom} onChange={(e) => patch(line.key, { uom: e.target.value })} maxLength={10} className={inputClass} />
                  </Field>
                  <Field label="Qty" id={`qty-${line.key}`}>
                    <input id={`qty-${line.key}`} type="number" inputMode="numeric" min="1" step="1" value={line.quantity} onChange={(e) => patch(line.key, { quantity: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Rate (₹)" id={`rate-${line.key}`}>
                    <input id={`rate-${line.key}`} type="number" inputMode="decimal" min="0" step="0.01" value={line.rate} onChange={(e) => patch(line.key, { rate: e.target.value, rateEdited: true })} className={inputClass} />
                  </Field>
                </div>
                <p className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted">Amount</span>
                  <span className="text-base font-bold">{formatCurrency(lineTotal(line.quantity, line.rate))}</span>
                </p>
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
        <h2 className="mb-4 text-base font-semibold">Tax and payment</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className={inter ? "hidden" : ""}>
            <TextField label="CGST %" type="number" inputMode="decimal" min="0" max="100" step="0.01" {...input("cgst_rate")} error={errors.cgst_rate} />
          </div>
          <div className={inter ? "hidden" : ""}>
            <TextField label="SGST %" type="number" inputMode="decimal" min="0" max="100" step="0.01" {...input("sgst_rate")} error={errors.sgst_rate} />
          </div>
          <div className={inter ? "" : "hidden"}>
            <TextField label="IGST %" type="number" inputMode="decimal" min="0" max="100" step="0.01" {...input("igst_rate")} error={errors.igst_rate} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <TextField label="Amount paid (₹)" type="number" inputMode="decimal" min="0" step="0.01" {...input("amount_paid")} error={errors.amount_paid} />
            <button type="button" onClick={() => set({ amount_paid: String(totals.grand) })} className="mt-1.5 text-sm font-medium text-gold-text hover:underline">
              Mark fully paid
            </button>
          </div>
        </div>

        <dl className="mt-5 border-t border-line pt-3">
          <Row label="Taxable value" value={formatCurrency(totals.taxable)} />
          {inter ? (
            <Row label={`IGST (${Number(f.igst_rate) || 0}%)`} value={formatCurrency(totals.igst)} />
          ) : (
            <>
              <Row label={`CGST (${Number(f.cgst_rate) || 0}%)`} value={formatCurrency(totals.cgst)} />
              <Row label={`SGST (${Number(f.sgst_rate) || 0}%)`} value={formatCurrency(totals.sgst)} />
            </>
          )}
          <Row label="Invoice total" value={formatCurrency(totals.grand)} strong />
          <Row label="Paid" value={formatCurrency(totals.paid)} />
          <Row label="Balance due" value={formatCurrency(totals.balance)} strong tone={totals.balance > 0 ? "text-danger" : "text-success"} />
        </dl>
        <p className="mt-3 rounded-xl bg-subtle px-3 py-2 text-sm">
          <span className="font-medium">In words: </span>
          {amountInWords(totals.grand)}
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <TextField label="Notes" {...input("notes")} maxLength={500} placeholder="Optional" />
      </section>

      <Actions cancelHref={cancelHref} summary={summary} finalOnly={invoice?.status === "final"} />
    </form>
  );
}
