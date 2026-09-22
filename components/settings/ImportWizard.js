"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Button, { buttonClass } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { runLegacyImport } from "@/lib/actions/legacyImport";

const ROWS = [
  ["products", "Products", "created", "matched"],
  ["purchases", "Purchases", "imported", "skipped"],
  ["inventory_sales", "Inventory sales (no invoice)", "imported", "skipped"],
  ["returns", "Returns", "imported", "skipped"],
  ["bills", "Bills", "imported", "skipped"],
];

// Standard multi-submit-button form: each button posts its own name="intent" value, so one action
// (and one set of file inputs) serves both Preview and Confirm.
function SubmitButton({ intent, variant, idleLabel, busyLabel }) {
  const { pending, data } = useFormStatus();
  const isThisOne = pending && data?.get("intent") === intent;
  return (
    <button type="submit" name="intent" value={intent} disabled={pending} className={buttonClass({ variant, className: pending && !isThisOne ? "opacity-50" : "" })}>
      {isThisOne ? busyLabel : idleLabel}
    </button>
  );
}

function SummaryTable({ summary }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-subtle/60 text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 text-left font-semibold">Type</th>
            <th className="px-3 py-2 text-right font-semibold">Will import</th>
            <th className="px-3 py-2 text-right font-semibold">Already have / unusable</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {ROWS.map(([key, label, a, b]) => (
            <tr key={key}>
              <td className="px-3 py-2">{label}</td>
              <td className="px-3 py-2 text-right font-semibold">{summary[key]?.[a] ?? 0}</td>
              <td className="px-3 py-2 text-right text-muted">{summary[key]?.[b] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ImportWizard() {
  const [state, formAction] = useActionState(runLegacyImport, {});

  if (state.result) {
    return (
      <div className="max-w-2xl rounded-2xl border border-line bg-success-soft p-5">
        <p className="flex items-start gap-2 text-base font-semibold text-success">
          <Icon name="check" size={20} className="mt-0.5" />
          Import complete.
        </p>
        <div className="mt-4 bg-surface">
          <SummaryTable summary={state.result} />
        </div>
        {state.result.warnings?.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-warn">
            {state.result.warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button href="/products" variant="outline">
            View products
          </Button>
          <Button href="/sales" variant="outline">
            View bills
          </Button>
        </div>
      </div>
    );
  }

  const preview = state.preview;
  const preSkipped = state.preSkipped;
  const hasPreSkipped = preSkipped && Object.values(preSkipped).some((n) => n > 0);
  const canConfirm = preview && !state.blocked;

  return (
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-1 text-base font-semibold">1. Choose your backup files</h2>
        <p className="mb-4 text-sm text-muted">
          Choose either or both (each under 1.5 MB — see the instructions below for how to create them). Got a bigger file? Split it by date and import in a few
          rounds; already-imported records are skipped automatically.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="inventory_file" className="mb-1.5 block text-sm font-medium text-ink">
              Inventory backup (.json)
            </label>
            <input id="inventory_file" name="inventory_file" type="file" accept="application/json,.json" className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-subtle file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink" />
          </div>
          <div>
            <label htmlFor="bills_file" className="mb-1.5 block text-sm font-medium text-ink">
              Bills backup (.json)
            </label>
            <input id="bills_file" name="bills_file" type="file" accept="application/json,.json" className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-subtle file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink" />
          </div>
        </div>
      </section>

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <Icon name="alert" size={18} className="mt-0.5" />
          {state.error}
        </p>
      )}

      {preview && (
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <h2 className="mb-1 text-base font-semibold">2. Check what will be imported</h2>
          <p className="mb-4 text-sm text-muted">Nothing has been saved yet.</p>
          <SummaryTable summary={preview} />

          {hasPreSkipped && (
            <p className="mt-3 text-sm text-muted">
              Also skipped before reaching this check: {preSkipped.purchases ? `${preSkipped.purchases} purchase row(s), ` : ""}
              {preSkipped.sales ? `${preSkipped.sales} sale row(s), ` : ""}
              {preSkipped.returns ? `${preSkipped.returns} return row(s), ` : ""}
              {preSkipped.bills ? `${preSkipped.bills} bill(s) ` : ""}
              with missing dates, SKUs or quantities.
            </p>
          )}

          {preview.warnings?.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-warn">
              {preview.warnings.slice(0, 20).map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          )}

          {preview.blocking?.length > 0 && (
            <div role="alert" className="mt-4 space-y-1 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              <p className="font-semibold">This can&rsquo;t be imported yet:</p>
              {preview.blocking.map((b) => (
                <p key={b}>{b}</p>
              ))}
            </div>
          )}
        </section>
      )}

      {canConfirm && <input type="hidden" name="payload" value={state.payloadJson} />}

      <div className="flex flex-wrap gap-3">
        <SubmitButton intent="preview" variant="outline" idleLabel="Preview import" busyLabel="Reading files..." />
        {canConfirm && <SubmitButton intent="confirm" variant="gold" idleLabel="Confirm import" busyLabel="Importing..." />}
      </div>
    </form>
  );
}
