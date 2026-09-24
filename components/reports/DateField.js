"use client";

import { usePathname, useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/ui/Field";
import { todayISO } from "@/lib/format";

// A single date picker that pushes ?date= into the URL as soon as it changes, matching the pattern the
// other report filters use (no separate "Go" button needed, but works without JS too via the form).
export default function DateField({ date }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <form className="max-w-xs">
      <Field label="Date" id="date">
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={date}
          max={todayISO()}
          onChange={(e) => e.target.value && router.push(`${pathname}?date=${e.target.value}`)}
          className={inputClass}
        />
      </Field>
    </form>
  );
}
