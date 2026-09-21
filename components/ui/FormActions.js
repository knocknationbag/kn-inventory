"use client";

import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";

// Cancel + Save row. Sticks above the phone navigation so Save is always reachable.
// `summary` (phones only) keeps a running total visible while the form scrolls.
export default function FormActions({ cancelHref, submitLabel, summary }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-line bg-canvas px-4 pb-9 pt-3 sm:mx-0 md:static md:border-0 md:bg-transparent md:p-0">
      {summary && <div className="mb-2 md:hidden">{summary}</div>}
      <div className="flex gap-3">
        <Button href={cancelHref} variant="outline" size="lg" className="flex-1 md:flex-none">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" className="flex-1 md:min-w-40 md:flex-none" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
