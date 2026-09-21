"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/Button";

function ConfirmButton({ label, variant }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass({ variant, className: "flex-1" })}>
      {pending ? "Please wait..." : label}
    </button>
  );
}

// Button that opens a confirmation sheet, then runs a server action ((prevState, formData) => {error?}).
export default function ConfirmDialog({
  action,
  fields = {},
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "md",
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
}) {
  const ref = useRef(null);
  const [state, formAction] = useActionState(action, {});

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={buttonClass({ variant: triggerVariant, size: triggerSize })}>
        {triggerLabel}
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50 max-md:mb-4"
      >
        <form action={formAction} className="p-5">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          {state?.error && (
            <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={() => ref.current?.close()} className={buttonClass({ variant: "outline", className: "flex-1" })}>
              Cancel
            </button>
            <ConfirmButton label={confirmLabel} variant={confirmVariant} />
          </div>
        </form>
      </dialog>
    </>
  );
}
