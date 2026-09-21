"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { saveListItem } from "@/lib/actions/lists";

function Submit({ label }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export default function ListItemForm({ kind, item, cancelHref, withContact, submitLabel = "Save" }) {
  const [state, formAction] = useActionState(saveListItem, {});
  const v = state.values ?? item ?? {};
  const suffix = item?.id ?? "new";

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="kind" value={kind} />
      {item?.id && <input type="hidden" name="id" value={item.id} />}
      <TextField label="Name" name="name" id={`name-${suffix}`} required defaultValue={v.name ?? ""} maxLength={80} />
      {withContact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Phone" name="phone" id={`phone-${suffix}`} type="tel" inputMode="tel" defaultValue={v.phone ?? ""} maxLength={30} />
          <TextField label="Notes" name="notes" id={`notes-${suffix}`} defaultValue={v.notes ?? ""} maxLength={300} />
        </div>
      )}
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Submit label={submitLabel} />
        {cancelHref && (
          <Button href={cancelHref} variant="outline">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
